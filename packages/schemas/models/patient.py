"""Patient model - Main entity representing a patient in the system."""

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
        age: Patient's age in years
    """
    
    __tablename__ = "patient"
    
    # Primary key
    nhc: str = Field(primary_key=True, max_length=50, description="Clinical History Number")
    
    # Fields
    sex: Optional[str] = Field(default=None, max_length=50)
    age: Union[int, None] = Field(default=None, ge=0)
    
    # Relationships (1:N with Tumor - Patient presents multiple tumors)
    tumors: list["Tumor"] = Relationship(back_populates="patient")
