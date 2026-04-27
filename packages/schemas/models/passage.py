"""Passage model - Entity representing a passage of a biomodel."""

from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import ForeignKey

if TYPE_CHECKING:
    from .biomodel import Biomodel
    from .trial import Trial


class Passage(SQLModel, table=True):
    """
    Passage entity representing a passage (generation) of a biomodel.
    
    Attributes:
        id: Unique identifier (UUID)
        number: Passage number
        description: General description
        biomodel_id: FK to Biomodel
    """
    
    __tablename__ = "passage"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    number: Optional[int] = Field(default=None)
    description: Optional[str] = Field(default=None)  # text field
    
    # Foreign keys (required - 1:0..2 relationship with Biomodel)
    biomodel_id: str = Field(foreign_key="biomodel.id", description="FK to Biomodel")
    
    parent_trial_id: Optional[UUID] = Field(
        default=None,
        sa_column_args=[ForeignKey("trial.id", name="fk_passage_parent_trial_id", use_alter=True)],
        description="FK to parent Trial"
    )
    
    # Relationships
    biomodel: Optional["Biomodel"] = Relationship(back_populates="passages")
    trials: list["Trial"] = Relationship(
        back_populates="passage",
        sa_relationship_kwargs={"foreign_keys": "[Trial.passage_id]"}
    )
    parent_trial: Optional["Trial"] = Relationship(
        back_populates="child_passages",
        sa_relationship_kwargs={"foreign_keys": "[Passage.parent_trial_id]"}
    )
