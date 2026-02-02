"""LiquidBiopsy model - Entity representing a liquid biopsy sample."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .tumor import Tumor


class LiquidBiopsy(SQLModel, table=True):
    """
    LiquidBiopsy entity representing a liquid biopsy sample.
    
    Attributes:
        id: Unique identifier (UUID)
        has_serum: Whether serum is available
        has_buffy: Whether buffy coat is available
        has_plasma: Whether plasma is available
        tumor_biobank_code: FK to Tumor (optional)
        biopsy_date: Date of the biopsy
    """
    
    __tablename__ = "liquid_biopsy"
    
    # Primary key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Fields
    has_serum: Optional[bool] = Field(default=None)
    has_buffy: Optional[bool] = Field(default=None)
    has_plasma: Optional[bool] = Field(default=None)
    biopsy_date: Union[date, None] = Field(default=None)
    
    # Foreign keys (optional - 0..1:1 relationship with Tumor)
    tumor_biobank_code: Optional[str] = Field(
        default=None, 
        foreign_key="tumor.biobank_code",
        description="FK to Tumor"
    )
    
    # Relationships
    tumor: Optional["Tumor"] = Relationship(back_populates="liquid_biopsies")
