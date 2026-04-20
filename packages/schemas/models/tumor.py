"""Tumor model - Main entity representing a tumor sample."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union

from uuid import UUID, uuid4
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .patient import Patient
    from .sample import Sample
    from .biomodel import Biomodel


class Tumor(SQLModel, table=True):
    """
    Tumor entity representing a tumor sample in the biobank.
    
    Attributes:
        biobank_code: Unique biobank identifier (primary key)
        lab_code: Laboratory code
        diagnosis: Tumor diagnosis
        ap_observation: Anatomical pathology observation
        grade: Tumor grade
        organ: Organ of origin
        status: Current status
        tnm: TNM staging
        patient_nhc: FK to Patient
        registration_date: Date registered in system
        operation_date: Date of surgical operation
    """
    
    __tablename__ = "tumor"
    
    # Primary key
    biobank_code: str = Field(primary_key=True, description="Biobank code identifier")
    
    # Fields
    lab_code: Optional[str] = Field(default=None, max_length=100)
    diagnosis: Optional[str] = Field(default=None, max_length=100)
    ap_observation: Optional[str] = Field(default=None)  # text field
    grade: Optional[str] = Field(default=None, max_length=50)
    organ: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=50)
    tnm: Optional[str] = Field(default=None, max_length=50)
    registration_date: Union[date, None] = Field(default=None)
    operation_date: Union[date, None] = Field(default=None)
    
    # Foreign keys
    patient_nhc: str = Field(foreign_key="patient.nhc", description="FK to Patient")
    
    # Relationships
    patient: Optional["Patient"] = Relationship(back_populates="tumors")
    samples: list["Sample"] = Relationship(back_populates="tumor")
    biomodels: list["Biomodel"] = Relationship(back_populates="tumor")
    genomic_sequencing: Optional["TumorGenomicSequencing"] = Relationship(back_populates="tumor")
    molecular_data: Optional["TumorMolecularData"] = Relationship(back_populates="tumor")


class TumorGenomicSequencing(SQLModel, table=True):
    """
    TumorGenomicSequencing entity - genomic sequencing data associated with a tumor.
    """
    
    __tablename__ = "tumor_genomic_sequencing"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    has_data: Optional[bool] = Field(default=None)
    data: Optional[str] = Field(default=None)
    
    tumor_biobank_code: Optional[str] = Field(
        default=None,
        foreign_key="tumor.biobank_code",
        unique=True,
        description="FK to Tumor"
    )
    
    tumor: Optional["Tumor"] = Relationship(back_populates="genomic_sequencing")


class TumorMolecularData(SQLModel, table=True):
    """
    TumorMolecularData entity - molecular data associated with a tumor.
    """
    
    __tablename__ = "tumor_molecular_data"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    has_data: Optional[bool] = Field(default=None)
    data: Optional[str] = Field(default=None)
    
    tumor_biobank_code: Optional[str] = Field(
        default=None,
        foreign_key="tumor.biobank_code",
        unique=True,
        description="FK to Tumor"
    )
    
    tumor: Optional["Tumor"] = Relationship(back_populates="molecular_data")
