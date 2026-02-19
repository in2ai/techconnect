"""Shared CRUD operations for SQLModel entities."""

from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import SQLModel, Session, select

ModelType = TypeVar("ModelType", bound=SQLModel)


def list_items(
    session: Session,
    model: type[ModelType],
    *,
    offset: int,
    limit: int,
) -> list[ModelType]:
    """List entities with offset/limit pagination."""
    statement = select(model).offset(offset).limit(limit)
    return list(session.exec(statement))


def get_item_or_404(session: Session, model: type[ModelType], item_id: str) -> ModelType:
    """Fetch one entity or raise 404."""
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return item


def create_item(session: Session, model: type[ModelType], payload: ModelType) -> ModelType:
    """Create and persist one entity."""
    validated = model.model_validate(payload.model_dump())
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
