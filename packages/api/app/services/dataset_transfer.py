"""Generic dataset transfer helpers for workbook and CSV templates."""

from __future__ import annotations

import csv
from dataclasses import dataclass, field as dataclass_field
from datetime import date, datetime
from io import BytesIO, StringIO
from typing import Any
from uuid import UUID
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import HTTPException, status
from models import Biomodel, FACS, Implant, Mouse, Passage
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, SQLModel, select

from app.services.crud import create_item, update_item
from app.services.entity_catalog import ENTITY_ROUTERS


@dataclass(frozen=True)
class DatasetColumnSpec:
    name: str
    required: bool
    is_primary_key: bool
    foreign_keys: tuple[str, ...]
    data_type: str
    format_hint: str | None = None


@dataclass(frozen=True)
class DatasetTableSpec:
    model: type[SQLModel]
    route_prefix: str
    tag: str
    table_name: str
    columns: tuple[DatasetColumnSpec, ...]


class EntityImportCounts(BaseModel):
    created: int = 0
    updated: int = 0


class DatasetImportError(BaseModel):
    table: str
    row_number: int
    primary_key: str | None = None
    message: str


class DatasetImportSummary(BaseModel):
    filename: str | None = None
    format: str
    tables_processed: int = 0
    rows_imported: int = 0
    rows_skipped: int = 0
    rows_failed: int = 0
    table_counts: dict[str, EntityImportCounts] = Field(default_factory=dict)
    errors: list[DatasetImportError] = Field(default_factory=list)


@dataclass(frozen=True)
class DeferredBiomodelParentUpdate:
    row_number: int
    primary_key: str
    parent_passage_id: str


@dataclass
class DatasetImportContext:
    source_passage_ids: set[str] = dataclass_field(default_factory=set)
    deferred_biomodel_parent_updates: list[DeferredBiomodelParentUpdate] = dataclass_field(
        default_factory=list
    )


DATASET_SHEET_NAME_ALIASES = {
    "pdx_trial": "pdx_passage",
    "pdo_trial": "pdo_passage",
    "lc_trial": "lc_passage",
}

DATASET_COLUMN_NAME_ALIASES = {
    "mouse": {"pdx_trial_id": "passage_id"},
    "facs": {"lc_trial_id": "passage_id"},
}


MOUSE_RELATED_COLUMNS: tuple[DatasetColumnSpec, ...] = (
    DatasetColumnSpec(
        "implant_1_id", False, False, (), "uuid", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ),
    DatasetColumnSpec("implant_1_location", False, False, (), "string"),
    DatasetColumnSpec("implant_1_type", False, False, (), "string"),
    DatasetColumnSpec("implant_1_date", False, False, (), "date", "YYYY-MM-DD"),
    DatasetColumnSpec(
        "implant_2_id", False, False, (), "uuid", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ),
    DatasetColumnSpec("implant_2_location", False, False, (), "string"),
    DatasetColumnSpec("implant_2_type", False, False, (), "string"),
    DatasetColumnSpec("implant_2_date", False, False, (), "date", "YYYY-MM-DD"),
)


def get_dataset_table_specs() -> tuple[DatasetTableSpec, ...]:
    """Return ordered dataset table specs for all supported domain entities."""
    excluded_tables = {"implant"}
    return tuple(
        DatasetTableSpec(
            model=model,
            route_prefix=route_prefix,
            tag=tag,
            table_name=model.__table__.name,
            columns=_get_model_columns(model),
        )
        for model, route_prefix, tag in ENTITY_ROUTERS
        if model.__table__.name not in excluded_tables
    )


def build_dataset_template_workbook() -> bytes:
    """Create an empty workbook template with one sheet per domain table."""
    workbook = _build_base_workbook()
    buffer = BytesIO()
    workbook.save(buffer)
    workbook.close()
    return buffer.getvalue()


def build_dataset_export_workbook(session: Session) -> bytes:
    """Create a workbook export populated with current database contents."""
    workbook = _build_base_workbook()

    for table_spec in get_dataset_table_specs():
        worksheet = workbook[_sheet_name(table_spec)]
        for item in session.exec(select(table_spec.model)).all():
            worksheet.append(_export_workbook_row_values(session, table_spec, item))

    buffer = BytesIO()
    workbook.save(buffer)
    workbook.close()
    return buffer.getvalue()


def _export_workbook_row_values(
    session: Session, table_spec: DatasetTableSpec, item: SQLModel
) -> list[Any]:
    values = [_serialize_value(getattr(item, column.name, None)) for column in table_spec.columns]
    if table_spec.table_name == "mouse":
        implants = session.exec(
            select(Implant).where(Implant.mouse_id == getattr(item, "id")).order_by(Implant.id)
        ).all()
        for implant in implants[:2]:
            values.extend(
                [
                    _serialize_value(implant.id),
                    implant.implant_location,
                    implant.type,
                    _serialize_value(implant.implant_date),
                ]
            )
        missing_implant_slots = 2 - min(len(implants), 2)
        values.extend([None, None, None, None] * missing_implant_slots)
    return values


def import_dataset_workbook(
    session: Session,
    workbook_bytes: bytes,
    *,
    filename: str | None = None,
) -> DatasetImportSummary:
    """Import domain data from a workbook containing one sheet per supported table."""
    if not workbook_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty."
        )

    try:
        workbook = load_workbook(BytesIO(workbook_bytes), read_only=True, data_only=True)
    except Exception as exc:  # pragma: no cover - openpyxl error types vary by damage
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Excel workbook. Please upload a valid .xlsx file.",
        ) from exc

    summary = _create_import_summary(filename=filename, format_name="xlsx")
    found_supported_sheet = False
    context = DatasetImportContext()

    try:
        worksheets = {worksheet.title: worksheet for worksheet in workbook.worksheets}
        context.source_passage_ids = _collect_workbook_source_passage_ids(worksheets)
        for table_spec in get_dataset_table_specs():
            worksheet = worksheets.get(_sheet_name(table_spec))
            if worksheet is None:
                continue

            found_supported_sheet = True
            summary.tables_processed += 1
            header_row = next(
                worksheet.iter_rows(
                    min_row=1, max_row=1, max_col=worksheet.max_column, values_only=True
                ),
                None,
            )
            if header_row is None:
                continue

            expected_columns = _workbook_columns(table_spec)
            expected_headers = tuple(column.name for column in expected_columns)
            actual_headers = _normalize_headers(header_row)
            if not _dataset_headers_match(table_spec, actual_headers):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Worksheet {_sheet_name(table_spec)!r} does not match the expected template headers.",
                )

            note_row = next(
                worksheet.iter_rows(
                    min_row=2, max_row=2, max_col=len(expected_headers), values_only=True
                ),
                None,
            )
            has_note_row = note_row is not None and _is_template_note_row(table_spec, note_row)
            data_start_row = 3 if has_note_row else 2

            for row_number, values in enumerate(
                worksheet.iter_rows(
                    min_row=data_start_row,
                    max_col=len(expected_headers),
                    values_only=True,
                ),
                start=data_start_row,
            ):
                _import_tabular_row(summary, session, table_spec, row_number, values, context)

    finally:
        workbook.close()

    if not found_supported_sheet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workbook does not contain any supported dataset sheets.",
        )

    _apply_deferred_biomodel_parent_updates(summary, session, context)

    return summary


def build_dataset_template_csv_zip() -> bytes:
    """Create a ZIP archive with one CSV template per domain table."""
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("README.txt", _build_readme_text())
        for table_spec in get_dataset_table_specs():
            csv_buffer = StringIO()
            writer = csv.writer(csv_buffer)
            writer.writerow(_dataset_headers(table_spec))
            archive.writestr(f"{_sheet_name(table_spec)}.csv", csv_buffer.getvalue())

    return buffer.getvalue()


def build_dataset_export_csv_zip(session: Session) -> bytes:
    """Create a ZIP archive with one CSV export per supported domain table."""
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("README.txt", _build_readme_text())
        for table_spec in get_dataset_table_specs():
            csv_buffer = StringIO()
            writer = csv.writer(csv_buffer)
            writer.writerow(_dataset_headers(table_spec))
            for item in session.exec(select(table_spec.model)).all():
                writer.writerow(_export_workbook_row_values(session, table_spec, item))
            archive.writestr(f"{_sheet_name(table_spec)}.csv", csv_buffer.getvalue())

    return buffer.getvalue()


def import_dataset_csv_zip(
    session: Session,
    archive_bytes: bytes,
    *,
    filename: str | None = None,
) -> DatasetImportSummary:
    """Import domain data from a ZIP archive containing one CSV per supported table."""
    if not archive_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty."
        )

    try:
        archive = ZipFile(BytesIO(archive_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ZIP archive. Please upload a valid .zip file.",
        ) from exc

    summary = _create_import_summary(filename=filename, format_name="csv-zip")
    found_supported_file = False
    context = DatasetImportContext()

    with archive:
        names = set(archive.namelist())
        context.source_passage_ids = _collect_csv_source_passage_ids(archive, names)
        for table_spec in get_dataset_table_specs():
            filename_in_archive = f"{_sheet_name(table_spec)}.csv"
            if filename_in_archive not in names:
                continue

            found_supported_file = True
            summary.tables_processed += 1
            with archive.open(filename_in_archive) as handle:
                content = handle.read().decode("utf-8-sig")

            reader = csv.reader(StringIO(content))
            header_row = next(reader, None)
            if header_row is None:
                continue

            if not _dataset_headers_match(table_spec, tuple(header_row)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"CSV file {filename_in_archive!r} does not match the expected template headers.",
                )

            for row_number, values in enumerate(reader, start=2):
                _import_tabular_row(summary, session, table_spec, row_number, values, context)

    if not found_supported_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ZIP archive does not contain any supported dataset CSV files.",
        )

    _apply_deferred_biomodel_parent_updates(summary, session, context)

    return summary


def _get_model_columns(model: type[SQLModel]) -> tuple[DatasetColumnSpec, ...]:
    columns_by_name = {column.name: column for column in model.__table__.columns}
    return tuple(
        DatasetColumnSpec(
            name=field_name,
            required=not columns_by_name[field_name].nullable,
            is_primary_key=columns_by_name[field_name].primary_key,
            foreign_keys=tuple(
                str(foreign_key.column) for foreign_key in columns_by_name[field_name].foreign_keys
            ),
            data_type=_column_data_type(columns_by_name[field_name]),
            format_hint=_column_format_hint(columns_by_name[field_name]),
        )
        for field_name in model.model_fields
        if field_name in columns_by_name
    )


def _sheet_name(table_spec: DatasetTableSpec) -> str:
    return DATASET_SHEET_NAME_ALIASES.get(table_spec.table_name, table_spec.table_name)


def _dataset_foreign_key(foreign_key: str) -> str:
    """Document dataset references while keeping database foreign keys intact."""
    if foreign_key == "implant.id":
        return "mouse.implant_1_id or mouse.implant_2_id"
    table_name, _, column_name = foreign_key.partition(".")
    if table_name in DATASET_SHEET_NAME_ALIASES:
        table_name = "passage"
    return f"{table_name}.{column_name}"


def _dataset_column_name(table_spec: DatasetTableSpec, column_name: str) -> str:
    return DATASET_COLUMN_NAME_ALIASES.get(table_spec.table_name, {}).get(column_name, column_name)


def _dataset_headers(table_spec: DatasetTableSpec) -> tuple[str, ...]:
    return tuple(
        _dataset_column_name(table_spec, column.name) for column in _workbook_columns(table_spec)
    )


def _dataset_headers_match(table_spec: DatasetTableSpec, headers: tuple[str, ...]) -> bool:
    """Accept current headings and legacy model headings in their original positions."""
    columns = _workbook_columns(table_spec)
    return len(headers) == len(columns) and all(
        header in (column.name, _dataset_column_name(table_spec, column.name))
        for header, column in zip(headers, columns, strict=True)
    )


def _workbook_columns(table_spec: DatasetTableSpec) -> tuple[DatasetColumnSpec, ...]:
    if table_spec.table_name == "mouse":
        return table_spec.columns + MOUSE_RELATED_COLUMNS
    return table_spec.columns


def _table_spec_by_name(table_name: str) -> DatasetTableSpec:
    for table_spec in get_dataset_table_specs():
        if table_spec.table_name == table_name:
            return table_spec
    raise RuntimeError(f"Unsupported dataset table: {table_name}")


def _collect_workbook_source_passage_ids(worksheets: dict[str, Any]) -> set[str]:
    passage_spec = _table_spec_by_name("passage")
    worksheet = worksheets.get(_sheet_name(passage_spec))
    if worksheet is None:
        return set()

    expected_columns = _workbook_columns(passage_spec)
    expected_headers = tuple(column.name for column in expected_columns)
    header_row = next(
        worksheet.iter_rows(min_row=1, max_row=1, max_col=len(expected_headers), values_only=True),
        None,
    )
    if header_row is None or _normalize_headers(header_row) != expected_headers:
        return set()

    note_row = next(
        worksheet.iter_rows(min_row=2, max_row=2, max_col=len(expected_headers), values_only=True),
        None,
    )
    has_note_row = note_row is not None and _is_template_note_row(passage_spec, note_row)
    data_start_row = 3 if has_note_row else 2

    return _collect_source_primary_keys_from_rows(
        passage_spec,
        worksheet.iter_rows(
            min_row=data_start_row,
            max_col=len(expected_headers),
            values_only=True,
        ),
    )


def _collect_csv_source_passage_ids(archive: ZipFile, names: set[str]) -> set[str]:
    passage_spec = _table_spec_by_name("passage")
    filename_in_archive = f"{_sheet_name(passage_spec)}.csv"
    if filename_in_archive not in names:
        return set()

    content = archive.read(filename_in_archive).decode("utf-8-sig")
    reader = csv.reader(StringIO(content))
    header_row = next(reader, None)
    expected_columns = _workbook_columns(passage_spec)
    expected_headers = tuple(column.name for column in expected_columns)
    if header_row is None or tuple(header_row) != expected_headers:
        return set()

    return _collect_source_primary_keys_from_rows(passage_spec, reader)


def _collect_source_primary_keys_from_rows(
    table_spec: DatasetTableSpec,
    rows: Any,
) -> set[str]:
    keys: set[str] = set()
    for values in rows:
        if not any(_has_value(value) for value in values):
            continue
        if _is_template_note_row(table_spec, values):
            continue

        payload = _build_row_payload(table_spec, values)
        primary_key = _primary_key_value(table_spec, payload)
        if primary_key is not None:
            keys.add(str(primary_key))
    return keys


def _build_base_workbook() -> Workbook:
    workbook = Workbook()
    table_specs = get_dataset_table_specs()
    for index, table_spec in enumerate(table_specs):
        worksheet = (
            workbook.active if index == 0 else workbook.create_sheet(title=_sheet_name(table_spec))
        )
        worksheet.title = _sheet_name(table_spec)
        workbook_columns = _workbook_columns(table_spec)
        header_row = _dataset_headers(table_spec)
        note_row = [_column_note(column) for column in workbook_columns]
        worksheet.append(header_row)
        worksheet.append(note_row)
        worksheet.freeze_panes = "A3"

        for cell in worksheet[1]:
            cell.font = Font(bold=True)

    return workbook


def _create_import_summary(*, filename: str | None, format_name: str) -> DatasetImportSummary:
    table_counts = {
        table_spec.table_name: EntityImportCounts() for table_spec in get_dataset_table_specs()
    }
    table_counts["implant"] = EntityImportCounts()
    return DatasetImportSummary(
        filename=filename,
        format=format_name,
        table_counts=table_counts,
    )


def _import_tabular_row(
    summary: DatasetImportSummary,
    session: Session,
    table_spec: DatasetTableSpec,
    row_number: int,
    values: tuple[Any, ...] | list[Any],
    context: DatasetImportContext,
) -> None:
    if not any(_has_value(value) for value in values):
        summary.rows_skipped += 1
        return
    if _is_template_note_row(table_spec, values):
        summary.rows_skipped += 1
        return

    payload = _build_row_payload(table_spec, values)
    primary_key = _primary_key_value(table_spec, payload)
    deferred_parent_update = _prepare_deferred_biomodel_parent_update(
        session,
        table_spec,
        payload,
        row_number,
        context,
    )

    try:
        if table_spec.table_name == "mouse":
            action, related_actions = _upsert_mouse_row_with_related(session, table_spec, payload)
        else:
            action = _upsert_row(session, table_spec, payload)
            related_actions = ()
    except (HTTPException, ValidationError, ValueError, SQLAlchemyError) as exc:
        session.rollback()
        summary.rows_failed += 1
        summary.errors.append(
            DatasetImportError(
                table=table_spec.table_name,
                row_number=row_number,
                primary_key=None if primary_key is None else str(primary_key),
                message=_error_message(exc),
            )
        )
        return

    if deferred_parent_update is not None:
        context.deferred_biomodel_parent_updates.append(deferred_parent_update)

    summary.rows_imported += 1
    counts = summary.table_counts[table_spec.table_name]
    if action == "created":
        counts.created += 1
    else:
        counts.updated += 1
    for table_name, related_action in related_actions:
        related_counts = summary.table_counts[table_name]
        if related_action == "created":
            related_counts.created += 1
        else:
            related_counts.updated += 1


def _prepare_deferred_biomodel_parent_update(
    session: Session,
    table_spec: DatasetTableSpec,
    payload: dict[str, Any],
    row_number: int,
    context: DatasetImportContext,
) -> DeferredBiomodelParentUpdate | None:
    if table_spec.table_name != "biomodel":
        return None

    parent_passage_id = payload.get("parent_passage_id")
    primary_key = payload.get("id")
    if parent_passage_id is None or primary_key is None:
        return None

    parent_passage_id_text = str(parent_passage_id)
    if session.get(Passage, _coerce_primary_key_value(parent_passage_id_text)) is not None:
        return None
    if parent_passage_id_text not in context.source_passage_ids:
        return None

    payload.pop("parent_passage_id", None)
    return DeferredBiomodelParentUpdate(
        row_number=row_number,
        primary_key=str(primary_key),
        parent_passage_id=parent_passage_id_text,
    )


def _apply_deferred_biomodel_parent_updates(
    summary: DatasetImportSummary,
    session: Session,
    context: DatasetImportContext,
) -> None:
    for deferred_update in context.deferred_biomodel_parent_updates:
        try:
            _apply_deferred_biomodel_parent_update(session, deferred_update)
        except (HTTPException, ValidationError, ValueError, SQLAlchemyError) as exc:
            session.rollback()
            summary.rows_failed += 1
            summary.errors.append(
                DatasetImportError(
                    table="biomodel",
                    row_number=deferred_update.row_number,
                    primary_key=deferred_update.primary_key,
                    message=_error_message(exc),
                )
            )


def _apply_deferred_biomodel_parent_update(
    session: Session,
    deferred_update: DeferredBiomodelParentUpdate,
) -> None:
    biomodel = session.get(Biomodel, deferred_update.primary_key)
    if biomodel is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot set parent_passage_id because biomodel.id was not imported: {deferred_update.primary_key}",
        )

    if session.get(Passage, _coerce_primary_key_value(deferred_update.parent_passage_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Foreign key parent_passage_id references missing "
                f"passage.id: {deferred_update.parent_passage_id}"
            ),
        )

    patch = Biomodel.model_validate(
        {**biomodel.model_dump(), "parent_passage_id": deferred_update.parent_passage_id}
    )
    update_item(session, Biomodel, deferred_update.primary_key, patch)


def _upsert_mouse_row_with_related(
    session: Session,
    table_spec: DatasetTableSpec,
    payload: dict[str, Any],
) -> tuple[str, tuple[tuple[str, str], ...]]:
    mouse_payload = {
        column.name: payload.get(column.name)
        for column in table_spec.columns
        if column.name in payload
    }
    related_payload = {column.name: payload.get(column.name) for column in MOUSE_RELATED_COLUMNS}

    mouse_action, mouse = _upsert_mouse_row(session, table_spec, mouse_payload)
    related_actions: list[tuple[str, str]] = []

    for implant_number in (1, 2):
        implant_payload = _mouse_implant_payload(related_payload, implant_number)
        if not any(_has_value(value) for value in implant_payload.values()):
            continue

        implant_action, _ = _upsert_mouse_implant(session, mouse.id, implant_payload)
        related_actions.append(("implant", implant_action))

    return mouse_action, tuple(related_actions)


def _upsert_mouse_row(
    session: Session, table_spec: DatasetTableSpec, payload: dict[str, Any]
) -> tuple[str, Mouse]:
    _validate_foreign_keys(session, table_spec, payload)
    primary_key_value = payload.get("id")
    if primary_key_value is not None:
        item = Mouse.model_validate(payload)
        existing = session.get(Mouse, _coerce_primary_key_value(primary_key_value))
        if existing is None:
            return "created", create_item(session, Mouse, item)
        return "updated", update_item(session, Mouse, str(primary_key_value), item)

    pdx_trial_id = payload.get("pdx_trial_id")
    if pdx_trial_id is not None:
        mice = session.exec(select(Mouse).where(Mouse.pdx_trial_id == pdx_trial_id)).all()
        if len(mice) > 1:
            raise HTTPException(
                status_code=400,
                detail="Specify the mouse ID when a PDX trial has multiple mice.",
            )
        if mice:
            existing = mice[0]
            item = Mouse.model_validate({**existing.model_dump(), **payload})
            return "updated", update_item(session, Mouse, str(existing.id), item)

    return "created", create_item(session, Mouse, Mouse.model_validate(payload))


def _mouse_implant_payload(payload: dict[str, Any], implant_number: int) -> dict[str, Any]:
    implant_payload = {
        "id": payload.get(f"implant_{implant_number}_id"),
        "implant_location": payload.get(f"implant_{implant_number}_location"),
        "type": payload.get(f"implant_{implant_number}_type"),
        "implant_date": payload.get(f"implant_{implant_number}_date"),
    }
    return {key: value for key, value in implant_payload.items() if value is not None}


def _upsert_mouse_implant(
    session: Session, mouse_id: UUID, payload: dict[str, Any]
) -> tuple[str, Implant]:
    primary_key_value = payload.get("id")
    item = Implant.model_validate({**payload, "mouse_id": mouse_id})
    if primary_key_value is not None:
        existing = session.get(Implant, _coerce_primary_key_value(primary_key_value))
        if existing is None:
            return "created", create_item(session, Implant, item)
        return "updated", update_item(session, Implant, str(primary_key_value), item)

    existing = session.exec(
        select(Implant)
        .where(Implant.mouse_id == mouse_id)
        .where(Implant.implant_location == payload.get("implant_location"))
        .where(Implant.type == payload.get("type"))
    ).first()
    if existing is None:
        return "created", create_item(session, Implant, item)
    return "updated", update_item(session, Implant, str(existing.id), item)


def _upsert_facs_row(
    session: Session, table_spec: DatasetTableSpec, payload: dict[str, Any]
) -> str:
    _validate_foreign_keys(session, table_spec, payload)
    primary_key_value = payload.get("id")
    if primary_key_value is not None:
        existing = session.get(FACS, _coerce_primary_key_value(primary_key_value))
        if existing is not None:
            update_item(session, FACS, str(primary_key_value), FACS.model_validate(payload))
            return "updated"

    lc_trial_id = payload.get("lc_trial_id")
    if lc_trial_id is not None:
        existing = session.exec(select(FACS).where(FACS.lc_trial_id == lc_trial_id)).first()
        if existing is not None:
            if primary_key_value is not None:
                session.delete(existing)
                session.flush()
                create_item(session, FACS, FACS.model_validate(payload))
                return "updated"

            update_payload = {**existing.model_dump(), **payload, "id": existing.id}
            update_item(session, FACS, str(existing.id), FACS.model_validate(update_payload))
            return "updated"

    create_item(session, FACS, FACS.model_validate(payload))
    return "created"


def _upsert_row(session: Session, table_spec: DatasetTableSpec, payload: dict[str, Any]) -> str:
    if table_spec.table_name == "facs":
        return _upsert_facs_row(session, table_spec, payload)

    model = table_spec.model
    primary_key_column = next(column for column in table_spec.columns if column.is_primary_key)
    primary_key_value = payload.get(primary_key_column.name)
    _validate_foreign_keys(session, table_spec, payload)
    item = model.model_validate(payload)

    if primary_key_value is None:
        create_item(session, model, item)
        return "created"

    existing = session.get(model, _coerce_primary_key_value(primary_key_value))
    if existing is None:
        create_item(session, model, item)
        return "created"

    update_item(session, model, str(primary_key_value), item)
    return "updated"


def _primary_key_value(table_spec: DatasetTableSpec, payload: dict[str, Any]) -> Any:
    primary_key_column = next(column for column in table_spec.columns if column.is_primary_key)
    return payload.get(primary_key_column.name)


def _coerce_primary_key_value(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError:
            return value
    return value


def _serialize_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def _normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        normalized = value.strip()
        if normalized == "":
            return None

        lowered = normalized.casefold()
        if lowered in {"true", "yes", "y", "1", "si", "sí"}:
            return True
        if lowered in {"false", "no", "n", "0"}:
            return False
        return normalized
    return value


def _normalize_headers(values: tuple[Any, ...]) -> tuple[str, ...]:
    normalized = tuple(_normalize_text(value) for value in values)
    return tuple(value for value in normalized if value != "")


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _build_row_payload(
    table_spec: DatasetTableSpec, values: tuple[Any, ...] | list[Any]
) -> dict[str, Any]:
    return _build_payload_from_columns(_workbook_columns(table_spec), values, table_spec=table_spec)


def _build_payload_from_columns(
    columns: tuple[DatasetColumnSpec, ...],
    values: tuple[Any, ...] | list[Any],
    *,
    table_spec: DatasetTableSpec | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for column, value in zip(columns, values, strict=False):
        normalized = _normalize_value(value)
        if normalized is None and column.is_primary_key:
            continue
        if (
            normalized is not None
            and column.data_type == "string"
            and not isinstance(normalized, str)
        ):
            normalized = str(normalized)
        if isinstance(normalized, str) and _should_normalize_passage_identifier(table_spec, column):
            normalized = _normalize_passage_identifier(normalized)
        payload[column.name] = normalized
    return payload


def _should_normalize_passage_identifier(
    table_spec: DatasetTableSpec | None, column: DatasetColumnSpec
) -> bool:
    if table_spec is not None and table_spec.table_name == "passage" and column.name == "id":
        return True
    if column.name in {"passage_id", "parent_passage_id", "pdx_trial_id"}:
        return True
    return "passage.id" in column.foreign_keys


def _normalize_passage_identifier(value: str) -> str:
    return "-".join(part for part in value.strip().split() if part)


def _is_template_note_row(
    table_spec: DatasetTableSpec,
    values: tuple[Any, ...] | list[Any],
) -> bool:
    expected_columns = _workbook_columns(table_spec)
    normalized_values = tuple(
        _normalize_text(value) for value in list(values)[: len(expected_columns)]
    )
    expected_notes = tuple(_column_note(column) for column in expected_columns)
    if normalized_values == expected_notes:
        return True

    first_cell = normalized_values[0].casefold() if normalized_values else ""
    return (
        first_cell.startswith("primary key")
        and "type:" in first_cell
        and ("required" in first_cell or "optional" in first_cell)
    )


def _validate_foreign_keys(
    session: Session, table_spec: DatasetTableSpec, payload: dict[str, Any]
) -> None:
    models_by_table_name = {spec.table_name: spec.model for spec in get_dataset_table_specs()}
    models_by_table_name["implant"] = Implant

    for column in table_spec.columns:
        value = payload.get(column.name)
        if value is None:
            continue

        for foreign_key in column.foreign_keys:
            table_name, _, field_name = foreign_key.partition(".")
            referenced_model = models_by_table_name.get(table_name)
            if referenced_model is None:
                continue

            referenced_primary_key = next(
                spec_column
                for spec_column in _get_model_columns(referenced_model)
                if spec_column.is_primary_key
            )
            if field_name != referenced_primary_key.name:
                continue

            referenced_value = _coerce_primary_key_value(value)
            if session.get(referenced_model, referenced_value) is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Foreign key {column.name} references missing {table_name}.{field_name}: {value}",
                )


def _has_value(value: Any) -> bool:
    return value is not None and (not isinstance(value, str) or value.strip() != "")


def _error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    if isinstance(exc, ValidationError):
        return "; ".join(error["msg"] for error in exc.errors())
    return str(exc)


def _build_readme_text() -> str:
    lines = [
        "TechConnect dataset CSV template",
        "",
        "One CSV file is included per supported domain table.",
        "Keep the header row unchanged.",
        "Preserve primary key values to update existing records; new keys create new records.",
        "Foreign keys must reference an existing or earlier-imported parent row.",
        "Foreign key references below use the CSV filenames without the .csv extension.",
        "PDX, PDO, and LC passage sheets reuse the corresponding passage.id values.",
        "Mouse passage_id must identify a PDX passage; FACS passage_id must identify an LC passage.",
        "Measure implant_id must identify an existing implant or match mouse.implant_1_id or mouse.implant_2_id in this import.",
        "Measurement length and width are in mm; tumor volume is calculated automatically.",
        "A blank measure.id creates a new measurement on every import. Export after the first import and preserve IDs to update measurements without duplicates.",
        "Boolean values accept true/false, yes/no, or 1/0. Dates should use YYYY-MM-DD.",
        "Authentication and session tables are excluded from this package.",
        "",
        "Tables:",
    ]
    for table_spec in get_dataset_table_specs():
        lines.append(f"- {_sheet_name(table_spec)}: /api/{table_spec.route_prefix}")
    lines.extend(["", "Foreign keys:"])
    for table_spec in get_dataset_table_specs():
        for column in table_spec.columns:
            for foreign_key in column.foreign_keys:
                lines.append(
                    f"- {_sheet_name(table_spec)}.{_dataset_column_name(table_spec, column.name)}"
                    f" -> {_dataset_foreign_key(foreign_key)}"
                )
    return "\n".join(lines)


def _column_note(column: DatasetColumnSpec) -> str:
    parts: list[str] = []
    if column.is_primary_key:
        parts.append("primary key")
    if column.required:
        parts.append("required")
    else:
        parts.append("optional")
    parts.append(f"type:{column.data_type}")
    if column.name in {"length", "width"}:
        parts.append("unit:mm")
    if column.format_hint:
        parts.append(f"format:{column.format_hint}")
    parts.extend(f"fk:{_dataset_foreign_key(foreign_key)}" for foreign_key in column.foreign_keys)
    return " | ".join(parts)


def _column_data_type(column) -> str:
    python_type = _column_python_type(column)
    if python_type is UUID:
        return "uuid"
    if python_type is str:
        return "string"
    if python_type is int:
        return "integer"
    if python_type is float:
        return "number"
    if python_type is bool:
        return "boolean"
    if python_type is date:
        return "date"
    if python_type is datetime:
        return "datetime"
    type_name = column.type.__class__.__name__.lower()
    if "string" in type_name:
        return "string"
    return type_name


def _column_format_hint(column) -> str | None:
    python_type = _column_python_type(column)
    if python_type is UUID:
        return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    if python_type is bool:
        return "true/false/yes/no/1/0"
    if python_type is date:
        return "YYYY-MM-DD"
    if python_type is datetime:
        return "YYYY-MM-DDTHH:MM:SS"
    return None


def _column_python_type(column) -> type[Any] | None:
    try:
        return column.type.python_type
    except AttributeError, NotImplementedError:
        return None
