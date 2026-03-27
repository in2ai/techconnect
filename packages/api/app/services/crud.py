"""Shared CRUD operations for SQLModel entities."""

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
        tumor_code = payload_data.get("tumor_biobank_code")
        if tumor_code:
            stmt = select(func.count()).select_from(model).where(getattr(model, "tumor_biobank_code") == tumor_code)
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 3:
                raise HTTPException(status_code=400, detail="A tumor can generate max 3 biomodels")

        trial_id = payload_data.get("parent_trial_id")
        if trial_id:
            stmt = select(func.count()).select_from(model).where(getattr(model, "parent_trial_id") == trial_id)
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 2:
                raise HTTPException(status_code=400, detail="A trial generates max 2 biomodel")

    elif model.__name__ == "Implant":
        mouse_id = payload_data.get("mouse_id")
        if mouse_id:
            stmt = select(func.count()).select_from(model).where(getattr(model, "mouse_id") == mouse_id)
            if item_id:
                stmt = stmt.where(getattr(model, "id") != item_id)
            if (session.scalar(stmt) or 0) >= 2:
                raise HTTPException(status_code=400, detail="A mouse can have 1 or 2 implants")



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
    payload_dump = payload.model_dump()
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
