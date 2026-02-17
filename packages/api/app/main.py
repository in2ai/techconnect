"""
TechConnect FastAPI Backend

This module provides the main FastAPI application for the TechConnect
biomedical research application.
"""

from contextlib import asynccontextmanager
from typing import List, Type, TypeVar

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Import models from the shared schemas package
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
from sqlmodel import Session, SQLModel, select

from .database import create_db_and_tables, get_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup: Initialize database connection and create tables if they don't exist
    create_db_and_tables()
    yield
    # Shutdown: Clean up resources


app = FastAPI(
    title="TechConnect API",
    description="API for TechConnect biomedical research application",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for React Admin frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", summary="Root Endpoint", tags=["System"])
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "TechConnect API is running"}


@app.get("/api/health", summary="Health Check", tags=["System"])
async def health():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


ModelType = TypeVar("ModelType", bound=SQLModel)


def create_crud_endpoints(model: Type[ModelType], prefix: str, tag: str):
    """
    Create standard CRUD endpoints (Create, Read, Update, Delete) for a model.
    """
    model_name = model.__name__

    @app.get(
        f"/api/{prefix}",
        response_model=List[model],
        tags=[tag],
        operation_id=f"get_{prefix.replace('-', '_')}",
        summary=f"List {tag}",
        description=f"Retrieve a list of {tag} with pagination support.",
    )
    def read_items(
        offset: int = 0,
        limit: int = Query(default=100, le=100),
        session: Session = Depends(get_session),
    ):
        """List all items."""
        items = session.exec(select(model).offset(offset).limit(limit)).all()
        return items

    @app.get(
        f"/api/{prefix}/{{item_id}}",
        response_model=model,
        tags=[tag],
        operation_id=f"get_{prefix.replace('-', '_')}_by_id",
        summary=f"Get {model_name}",
        description=f"Retrieve a specific {model_name} by its ID.",
    )
    def read_item(item_id: str, session: Session = Depends(get_session)):
        """Get an item by ID."""
        item = session.get(model, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{model_name} not found")
        return item

    @app.post(
        f"/api/{prefix}",
        response_model=model,
        tags=[tag],
        operation_id=f"create_{prefix.replace('-', '_')}",
        summary=f"Create {model_name}",
        description=f"Create a new {model_name} record.",
    )
    def create_item(item: model, session: Session = Depends(get_session)):
        """Create a new item."""
        # Force re-validation by round-tripping through dump/validate
        # This ensures strings are parsed to proper types (e.g. date strings to date objects)
        # SQLModel/Pydantic v2 usually validates on init, but when passed through FastAPI
        # as a request body, edge cases can occur with dynamic models.
        item_data = item.model_dump()
        item = model.model_validate(item_data)

        session.add(item)
        try:
            session.commit()
            session.refresh(item)
            return item
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    # Manually update annotations to ensure FastAPI sees the correct model class
    create_item.__annotations__ = {"item": model, "session": Session, "return": model}

    @app.patch(
        f"/api/{prefix}/{{item_id}}",
        response_model=model,
        tags=[tag],
        operation_id=f"update_{prefix.replace('-', '_')}",
        summary=f"Update {model_name}",
        description=f"Update an existing {model_name} record by its ID.",
    )
    def update_item(item_id: str, item: model, session: Session = Depends(get_session)):
        """Update an existing item."""
        db_item = session.get(model, item_id)
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{model_name} not found")

        # Exclude unset fields to allow partial updates
        # This gives us the raw data sent by the user (e.g. strings for dates)
        item_data = item.model_dump(exclude_unset=True)

        # To ensure we validate/convert types correctly (e.g. str -> date):
        # 1. Get current DB data
        # 2. Merge user updates on top
        # 3. Validate the full object (this triggers type conversion)
        # 4. Apply the converted updates back to the DB item

        current_data = db_item.model_dump()
        merged_data = {**current_data, **item_data}

        # This will convert "2021-02-12" to date(2021, 2, 12)
        validated_item = model.model_validate(merged_data)

        # Extract only the fields that were originally updated, now with correct types
        # We use the keys from item_data to know what was intended to be updated
        clean_data = validated_item.model_dump(include={k for k in item_data})

        db_item.sqlmodel_update(clean_data)

        session.add(db_item)
        session.commit()
        session.refresh(db_item)
        return db_item

    # Update annotations for update_item as well
    update_item.__annotations__ = {
        "item_id": str,
        "item": model,
        "session": Session,
        "return": model,
    }

    @app.delete(
        f"/api/{prefix}/{{item_id}}",
        tags=[tag],
        operation_id=f"delete_{prefix.replace('-', '_')}",
        summary=f"Delete {model_name}",
        description=f"Remove a specific {model_name} record by its ID.",
    )
    def delete_item(item_id: str, session: Session = Depends(get_session)):
        """Delete an item."""
        db_item = session.get(model, item_id)
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{model_name} not found")

        session.delete(db_item)
        session.commit()
        return {"ok": True}


# Register endpoints for all models
create_crud_endpoints(Patient, "patients", "Patients")
create_crud_endpoints(Tumor, "tumors", "Tumors")
create_crud_endpoints(LiquidBiopsy, "liquid-biopsies", "Liquid Biopsies")
create_crud_endpoints(Biomodel, "biomodels", "Biomodels")
create_crud_endpoints(Passage, "passages", "Passages")
create_crud_endpoints(Trial, "trials", "Trials")
create_crud_endpoints(PDXTrial, "pdx-trials", "PDX Trials")
create_crud_endpoints(PDOTrial, "pdo-trials", "PDO Trials")
create_crud_endpoints(LCTrial, "lc-trials", "LC Trials")
create_crud_endpoints(Implant, "implants", "Implants")
create_crud_endpoints(SizeRecord, "size-records", "Size Records")
create_crud_endpoints(Mouse, "mice", "Mice")
create_crud_endpoints(FACS, "facs", "FACS")
create_crud_endpoints(UsageRecord, "usage-records", "Usage Records")
create_crud_endpoints(Image, "images", "Images")
create_crud_endpoints(Cryopreservation, "cryopreservations", "Cryopreservations")
create_crud_endpoints(GenomicSequencing, "genomic-sequencings", "Genomic Sequencings")
create_crud_endpoints(MolecularData, "molecular-data", "Molecular Data")
