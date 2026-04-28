"""Seed the database with a coherent sample dataset."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID

from sqlmodel import SQLModel, Session

from app.core.database import create_db_and_tables, get_engine
from app.core.security import hash_password
from models import (
    AuthUser,
    FACS,
    Biomodel,
    Cryopreservation,
    Image,
    Implant,
    LCTrial,
    Mouse,
    Passage,
    Patient,
    PDOTrial,
    PDXTrial,
    Sample,
    Tumor,
    UsageRecord,
    Measure,
    TrialGenomicSequencing,
    TrialMolecularData,
    TumorGenomicSequencing,
    TumorMolecularData,
)


@dataclass
class SeedStats:
    created: int = 0
    updated: int = 0


def _upsert(
    session: Session,
    model: type[SQLModel],
    primary_key: str | UUID,
    payload: dict[str, object],
    stats: SeedStats,
) -> None:
    with session.no_autoflush:
        existing = session.get(model, primary_key)
    if existing is None:
        session.add(model.model_validate(payload))
        session.flush()
        stats.created += 1
        return

    existing.sqlmodel_update(payload)
    session.add(existing)
    session.flush()
    stats.updated += 1


def seed_database() -> SeedStats:
    """Insert or update deterministic sample rows across all entities."""
    create_db_and_tables()
    stats = SeedStats()

    patient_1 = "SEED-PAT-001"
    patient_2 = "SEED-PAT-002"
    tumor_1 = "SEED-TUMOR-001"

    sample_id = f"{tumor_1}-M1"
    biomodel_id = "SEED-BIOMODEL-001"
    biomodel_pdo_id = "SEED-BIOMODEL-002"
    biomodel_lc_id = "SEED-BIOMODEL-003"
    passage_pdx_id = f"{biomodel_id}-P1"
    passage_pdo_id = f"{biomodel_pdo_id}-P1"
    passage_lc_id = f"{biomodel_lc_id}-P1"

    implant_id = UUID("50000000-0000-0000-0000-000000000001")
    size_record_id = UUID("50000000-0000-0000-0000-000000000002")
    mouse_id = UUID("50000000-0000-0000-0000-000000000003")
    facs_id = UUID("50000000-0000-0000-0000-000000000004")

    usage_pdx_id = UUID("60000000-0000-0000-0000-000000000001")
    usage_pdo_id = UUID("60000000-0000-0000-0000-000000000002")
    usage_lc_id = UUID("60000000-0000-0000-0000-000000000003")
    image_id = UUID("60000000-0000-0000-0000-000000000004")
    cryo_id = UUID("60000000-0000-0000-0000-000000000005")
    genomic_id = UUID("60000000-0000-0000-0000-000000000006")
    molecular_id = UUID("60000000-0000-0000-0000-000000000007")
    viewer_user_id = UUID("70000000-0000-0000-0000-000000000001")

    with Session(get_engine()) as session:
        _upsert(
            session,
            Patient,
            patient_1,
            {
                "nhc": patient_1,
                "sex": "F",
                "age": 44,
            },
            stats,
        )
        _upsert(
            session,
            Patient,
            patient_2,
            {
                "nhc": patient_2,
                "sex": "M",
                "age": 48,
            },
            stats,
        )
        _upsert(
            session,
            Tumor,
            tumor_1,
            {
                "biobank_code": tumor_1,
                "tube_code": "TUBE-TC-001",
                "classification": "Adenocarcinoma",
                "ap_diagnosis": "Moderately differentiated",
                "grade": "G2",
                "organ": "Lung",
                "stage": "IIA",
                "tnm": "T2N0M0",
                "intervention_date": date(2024, 1, 25),
                "patient_nhc": patient_1,
            },
            stats,
        )
        _upsert(
            session,
            Sample,
            sample_id,
            {
                "id": sample_id,
                "has_serum": True,
                "has_buffy": True,
                "has_plasma": True,
                "has_tumor_tissue_oct": True,
                "has_non_tumor_tissue_oct": False,
                "obtain_date": date(2024, 2, 1),
                "organ": "Lung",
                "tumor_biobank_code": tumor_1,
            },
            stats,
        )
        _upsert(
            session,
            Biomodel,
            biomodel_id,
            {
                "id": biomodel_id,
                "type": "PDX",
                "description": "Primary xenograft line",
                "creation_date": date(2024, 2, 10),
                "status": "active",
                "success": True,
                "tumor_biobank_code": tumor_1,
                "parent_passage_id": None,
            },
            stats,
        )
        _upsert(
            session,
            Biomodel,
            biomodel_pdo_id,
            {
                "id": biomodel_pdo_id,
                "type": "PDO",
                "description": "Primary organoid line",
                "creation_date": date(2024, 2, 12),
                "status": "active",
                "success": True,
                "tumor_biobank_code": tumor_1,
                "parent_passage_id": None,
            },
            stats,
        )
        _upsert(
            session,
            Biomodel,
            biomodel_lc_id,
            {
                "id": biomodel_lc_id,
                "type": "LC",
                "description": "Primary liquid culture line",
                "creation_date": date(2024, 2, 14),
                "status": "inactive",
                "success": False,
                "tumor_biobank_code": tumor_1,
                "parent_passage_id": None,
            },
            stats,
        )
        _upsert(
            session,
            Passage,
            passage_pdx_id,
            {
                "id": passage_pdx_id,
                "number": 1,
                "success": True,
                "status": True,
                "preclinical_trials": "Pilot oncology panel",
                "description": "PDX efficacy baseline",
                "creation_date": date(2024, 3, 5),
                "biobank_shipment": True,
                "biobank_arrival_date": date(2024, 3, 1),
                "biomodel_id": biomodel_id,
            },
            stats,
        )
        _upsert(
            session,
            Passage,
            passage_pdo_id,
            {
                "id": passage_pdo_id,
                "number": 1,
                "success": True,
                "description": "PDO drug screen",
                "creation_date": date(2024, 3, 12),
                "biobank_shipment": False,
                "biobank_arrival_date": None,
                "biomodel_id": biomodel_pdo_id,
            },
            stats,
        )
        _upsert(
            session,
            Passage,
            passage_lc_id,
            {
                "id": passage_lc_id,
                "number": 1,
                "success": False,
                "description": "LC confluence optimization",
                "creation_date": date(2024, 3, 20),
                "biobank_shipment": False,
                "biobank_arrival_date": None,
                "biomodel_id": biomodel_lc_id,
            },
            stats,
        )

        _upsert(
            session,
            PDXTrial,
            passage_pdx_id,
            {
                "id": passage_pdx_id,
                "ffpe": True,
                "he_slide": True,
                "ihq_data": "Ki67 and p53 available",
                "has_ihq_data": True,
                "latency_weeks": 6.5,
                "similarity": 85.0,
            },
            stats,
        )
        _upsert(
            session,
            PDOTrial,
            passage_pdo_id,
            {
                "id": passage_pdo_id,
                "drop_count": 8,
                "frozen_organoid_count": 40,
                "organoid_count": 126,
                "plate_type": "96-well",
                "assessment": "Good morphology",
            },
            stats,
        )
        _upsert(
            session,
            LCTrial,
            passage_lc_id,
            {
                "id": passage_lc_id,
                "confluence": 73.5,
                "spheroids": False,
                "digestion_date": date(2024, 4, 2),
                "plate_type": "24-well",
            },
            stats,
        )

        _upsert(
            session,
            Mouse,
            mouse_id,
            {
                "id": mouse_id,
                "birth_date": date(2023, 11, 1),
                "death_cause": None,
                "animal_facility": "AF-02",
                "proex": "PROEX-7781",
                "strain": "NSG",
                "sex": "female",
                "death_date": None,
                "pdx_trial_id": passage_pdx_id,
            },
            stats,
        )
        _upsert(
            session,
            Implant,
            implant_id,
            {
                "id": implant_id,
                "implant_location": "Flank",
                "type": "Subcutaneous",
                "mouse_id": mouse_id,
            },
            stats,
        )
        _upsert(
            session,
            Measure,
            size_record_id,
            {
                "id": size_record_id,
                "measure_date": date(2024, 4, 5),
                "measure_value": 365.0,
                "implant_id": implant_id,
            },
            stats,
        )
        _upsert(
            session,
            FACS,
            facs_id,
            {
                "id": facs_id,
                "measure": "FITC",
                "measure_value": 4.5,
                "lc_trial_id": passage_lc_id,
            },
            stats,
        )

        _upsert(
            session,
            UsageRecord,
            usage_pdx_id,
            {
                "id": usage_pdx_id,
                "record_type": "Drug treatment",
                "description": "Cohort A dosing",
                "record_date": date(2024, 4, 10),
                "passage_id": passage_pdx_id,
            },
            stats,
        )
        _upsert(
            session,
            UsageRecord,
            usage_pdo_id,
            {
                "id": usage_pdo_id,
                "record_type": "Organoid assay",
                "description": "Growth curve acquisition",
                "record_date": date(2024, 4, 15),
                "passage_id": passage_pdo_id,
            },
            stats,
        )
        _upsert(
            session,
            UsageRecord,
            usage_lc_id,
            {
                "id": usage_lc_id,
                "record_type": "Media optimization",
                "description": "Serum concentration test",
                "record_date": date(2024, 4, 18),
                "passage_id": passage_lc_id,
            },
            stats,
        )
        _upsert(
            session,
            Image,
            image_id,
            {
                "id": image_id,
                "image_date": date(2024, 4, 11),
                "scanner_magnification": 20,
                "type": "Histology",
                "ap_review": True,
                "passage_id": passage_pdx_id,
            },
            stats,
        )
        _upsert(
            session,
            Cryopreservation,
            cryo_id,
            {
                "id": cryo_id,
                "location": "LN2-Tank-07",
                "cryo_date": date(2024, 4, 19),
                "vial_count": 12,
                "passage_id": passage_pdo_id,
            },
            stats,
        )
        _upsert(
            session,
            TrialGenomicSequencing,
            genomic_id,
            {
                "id": genomic_id,
                "annotations": "Some annotations",
                "passage_id": passage_pdx_id,
            },
            stats,
        )
        _upsert(
            session,
            TrialMolecularData,
            molecular_id,
            {
                "id": molecular_id,
                "annotations": "Some annotations",
                "passage_id": passage_lc_id,
            },
            stats,
        )
        
        tumor_genomic_id = UUID("60000000-0000-0000-0000-000000000008")
        tumor_molecular_id = UUID("60000000-0000-0000-0000-000000000009")
        
        _upsert(
            session,
            TumorGenomicSequencing,
            tumor_genomic_id,
            {
                "id": tumor_genomic_id,
                "has_data": True,
                "data": "Sample data",
                "tumor_biobank_code": tumor_1,
            },
            stats,
        )
        _upsert(
            session,
            TumorMolecularData,
            tumor_molecular_id,
            {
                "id": tumor_molecular_id,
                "has_data": True,
                "data": "Sample data",
                "tumor_biobank_code": tumor_1,
            },
            stats,
        )

        _upsert(
            session,
            AuthUser,
            viewer_user_id,
            {
                "id": viewer_user_id,
                "email": "viewer@techconnect.local",
                "password_hash": hash_password("viewerpassword"),
                "full_name": "Viewer Tester",
                "is_active": True,
                "is_admin": False,
            },
            stats,
        )

        session.commit()

    return stats


def main() -> None:
    stats = seed_database()
    print(f"Seed complete: created={stats.created}, updated={stats.updated}")


if __name__ == "__main__":
    main()

