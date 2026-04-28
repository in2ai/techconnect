# TechConnect Schemas - Python (SQLModel)

Python implementation of the TechConnect biomedical research database schemas using [SQLModel](https://sqlmodel.tiangolo.com/).

## Features

- **Type Safety**: Full type hints with Pydantic validation
- **ORM Integration**: Direct SQLAlchemy compatibility for database operations
- **Multi-Database Support**: Works with PostgreSQL, MySQL, MariaDB, and SQLite
- **Relationship Mapping**: Full support for 1:1, 1:N, and inheritance relationships

## Installation

### Workspace Install (Default - Recommended)

If you're working within the TechConnect monorepo, use the UV workspace command from the **repository root**:

```bash
# From the repository root (backend/)
uv sync --package techconnect-schemas
```

### Standalone Install (Alternative)

If you're working with this package independently (outside the monorepo), navigate to the package directory and install directly:

```bash
# Navigate to the package directory
cd packages/schemas

# Install the package in editable mode
uv pip install -e .
```

## Quick Start

### Export SQL Schema (without database connection)

```bash
# Export PostgreSQL schema
uv run --package techconnect-schemas export-schema --dialect postgresql

# Export MySQL schema
uv run --package techconnect-schemas export-schema --dialect mysql

# Export MariaDB schema
uv run --package techconnect-schemas export-schema --dialect mariadb

# Export SQLite schema
uv run --package techconnect-schemas export-schema --dialect sqlite

# Save to file
uv run --package techconnect-schemas export-schema --dialect mariadb --output schema.sql
```

> **Note:** If running directly from `packages/schemas/`, you can also use `python export_schema.py --dialect postgresql`.

### Create Database Tables

#### Via CLI (Recommended)

Initialize your database tables directly from the command line using the configured `DATABASE_URL` in your project root `.env` file:

```bash
# From the repository root (backend/)
uv run --package techconnect-schemas init-db
```

#### Via Python code

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
from models import Patient, Tumor, Biomodel, Passage
from datetime import date

# Create a session
with Session(engine) as session:
    # Create a patient
    patient = Patient(
        nhc="12345",
        sex="F",
        age=39
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
        id="BM-2024-001",
        type="PDX",
        status="active",
        success=True,
        tumor_biobank_code=tumor.biobank_code
    )
    session.add(biomodel)
    session.commit()

    # Create a passage for the biomodel. The API generates IDs as {biomodel_id}-P{x};
    # direct SQLModel usage can set the deterministic value explicitly.
    passage = Passage(
        id="BM-2024-001-P1",
        number=1,
        success=True,
        biomodel_id=biomodel.id
    )
    session.add(passage)
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
- **Passage** - Passage/generation of a biomodel and its experiment-level data

### Passage Detail Tables

- **PDXTrial** - Patient-Derived Xenograft details keyed by `passage.id`
- **PDOTrial** - Patient-Derived Organoid details keyed by `passage.id`
- **LCTrial** - Liquid Culture details keyed by `passage.id`

### PDX-Related Entities

- **Implant** - Implant in PDX trial
- **SizeRecord** - Size measurements for implants
- **Mouse** - Mouse used in PDX trial

### LC-Related Entities

- **FACS** - Flow cytometry data

### Passage-Related Entities

- **UsageRecord** - Usage tracking
- **Image** - Passage images
- **Cryopreservation** - Frozen samples
- **GenomicSequencing** - Sequencing data
- **MolecularData** - Molecular analysis data

## Entity Relationship Diagram

```text
Patient (1) ──────── (N) Tumor (1) ──────── (N) Biomodel (1) ──────── (N) Passage
                           │                                                    │
                           └── (0..1) LiquidBiopsy                              │
                                                                                │
                                                              (1) ──────── (0..2) Biomodel
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
