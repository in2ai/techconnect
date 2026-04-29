"""Passage model - Entity representing a biomodel passage and its trial data."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .biomodel import Biomodel
    from .trial import PDXTrial, PDOTrial, LCTrial
    from .trial_entities import (
        UsageRecord,
        Image,
        Cryopreservation,
        TrialGenomicSequencing,
        TrialMolecularData,
    )


class Passage(SQLModel, table=True):
    """
    Passage entity representing a passage (generation) of a biomodel and its experiment data.
    
    Attributes:
        id: Unique identifier generated from biomodel id and next passage suffix
        description: General description
        success: Whether the passage experiment was successful
        status: Status of the passage experiment
        preclinical_trials: Preclinical trials information
        creation_date: Date the passage was created
        biobank_shipment: Whether there was a biobank shipment
        biobank_arrival_date: Date of biobank arrival
        biomodel_id: FK to Biomodel
    """
    
    __tablename__ = "passage"
    
    # Primary key
    id: str = Field(default="", primary_key=True, max_length=150)
    
    # Fields
    description: Optional[str] = Field(default=None)  # text field
    success: Optional[bool] = Field(default=None)
    status: Optional[bool] = Field(default=None)
    preclinical_trials: Optional[str] = Field(default=None)
    creation_date: Union[date, None] = Field(default=None)
    biobank_shipment: Optional[bool] = Field(default=None)
    biobank_arrival_date: Union[date, None] = Field(default=None)
    
    # Foreign keys (required - N:1 relationship with Biomodel)
    biomodel_id: str = Field(foreign_key="biomodel.id", description="FK to Biomodel")

    # Relationships
    biomodel: Optional["Biomodel"] = Relationship(
        back_populates="passages",
        sa_relationship_kwargs={"foreign_keys": "[Passage.biomodel_id]"},
    )
    child_biomodels: list["Biomodel"] = Relationship(
        back_populates="parent_passage",
        sa_relationship_kwargs={"foreign_keys": "[Biomodel.parent_passage_id]"},
    )
    usage_records: list["UsageRecord"] = Relationship(back_populates="passage")
    images: list["Image"] = Relationship(back_populates="passage")
    cryopreservations: list["Cryopreservation"] = Relationship(back_populates="passage")
    genomic_sequencing: Optional["TrialGenomicSequencing"] = Relationship(back_populates="passage")
    molecular_data: Optional["TrialMolecularData"] = Relationship(back_populates="passage")
    pdx_trial: Optional["PDXTrial"] = Relationship(back_populates="passage")
    pdo_trial: Optional["PDOTrial"] = Relationship(back_populates="passage")
    lc_trial: Optional["LCTrial"] = Relationship(back_populates="passage")
