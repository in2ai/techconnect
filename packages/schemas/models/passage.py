"""Passage model - Entity representing a passage of a biomodel."""

from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .biomodel import Biomodel
    from .trial import Trial


class Passage(SQLModel, table=True):
    """
    Passage entity representing a passage (generation) of a biomodel.
    
    Attributes:
        id: Unique identifier (UUID)
        number: Passage number
        status: Current status
        s_index: S-index value
        viability: Viability percentage
        description: General description
        biomodel_id: FK to Biomodel
    """
    
    __tablename__ = "passage"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    number: Optional[int] = Field(default=None)
    status: Optional[str] = Field(default=None, max_length=50)
    s_index: Optional[float] = Field(default=None)
    viability: Optional[float] = Field(default=None)
    description: Optional[str] = Field(default=None)  # text field
    
    # Foreign keys (required - 1:0..2 relationship with Biomodel)
    biomodel_id: UUID = Field(foreign_key="biomodel.id", description="FK to Biomodel")
    
    # Relationships
    biomodel: Optional["Biomodel"] = Relationship(back_populates="passages")
    trials: list["Trial"] = Relationship(back_populates="passage")
