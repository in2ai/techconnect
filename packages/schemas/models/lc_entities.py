"""LC-related entities - FACS."""

from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .trial import LCTrial


class FACS(SQLModel, table=True):
    """
    FACS entity - Fluorescence-Activated Cell Sorting data.
    
    Attributes:
        id: Unique identifier (UUID)
        measure: Measure string
        measure_value: Value of the measure
        lc_trial_id: FK to LCTrial (optional - 1:0..1 relationship)
    """
    
    __tablename__ = "facs"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    measure: Optional[str] = Field(default=None, max_length=100)
    measure_value: Optional[float] = Field(default=None)
    
    # Foreign keys (optional - 1:0..1 relationship with LCTrial)
    lc_trial_id: Optional[str] = Field(
        default=None,
        foreign_key="lc_trial.id",
        description="FK to LCTrial",
        unique=True
    )
    
    # Relationships
    lc_trial: Optional["LCTrial"] = Relationship(back_populates="facs")
