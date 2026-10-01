# TechConnect Schemas

Shared SQLModel schema package for the TechConnect biomedical research application.

## What this package does

- defines the database tables used by the API
- exports SQL DDL for PostgreSQL, MySQL/MariaDB, and SQLite
- creates database tables directly from the schema definitions
- generates TypeScript interfaces consumed by the Angular frontend

## Installation

From the repository root:

```bash
uv sync --package techconnect-schemas
```

From `packages/schemas/` directly:

```bash
uv sync --extra dev
```

## Common Commands

```bash
# Export SQL DDL
uv run --package techconnect-schemas export-schema --dialect postgresql
uv run --package techconnect-schemas export-schema --dialect mysql
uv run --package techconnect-schemas export-schema --dialect mariadb
uv run --package techconnect-schemas export-schema --dialect sqlite

# Export TypeScript interfaces for the frontend
uv run --package techconnect-schemas export-schema --format typescript --output frontend/src/app/generated/models.ts

# Initialize tables using DATABASE_URL
uv run --package techconnect-schemas init-db
```

## Model Groups

### Core domain

- `Patient`
- `Tumor`
- `Sample`
- `Biomodel`
- `Passage`

### Tumor and passage detail tables

- `TumorGenomicSequencing`
- `TumorMolecularData`
- `TrialGenomicSequencing`
- `TrialMolecularData`

### Passage subtype tables

- `PDXTrial`
- `PDOTrial`
- `LCTrial`

### PDX-related tables

- `Mouse`
- `Implant`
- `Measure`

### Passage support tables

- `UsageRecord`
- `Image`
- `Cryopreservation`
- `FACS`

### Auth persistence tables

- `AuthUser`
- `AuthSession`

## Relationship Overview

```text
Patient (1) ──────── (N) Tumor
                      ├── (N) Sample
                      ├── (N) Biomodel ──────── (N) Passage
                      │                           ├── (0..1) PDXTrial ──────── (N) Mouse ──────── (N) Implant ──────── (N) Measure
                      │                           ├── (0..1) PDOTrial
                      │                           ├── (0..1) LCTrial ──────── (0..1) FACS
                      │                           ├── (N) UsageRecord
                      │                           ├── (N) Image
                      │                           ├── (N) Cryopreservation
                      │                           ├── (0..1) TrialGenomicSequencing
                      │                           └── (0..1) TrialMolecularData
                      ├── (0..1) TumorGenomicSequencing
                      └── (0..1) TumorMolecularData

Passage (1) ──────── (N) Biomodel (child biomodels via `parent_passage_id`)
```

## Working with Models

```python
from sqlmodel import Session, select
from models import Biomodel, Passage, Patient, Tumor

with Session(engine) as session:
    patient = Patient(nhc="12345", sex="F", age=39)
    session.add(patient)
    session.commit()

    tumor = Tumor(biobank_code="BB-2024-001", organ="Lung", patient_nhc=patient.nhc)
    session.add(tumor)
    session.commit()

    biomodel = Biomodel(id="BM-2024-001", type="PDX", success=True, tumor_biobank_code=tumor.biobank_code)
    session.add(biomodel)
    session.commit()

    passage = Passage(id="BM-2024-001-P1", biomodel_id=biomodel.id)
    session.add(passage)
    session.commit()

    stored_patient = session.exec(select(Patient).where(Patient.nhc == "12345")).first()
```

## Important Notes

- Most non-primary-key fields in the schema are nullable by design.
- `Biomodel.tumor_organ`, `Measure.tumor_volume`, and `Mouse.latency_weeks` are computed properties, not persisted columns.
- `export-schema --format typescript` iterates over `models.__all__`, so it exports all currently listed models, including computed fields and the auth persistence models.
- The frontend auth flow uses dedicated auth DTOs under `frontend/src/app/core/models/auth.models.ts` for request/response handling.

## Related Files

- `models/` - SQLModel table definitions
- `export_schema.py` - SQL/TypeScript export CLI
- `database.py` - database initialization entry point
- `DATA_MODEL_DIAGRAM.md` - ER diagram and storage notes
