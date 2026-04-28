"""Passage-related entities - UsageRecord, Image, Cryopreservation, sequencing, and molecular data."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .passage import Passage


class UsageRecord(SQLModel, table=True):
    """UsageRecord entity - records usage of passage materials."""

    __tablename__ = "usage_record"

    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Fields
    record_type: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)  # text field
    record_date: Union[date, None] = Field(default=None)

    # Foreign keys (required - 1:0..N relationship with Passage)
    passage_id: str = Field(foreign_key="passage.id", description="FK to Passage")

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="usage_records")


class Image(SQLModel, table=True):
    """Image entity - represents images generated during a passage."""

    __tablename__ = "image"

    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Fields
    image_date: Union[date, None] = Field(default=None)
    scanner_magnification: Optional[int] = Field(default=None)
    type: Optional[str] = Field(default=None, max_length=50)
    ap_review: Optional[bool] = Field(default=None)

    # Foreign keys (required - 1:0..N relationship with Passage)
    passage_id: str = Field(foreign_key="passage.id", description="FK to Passage")

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="images")


class Cryopreservation(SQLModel, table=True):
    """Cryopreservation entity - records cryopreservation of passage samples."""

    __tablename__ = "cryopreservation"

    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Fields
    location: Optional[str] = Field(default=None, max_length=100)
    cryo_date: Union[date, None] = Field(default=None)
    vial_count: Optional[int] = Field(default=None)

    # Foreign keys (required - 1:0..N relationship with Passage)
    passage_id: str = Field(foreign_key="passage.id", description="FK to Passage")

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="cryopreservations")


class TrialGenomicSequencing(SQLModel, table=True):
    """Genomic sequencing data associated with a passage."""

    __tablename__ = "trial_genomic_sequencing"

    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Fields
    annotations: Optional[str] = Field(default=None)

    # Foreign keys (optional - 1:0..1 relationship with Passage)
    passage_id: Optional[str] = Field(
        default=None,
        foreign_key="passage.id",
        unique=True,
        description="FK to Passage",
    )

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="genomic_sequencing")


class TrialMolecularData(SQLModel, table=True):
    """Molecular data associated with a passage."""

    __tablename__ = "trial_molecular_data"

    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    annotations: Optional[str] = Field(default=None)

    # Foreign keys (optional - 1:0..1 relationship with Passage)
    passage_id: Optional[str] = Field(
        default=None,
        foreign_key="passage.id",
        unique=True,
        description="FK to Passage",
    )

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="molecular_data")
