"""Trial-related entities - UsageRecord, Image, Cryopreservation, GenomicSequencing, MolecularData."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .trial import Trial


class UsageRecord(SQLModel, table=True):
    """
    UsageRecord entity - records usage of trial materials.
    
    Attributes:
        id: Unique identifier (UUID)
        usage_type: Type of usage
        description: Description of usage
        date: Date of usage
        trial_id: FK to Trial
    """
    
    __tablename__ = "usage_record"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    usage_type: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)  # text field
    record_date: Union[date, None] = Field(default=None)
    
    # Foreign keys (required - 1:0..N relationship with Trial)
    trial_id: UUID = Field(foreign_key="trial.id", description="FK to Trial")
    
    # Relationships
    trial: Optional["Trial"] = Relationship(back_populates="usage_records")


class Image(SQLModel, table=True):
    """
    Image entity - represents images generated during a trial.
    
    Attributes:
        id: Unique identifier (UUID)
        date: Date the image was taken
        type: Type of image
        ap_review: Anatomical pathology review
        trial_id: FK to Trial
    """
    
    __tablename__ = "image"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    image_date: Union[date, None] = Field(default=None)
    type: Optional[str] = Field(default=None, max_length=50)
    ap_review: Optional[str] = Field(default=None)  # text field
    
    # Foreign keys (required - 1:0..N relationship with Trial)
    trial_id: UUID = Field(foreign_key="trial.id", description="FK to Trial")
    
    # Relationships
    trial: Optional["Trial"] = Relationship(back_populates="images")


class Cryopreservation(SQLModel, table=True):
    """
    Cryopreservation entity - records cryopreservation of trial samples.
    
    Attributes:
        id: Unique identifier (UUID)
        location: Storage location
        date: Date of cryopreservation
        vial_count: Number of vials
        trial_id: FK to Trial
    """
    
    __tablename__ = "cryopreservation"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    location: Optional[str] = Field(default=None, max_length=100)
    cryo_date: Union[date, None] = Field(default=None)
    vial_count: Optional[int] = Field(default=None)
    
    # Foreign keys (required - 1:0..N relationship with Trial)
    trial_id: UUID = Field(foreign_key="trial.id", description="FK to Trial")
    
    # Relationships
    trial: Optional["Trial"] = Relationship(back_populates="cryopreservations")


class GenomicSequencing(SQLModel, table=True):
    """
    GenomicSequencing entity - genomic sequencing data associated with a trial.
    
    Attributes:
        id: Unique identifier (UUID)
        trial_id: FK to Trial (optional - 1:0..1 relationship)
    """
    
    __tablename__ = "genomic_sequencing"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Parameters to be defined (as noted in original schema)
    
    # Foreign keys (optional - 1:0..1 relationship with Trial)
    trial_id: Optional[UUID] = Field(
        default=None,
        foreign_key="trial.id",
        description="FK to Trial"
    )
    
    # Relationships
    trial: Optional["Trial"] = Relationship(back_populates="genomic_sequencing")


class MolecularData(SQLModel, table=True):
    """
    MolecularData entity - molecular data associated with a trial.
    
    Attributes:
        id: Unique identifier (UUID)
        trial_id: FK to Trial (optional - 1:0..1 relationship)
    """
    
    __tablename__ = "molecular_data"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Foreign keys (optional - 1:0..1 relationship with Trial)
    trial_id: Optional[UUID] = Field(
        default=None,
        foreign_key="trial.id",
        description="FK to Trial"
    )
    
    # Relationships
    trial: Optional["Trial"] = Relationship(back_populates="molecular_data")
