# TechConnect Schemas - Python (SQLModel)

Python implementation of the TechConnect biomedical research database schemas using [SQLModel](https://sqlmodel.tiangolo.com/).

## Features

- **Type Safety**: Full type hints with Pydantic validation
- **ORM Integration**: Direct SQLAlchemy compatibility for database operations
- **Multi-Database Support**: Works with PostgreSQL, MySQL, and SQLite
- **Relationship Mapping**: Full support for 1:1, 1:N, and inheritance relationships

## Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# With database drivers
pip install -e ".[postgres]"  # For PostgreSQL
pip install -e ".[mysql]"     # For MySQL
pip install -e ".[sqlite]"    # For SQLite async support
```

## Quick Start

### Export SQL Schema (without database connection)

Similar to `drizzle-kit export`, you can generate SQL DDL statements for any dialect:

```bash
# Export PostgreSQL schema
python export_schema.py --dialect postgres

# Export MySQL schema
python export_schema.py --dialect mysql

# Export SQLite schema
python export_schema.py --dialect sqlite

# Save to file
python export_schema.py --dialect postgres --output schema.sql
```

### Create Database Tables

```python
from database import create_db_and_tables

# SQLite
engine = create_db_and_tables("sqlite:///techconnect.db")

# PostgreSQL
engine = create_db_and_tables("postgresql://user:pass@localhost:5432/techconnect")

# MySQL
engine = create_db_and_tables("mysql+pymysql://user:pass@localhost:3306/techconnect")
```

### Working with Models

```python
from sqlmodel import Session
from models import Patient, Tumor, Biomodel
from datetime import date

# Create a session
with Session(engine) as session:
    # Create a patient
    patient = Patient(
        nhc="12345",
        sex="F",
        birth_date=date(1985, 3, 15)
    )
    session.add(patient)
    session.commit()

    # Create a tumor for the patient
    tumor = Tumor(
        biobank_code="BB-2024-001",
        classification="Adenocarcinoma",
        organ="Lung",
        patient_nhc=patient.nhc
    )
    session.add(tumor)
    session.commit()

    # Create a biomodel from the tumor
    biomodel = Biomodel(
        type="PDX",
        status="Active",
        viability=95.5,
        tumor_biobank_code=tumor.biobank_code
    )
    session.add(biomodel)
    session.commit()
```

### Querying with Relationships

```python
from sqlmodel import Session, select

with Session(engine) as session:
    # Get patient with tumors
    statement = select(Patient).where(Patient.nhc == "12345")
    patient = session.exec(statement).first()

    # Access related tumors
    for tumor in patient.tumors:
        print(f"Tumor: {tumor.biobank_code}")

        # Access biomodels for each tumor
        for biomodel in tumor.biomodels:
            print(f"  Biomodel: {biomodel.type} - {biomodel.status}")
```

## Schema Overview

### Main Entities

- **Patient** - Patient with Clinical History Number (NHC)
- **Tumor** - Tumor sample in biobank
- **LiquidBiopsy** - Liquid biopsy sample
- **Biomodel** - Biological model (PDX, PDO, LC)
- **Passage** - Passage/generation of a biomodel

### Trial Hierarchy (Inheritance)

- **Trial** - Base trial entity
  - **PDXTrial** - Patient-Derived Xenograft trial
  - **PDOTrial** - Patient-Derived Organoid trial
  - **LCTrial** - Liquid Culture trial

### PDX-Related Entities

- **Implant** - Implant in PDX trial
- **SizeRecord** - Size measurements for implants
- **Mouse** - Mouse used in PDX trial

### LC-Related Entities

- **FACS** - Flow cytometry data

### Trial-Related Entities

- **UsageRecord** - Usage tracking
- **Image** - Trial images
- **Cryopreservation** - Frozen samples
- **GenomicSequencing** - Sequencing data
- **MolecularData** - Molecular analysis data

## Entity Relationship Diagram

```
Patient (1) ──────── (N) Tumor (1) ──────── (N) Biomodel (1) ──────── (0..2) Passage
                           │                                                    │
                           └── (0..1) LiquidBiopsy                              │
                                                                                │
                                                              (1) ──────── (N) Trial
                                                                               │
                                                    ┌──────────────────────────┼──────────────────────────┐
                                                    │                          │                          │
                                                PDXTrial                  PDOTrial                   LCTrial
                                                    │                                                     │
                                        ┌───────────┼───────────┐                                        │
                                        │           │           │                                        │
                                    Implant      Mouse    SizeRecord                                   FACS
```

## Comparison with Drizzle ORM

| Feature           | Drizzle (TypeScript) | SQLModel (Python)                   |
| ----------------- | -------------------- | ----------------------------------- |
| Type Safety       | ✅                   | ✅                                  |
| Schema Definition | `pgTable()`          | `class Model(SQLModel, table=True)` |
| Relationships     | Implicit via FK      | Explicit `Relationship()`           |
| Migrations        | `drizzle-kit`        | Alembic (external)                  |
| Validation        | Zod integration      | Built-in Pydantic                   |
| API Integration   | tRPC                 | FastAPI                             |

## License

MIT
