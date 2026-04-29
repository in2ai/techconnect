"""Shared CRUD operations for SQLModel entities."""

import re
from typing import Any, TypeVar
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import SQLModel, Session, select, func

ModelType = TypeVar("ModelType", bound=SQLModel)


def _coerce_pk(model: type[ModelType], item_id: str) -> Any:
    """Convert item_id to the expected primary key type (e.g. UUID)."""
    pk_fields = [f for f in model.model_fields.values() if getattr(f, "primary_key", False)]
    if pk_fields and pk_fields[0].annotation is UUID:
        try:
            return UUID(item_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid UUID: {item_id}") from exc
    return item_id


def _check_constraints(session: Session, model: type[ModelType], payload_data: dict, item_id: Any = None) -> None:
    if model.__name__ == "Biomodel":
        if item_id is None:
            biomodel_id = payload_data.get("id")
            if not biomodel_id:
                raise HTTPException(status_code=400, detail="Biomodel ID is required")
            if session.get(model, biomodel_id) is not None:
                raise HTTPException(status_code=400, detail="Biomodel ID already exists")

        tumor_code = payload_data.get("tumor_biobank_code")
        if tumor_code:
            stmt = select(func.count()).select_from(model).where(getattr(model, "tumor_biobank_code") == tumor_code)
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 3:
                raise HTTPException(status_code=400, detail="A tumor can generate max 3 biomodels")

        parent_passage_id = payload_data.get("parent_passage_id")
        if parent_passage_id:
            stmt = select(func.count()).select_from(model).where(
                getattr(model, "parent_passage_id") == parent_passage_id
            )
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 2:
                raise HTTPException(status_code=400, detail="A passage generates max 2 biomodels")

    elif model.__name__ == "Implant":
        mouse_id = payload_data.get("mouse_id")
        if mouse_id:
            stmt = select(func.count()).select_from(model).where(getattr(model, "mouse_id") == mouse_id)
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 2:
                raise HTTPException(status_code=400, detail="A mouse can have 1 or 2 implants")


def _next_sample_id(session: Session, model: type[ModelType], tumor_biobank_code: str) -> str:
    """Generate sample IDs like {tumor_biobank_code}-M{x}."""
    prefix = f"{tumor_biobank_code}-M"
    statement = select(getattr(model, "id")).where(
        getattr(model, "tumor_biobank_code") == tumor_biobank_code
    )
    existing_ids = session.exec(statement).all()
    next_number = 1

    for existing_id in existing_ids:
        match = re.fullmatch(rf"{re.escape(prefix)}(\d+)", str(existing_id))
        if match:
            next_number = max(next_number, int(match.group(1)) + 1)

    return f"{prefix}{next_number}"


def _next_passage_id(session: Session, model: type[ModelType], biomodel_id: str) -> str:
    """Generate passage IDs like {biomodel_id}-P{x}."""
    prefix = f"{biomodel_id}-P"
    statement = select(getattr(model, "id")).where(getattr(model, "biomodel_id") == biomodel_id)
    existing_ids = session.exec(statement).all()
    next_number = 1

    for existing_id in existing_ids:
        match = re.fullmatch(rf"{re.escape(prefix)}(\d+)", str(existing_id))
        if match:
            next_number = max(next_number, int(match.group(1)) + 1)

    return f"{prefix}{next_number}"


def _prepare_create_payload(
    session: Session,
    model: type[ModelType],
    payload_data: dict[str, Any],
) -> dict[str, Any]:
    if model.__name__ == "Sample" and not payload_data.get("id"):
        tumor_biobank_code = payload_data.get("tumor_biobank_code")
        if not tumor_biobank_code:
            raise HTTPException(status_code=400, detail="Sample tumor_biobank_code is required")

        return {
            **payload_data,
            "id": _next_sample_id(session, model, str(tumor_biobank_code)),
        }

    if model.__name__ == "Passage" and not payload_data.get("id"):
        biomodel_id = payload_data.get("biomodel_id")
        if not biomodel_id:
            raise HTTPException(status_code=400, detail="Passage biomodel_id is required")

        return {
            **payload_data,
            "id": _next_passage_id(session, model, str(biomodel_id)),
        }

    return payload_data



from sqlalchemy.orm import joinedload


def list_items(
    session: Session,
    model: type[ModelType],
    *,
    offset: int,
    limit: int,
) -> list[ModelType]:
    """List entities with offset/limit pagination."""
    statement = select(model).offset(offset).limit(limit)
    if model.__name__ == "Biomodel":
        statement = statement.options(joinedload(model.tumor))
    return list(session.exec(statement))


def get_item_or_404(session: Session, model: type[ModelType], item_id: str) -> ModelType:
    """Fetch one entity or raise 404."""
    pk = _coerce_pk(model, item_id)
    if model.__name__ == "Biomodel":
        statement = select(model).where(getattr(model, "id") == pk).options(joinedload(model.tumor))
        item = session.exec(statement).first()
    else:
        item = session.get(model, pk)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return item


def create_item(session: Session, model: type[ModelType], payload: ModelType) -> ModelType:
    """Create and persist one entity."""
    payload_dump = _prepare_create_payload(session, model, payload.model_dump())
    _check_constraints(session, model, payload_dump)
    
    validated = model.model_validate(payload_dump)
    session.add(validated)
    _commit_or_400(session)
    session.refresh(validated)
    return validated


def update_item(
    session: Session,
    model: type[ModelType],
    item_id: str,
    payload: ModelType,
) -> ModelType:
    """Update a persisted entity with PATCH semantics."""
    db_item = get_item_or_404(session, model, item_id)
    payload_data = payload.model_dump(exclude_unset=True)

    if not payload_data:
        return db_item

    merged_data = {**db_item.model_dump(), **payload_data}
    _check_constraints(session, model, merged_data, _coerce_pk(model, item_id))
    
    validated_item = model.model_validate(merged_data)
    validated_data = validated_item.model_dump()
    clean_data = {field: validated_data[field] for field in payload_data}

    db_item.sqlmodel_update(clean_data)
    session.add(db_item)
    _commit_or_400(session)
    session.refresh(db_item)
    return db_item


def delete_item(session: Session, model: type[ModelType], item_id: str) -> dict[str, bool]:
    """Delete one entity by id."""
    db_item = get_item_or_404(session, model, item_id)
    session.delete(db_item)
    _commit_or_400(session)
    return {"ok": True}


def _commit_or_400(session: Session) -> None:
    """Commit a transaction and map database errors to HTTP 400."""
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        detail = str(getattr(exc, "orig", exc))
        raise HTTPException(status_code=400, detail=detail) from exc
