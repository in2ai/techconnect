"""Entity CRUD endpoints."""

from typing import TypeVar

from fastapi import APIRouter, Query
from models import (
    FACS,
    Biomodel,
    Cryopreservation,
    GenomicSequencing,
    Image,
    Implant,
    LCTrial,
    LiquidBiopsy,
    MolecularData,
    Mouse,
    Passage,
    Patient,
    PDOTrial,
    PDXTrial,
    SizeRecord,
    Trial,
    Tumor,
    UsageRecord,
)
from sqlmodel import SQLModel

from app.api.dependencies import SessionDep
from app.services.crud import create_item, delete_item, get_item_or_404, list_items, update_item

ModelType = TypeVar("ModelType", bound=SQLModel)

router = APIRouter()


def build_entity_router(model: type[ModelType], *, prefix: str, tag: str) -> APIRouter:
    """Build CRUD endpoints for a model."""
    model_name = model.__name__
    operation_slug = prefix.replace("-", "_")
    entity_router = APIRouter(prefix=f"/{prefix}", tags=[tag])

    @entity_router.get(
        "",
        response_model=list[model],
        operation_id=f"get_{operation_slug}",
        summary=f"List {tag}",
        description=f"Retrieve a list of {tag} with pagination support.",
    )
    def read_items(
        session: SessionDep,
        offset: int = 0,
        limit: int = Query(default=100, ge=1, le=100),
    ):
        """List all items."""
        return list_items(session, model, offset=offset, limit=limit)

    @entity_router.get(
        "/{item_id}",
        response_model=model,
        operation_id=f"get_{operation_slug}_by_id",
        summary=f"Get {model_name}",
        description=f"Retrieve a specific {model_name} by its ID.",
    )
    def read_item(item_id: str, session: SessionDep):
        """Get an item by ID."""
        return get_item_or_404(session, model, item_id)

    @entity_router.post(
        "",
        response_model=model,
        operation_id=f"create_{operation_slug}",
        summary=f"Create {model_name}",
        description=f"Create a new {model_name} record.",
    )
    def create_entity(item: model, session: SessionDep):
        """Create a new item."""
        return create_item(session, model, item)

    @entity_router.patch(
        "/{item_id}",
        response_model=model,
        operation_id=f"update_{operation_slug}",
        summary=f"Update {model_name}",
        description=f"Update an existing {model_name} record by its ID.",
    )
    def update_entity(item_id: str, item: model, session: SessionDep):
        """Update an existing item."""
        return update_item(session, model, item_id, item)

    @entity_router.delete(
        "/{item_id}",
        operation_id=f"delete_{operation_slug}",
        summary=f"Delete {model_name}",
        description=f"Remove a specific {model_name} record by its ID.",
    )
    def delete_entity(item_id: str, session: SessionDep):
        """Delete an item."""
        return delete_item(session, model, item_id)

    return entity_router


ENTITY_ROUTERS: tuple[tuple[type[SQLModel], str, str], ...] = (
    (Patient, "patients", "Patients"),
    (Tumor, "tumors", "Tumors"),
    (LiquidBiopsy, "liquid-biopsies", "Liquid Biopsies"),
    (Biomodel, "biomodels", "Biomodels"),
    (Passage, "passages", "Passages"),
    (Trial, "trials", "Trials"),
    (PDXTrial, "pdx-trials", "PDX Trials"),
    (PDOTrial, "pdo-trials", "PDO Trials"),
    (LCTrial, "lc-trials", "LC Trials"),
    (Implant, "implants", "Implants"),
    (SizeRecord, "size-records", "Size Records"),
    (Mouse, "mice", "Mice"),
    (FACS, "facs", "FACS"),
    (UsageRecord, "usage-records", "Usage Records"),
    (Image, "images", "Images"),
    (Cryopreservation, "cryopreservations", "Cryopreservations"),
    (GenomicSequencing, "genomic-sequencings", "Genomic Sequencings"),
    (MolecularData, "molecular-data", "Molecular Data"),
)

for entity_model, entity_prefix, entity_tag in ENTITY_ROUTERS:
    router.include_router(
        build_entity_router(entity_model, prefix=entity_prefix, tag=entity_tag),
    )
