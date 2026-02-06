"""Patient model - Main entity representing a patient in the system."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .tumor import Tumor


class Patient(SQLModel, table=True):
    """
    Patient entity representing a patient in the clinical system.
    
    Attributes:
        nhc: Clinical History Number (primary key)
        sex: Patient's biological sex
        birth_date: Patient's date of birth
    """
    
    __tablename__ = "patient"
    
    # Primary key
    nhc: str = Field(primary_key=True, description="Clinical History Number")
    
    # Fields
    sex: Optional[str] = Field(default=None, max_length=50)
    birth_date: Union[date, None] = Field(default=None)
    
    # Relationships (1:N with Tumor - Patient presents multiple tumors)
    tumors: list["Tumor"] = Relationship(back_populates="patient")
