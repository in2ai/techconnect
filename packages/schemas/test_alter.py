from sqlmodel import SQLModel, Field
from sqlalchemy import ForeignKey
import uuid

class BiomodelTest(SQLModel, table=True):
    id: uuid.UUID = Field(primary_key=True)
    parent_passage_id: uuid.UUID | None = Field(
        default=None,
        sa_column_args=[ForeignKey("passagetest.id", use_alter=True, name="fk_biomodel_passage")]
    )

class PassageTest(SQLModel, table=True):
    id: uuid.UUID = Field(primary_key=True)
    biomodel_id: uuid.UUID = Field(foreign_key="biomodeltest.id")

from sqlalchemy.schema import CreateTable
print(CreateTable(BiomodelTest.__table__))
