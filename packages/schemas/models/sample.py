"""Sample model - Entity representing a liquid biopsy sample."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .tumor import Tumor


class Sample(SQLModel, table=True):
    """
    Sample entity representing a liquid biopsy sample.
    
    Attributes:
        id: Unique identifier generated from the tumor biobank code
        has_serum: Whether serum is available
        has_buffy: Whether buffy coat is available
        has_plasma: Whether plasma is available
        has_tumor_tissue_oct: Whether OCT tumor tissue is available
        has_non_tumor_tissue_oct: Whether OCT non-tumor tissue is available
        obtain_date: Date of obtaining the sample
        organ: Organ of the sample
        tumor_biobank_code: FK to Tumor (optional)
    """
    
    __tablename__ = "sample"
    
    # Primary key
    id: str = Field(default="", primary_key=True, max_length=150)
    
    # Fields
    has_serum: Optional[bool] = Field(default=None)
    has_buffy: Optional[bool] = Field(default=None)
    has_plasma: Optional[bool] = Field(default=None)
    has_tumor_tissue_oct: Optional[bool] = Field(default=None)
    has_non_tumor_tissue_oct: Optional[bool] = Field(default=None)
    obtain_date: Union[date, None] = Field(default=None)
    organ: Optional[str] = Field(default=None)
    
    # Foreign keys (optional - 0..1:1 relationship with Tumor)
    tumor_biobank_code: Optional[str] = Field(
        default=None, 
        foreign_key="tumor.biobank_code",
        description="FK to Tumor"
    )
    
    # Relationships
    tumor: Optional["Tumor"] = Relationship(back_populates="samples")
