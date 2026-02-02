"""Biomodel model - Entity representing a biological model derived from a tumor."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .tumor import Tumor
    from .passage import Passage


class Biomodel(SQLModel, table=True):
    """
    Biomodel entity representing a biological model (PDX, PDO, etc.) derived from a tumor.
    
    Attributes:
        id: Unique identifier (UUID)
        type: Type of biomodel (PDX, PDO, LC, etc.)
        preclinical_trials: Information about preclinical trials
        description: General description
        creation_date: Date the biomodel was created
        status: Current status
        progresses: Whether the biomodel shows progression
        viability: Viability percentage
        tumor_biobank_code: FK to Tumor
    """
    
    __tablename__ = "biomodel"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    type: Optional[str] = Field(default=None, max_length=50)
    preclinical_trials: Optional[str] = Field(default=None)  # text field
    description: Optional[str] = Field(default=None)  # text field
    creation_date: Union[date, None] = Field(default=None)
    status: Optional[str] = Field(default=None, max_length=50)
    progresses: Optional[bool] = Field(default=None)
    viability: Optional[float] = Field(default=None)
    
    # Foreign keys (required - 1:N relationship with Tumor)
    tumor_biobank_code: str = Field(
        foreign_key="tumor.biobank_code",
        description="FK to Tumor"
    )
    
    # Relationships
    tumor: Optional["Tumor"] = Relationship(back_populates="biomodels")
    passages: list["Passage"] = Relationship(back_populates="biomodel")
