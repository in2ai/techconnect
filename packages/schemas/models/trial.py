"""Passage subtype models - PDXTrial, PDOTrial, and LCTrial details."""

from datetime import date
from typing import TYPE_CHECKING, Optional, Union

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .passage import Passage
    from .pdx_entities import Mouse
    from .lc_entities import FACS


class PDXTrial(SQLModel, table=True):
    """PDXTrial details associated with a passage."""

    __tablename__ = "pdx_trial"

    # Primary key (references Passage)
    id: str = Field(foreign_key="passage.id", primary_key=True)

    # Fields
    ffpe: Optional[bool] = Field(default=None)
    he_slide: Optional[bool] = Field(default=None)
    ihq_data: Optional[str] = Field(default=None)  # text field
    has_ihq_data: Optional[bool] = Field(default=None)
    latency_weeks: Optional[float] = Field(default=None)
    similarity: Optional[float] = Field(default=None)

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="pdx_trial")
    mouse: Optional["Mouse"] = Relationship(back_populates="pdx_trial")


class PDOTrial(SQLModel, table=True):
    """PDOTrial details associated with a passage."""

    __tablename__ = "pdo_trial"

    # Primary key (references Passage)
    id: str = Field(foreign_key="passage.id", primary_key=True)

    # Fields
    drop_count: Optional[int] = Field(default=None)
    frozen_organoid_count: Optional[int] = Field(default=None)
    organoid_count: Optional[int] = Field(default=None)
    plate_type: Optional[str] = Field(default=None, max_length=50)
    assessment: Optional[str] = Field(default=None, max_length=100)

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="pdo_trial")


class LCTrial(SQLModel, table=True):
    """LCTrial details associated with a passage."""

    __tablename__ = "lc_trial"

    # Primary key (references Passage)
    id: str = Field(foreign_key="passage.id", primary_key=True)

    # Fields
    confluence: Optional[float] = Field(default=None)
    spheroids: Optional[bool] = Field(default=None)
    digestion_date: Union[date, None] = Field(default=None)
    plate_type: Optional[str] = Field(default=None, max_length=50)

    # Relationships
    passage: Optional["Passage"] = Relationship(back_populates="lc_trial")
    facs: Optional["FACS"] = Relationship(back_populates="lc_trial")
