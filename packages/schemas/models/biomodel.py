"""Biomodel model - Entity representing a biological model derived from a tumor."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import ForeignKey

if TYPE_CHECKING:
    from .tumor import Tumor
    from .passage import Passage
    from .trial import Trial


from pydantic import computed_field


class Biomodel(SQLModel, table=True):
    """
    Biomodel entity representing a biological model (PDX, PDO, etc.) derived from a tumor.
    
    Attributes:
        id: Unique identifier (UUID)
        type: Type of biomodel (PDX, PDO, LC, etc.)
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
    
    parent_trial_id: Optional[UUID] = Field(
        default=None,
        sa_column_args=[ForeignKey("trial.id", name="fk_biomodel_parent_trial_id", use_alter=True)],
        description="FK to parent Trial"
    )
    
    # Relationships
    tumor: Optional["Tumor"] = Relationship(back_populates="biomodels")
    passages: list["Passage"] = Relationship(back_populates="biomodel")
    parent_trial: Optional["Trial"] = Relationship(back_populates="child_biomodels")

    @computed_field
    @property
    def tumor_organ(self) -> Optional[str]:
        """Organ of origin derived from the associated Tumor."""
        return self.tumor.organ if self.tumor else None
