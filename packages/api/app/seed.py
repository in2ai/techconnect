"""Seed the database with a rich, varied sample dataset for demo charts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from uuid import UUID, uuid4

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


ORGANS = [
    "Lung", "Bladder", "Colon", "Pancreas", "Breast",
    "Soft tissue", "Bone/Hard tissue",
]

CLASSIFICATIONS = [
    "Adenocarcinoma", "Carcinoma", "Sarcoma", "Metastasis",
]

GRADES = ["G1", "G2", "G3", "G4", None]
STAGES = ["IA", "IB", "IIA", "IIB", "IIIA", "IIIB", "IV", None]
TNMS = ["T1N0M0", "T2N0M0", "T2N1M0", "T3N1M0", "T4N2M1", "T3N2M0", None]

BIOMODEL_TYPES = ["PDX", "PDO", "LC"]


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
    """Insert or update a large deterministic sample dataset."""
    create_db_and_tables()
    stats = SeedStats()

    # ─── Admin + viewer users ──────────────────────────────────────
    # Try to find existing admin by email to avoid UNIQUE constraint
    with Session(get_engine()) as session:
        existing_admin = session.query(AuthUser).filter_by(email="admin@techconnect.local").first()
        if existing_admin:
            admin_id = existing_admin.id
        else:
            admin_id = UUID("70000000-0000-0000-0000-000000000000")
            _upsert(
                session,
                AuthUser,
                admin_id,
                {
                    "id": admin_id,
                    "email": "admin@techconnect.local",
                    "password_hash": hash_password("adminpassword"),
                    "full_name": "Admin User",
                    "is_active": True,
                    "is_admin": True,
                },
                stats,
            )

        viewer_id = UUID("70000000-0000-0000-0000-000000000001")
        _upsert(
            session,
            AuthUser,
            viewer_id,
            {
                "id": viewer_id,
                "email": "viewer@techconnect.local",
                "password_hash": hash_password("viewerpassword"),
                "full_name": "Viewer Tester",
                "is_active": True,
                "is_admin": False,
            },
            stats,
        )

        # ─── Patients ────────────────────────────────────────────────
        patients: list[str] = []
        sexes = ["M", "F"]
        for i in range(25):
            nhc = f"SEED-PAT-{i+1:03d}"
            patients.append(nhc)
            _upsert(
                session,
                Patient,
                nhc,
                {
                    "nhc": nhc,
                    "sex": sexes[i % 2],
                    "age": 30 + (i * 3) % 55,
                },
                stats,
            )

        # ─── Tumors ──────────────────────────────────────────────────
        tumors: list[str] = []
        tumor_organ_map: dict[str, str] = {}
        tumor_classification_map: dict[str, str] = {}
        for i in range(80):
            code = f"SEED-TUMOR-{i+1:03d}"
            tumors.append(code)
            organ = ORGANS[i % len(ORGANS)]
            classification = CLASSIFICATIONS[i % len(CLASSIFICATIONS)]
            tumor_organ_map[code] = organ
            tumor_classification_map[code] = classification

            _upsert(
                session,
                Tumor,
                code,
                {
                    "biobank_code": code,
                    "tube_code": f"TUBE-TC-{i+1:03d}" if i % 3 != 0 else None,
                    "classification": classification,
                    "ap_diagnosis": (
                        "Moderately differentiated" if i % 4 == 0
                        else "Poorly differentiated" if i % 4 == 1
                        else "Well differentiated" if i % 4 == 2
                        else "Undifferentiated"
                    ),
                    "grade": GRADES[i % len(GRADES)],
                    "organ": organ,
                    "stage": STAGES[i % len(STAGES)],
                    "tnm": TNMS[i % len(TNMS)],
                    "intervention_date": date(2023, 1, 1) + timedelta(days=i * 7),
                    "patient_nhc": patients[i % len(patients)],
                },
                stats,
            )

        # ─── Samples ─────────────────────────────────────────────────
        for i, tumor_code in enumerate(tumors[:60]):
            sid = f"{tumor_code}-M1"
            _upsert(
                session,
                Sample,
                sid,
                {
                    "id": sid,
                    "has_serum": i % 2 == 0,
                    "has_buffy": i % 3 == 0,
                    "has_plasma": i % 4 == 0,
                    "has_tumor_tissue_oct": i % 5 == 0,
                    "has_non_tumor_tissue_oct": i % 7 == 0,
                    "obtain_date": date(2023, 2, 1) + timedelta(days=i * 5),
                    "organ": tumor_organ_map.get(tumor_code),
                    "tumor_biobank_code": tumor_code,
                },
                stats,
            )

        # ─── Biomodels ───────────────────────────────────────────────
        biomodels: list[str] = []
        for i in range(120):
            bmid = f"SEED-BIOMODEL-{i+1:03d}"
            biomodels.append(bmid)
            tumor_code = tumors[i % len(tumors)]
            btype = BIOMODEL_TYPES[i % 3]
            # varied success: ~40% true, ~30% false, ~30% null
            success = (
                True if i % 10 < 4
                else False if i % 10 < 7
                else None
            )
            _upsert(
                session,
                Biomodel,
                bmid,
                {
                    "id": bmid,
                    "type": btype,
                    "description": f"{btype} line derived from {tumor_code}",
                    "creation_date": date(2023, 3, 1) + timedelta(days=i * 3),
                    "status": i % 3 != 0,
                    "success": success,
                    "tumor_biobank_code": tumor_code,
                    "tumor_organ": tumor_organ_map.get(tumor_code),
                    "parent_passage_id": None,
                },
                stats,
            )

        # ─── Passages ────────────────────────────────────────────────
        passages: list[str] = []
        for i, bmid in enumerate(biomodels[:90]):
            pid = f"{bmid}-P1"
            passages.append(pid)
            _upsert(
                session,
                Passage,
                pid,
                {
                    "id": pid,
                    "success": i % 3 == 0,
                    "status": i % 4 != 0,
                    "preclinical_trials": (
                        "Oncology panel" if i % 5 == 0
                        else "Immunotherapy screen" if i % 5 == 1
                        else "Chemotherapy baseline" if i % 5 == 2
                        else "Radiation study" if i % 5 == 3
                        else "Combination therapy"
                    ),
                    "description": f"Passage {i+1} for {bmid}",
                    "creation_date": date(2023, 4, 1) + timedelta(days=i * 2),
                    "biobank_shipment": i % 2 == 0,
                    "biobank_arrival_date": (
                        date(2023, 4, 1) + timedelta(days=i * 2 - 5)
                        if i % 2 == 0 else None
                    ),
                    "biomodel_id": bmid,
                },
                stats,
            )

        # ─── Trials ──────────────────────────────────────────────────
        for i, pid in enumerate(passages):
            bmid = biomodels[i % len(biomodels)]
            btype = BIOMODEL_TYPES[i % 3]
            if btype == "PDX":
                _upsert(
                    session,
                    PDXTrial,
                    pid,
                    {
                        "id": pid,
                        "ffpe": i % 2 == 0,
                        "he_slide": i % 3 == 0,
                        "ihq_data": f"Ki67 and p53 batch {i+1}",
                        "has_ihq_data": i % 4 == 0,
                        "latency_weeks": 3.0 + (i % 8),
                        "similarity": 70.0 + (i % 25),
                    },
                    stats,
                )
            elif btype == "PDO":
                _upsert(
                    session,
                    PDOTrial,
                    pid,
                    {
                        "id": pid,
                        "drop_count": 4 + (i % 12),
                        "organoid_count": 50 + (i % 200),
                        "plate_type": "96-well" if i % 2 == 0 else "24-well",
                        "assessment": (
                            "Good morphology" if i % 3 == 0
                            else "Moderate growth" if i % 3 == 1
                            else "Poor viability"
                        ),
                    },
                    stats,
                )
            else:
                _upsert(
                    session,
                    LCTrial,
                    pid,
                    {
                        "id": pid,
                        "confluence": 40.0 + (i % 55),
                        "spheroids": i % 4 == 0,
                        "digestion_date": date(2023, 5, 1) + timedelta(days=i * 2),
                        "plate_type": "6-well" if i % 2 == 0 else "12-well",
                    },
                    stats,
                )

        # ─── Mice ────────────────────────────────────────────────────
        mice: list[UUID] = []
        for i in range(min(30, len(passages))):
            mid = UUID(f"50000000-0000-0000-0000-{i+1:012d}")
            mice.append(mid)
            _upsert(
                session,
                Mouse,
                mid,
                {
                    "id": mid,
                    "birth_date": date(2023, 1, 1) + timedelta(days=i * 10),
                    "death_cause": None if i % 3 != 0 else "Euthanasia",
                    "animal_facility": f"AF-{(i % 5)+1:02d}",
                    "proex": f"PROEX-{7000+i}",
                    "strain": ["NSG", "BALB/c", "C57BL/6", "NOD", "SCID"][i % 5],
                    "sex": ["male", "female"][i % 2],
                    "death_date": None if i % 3 != 0 else date(2023, 8, 1) + timedelta(days=i * 5),
                    "pdx_trial_id": passages[i],
                },
                stats,
            )

        # ─── Implants ────────────────────────────────────────────────
        implants: list[UUID] = []
        for i, mid in enumerate(mice):
            iid = UUID(f"51000000-0000-0000-0000-{i+1:012d}")
            implants.append(iid)
            _upsert(
                session,
                Implant,
                iid,
                {
                    "id": iid,
                    "implant_location": ["Flank", "Mammary fat pad", "Subrenal", "Orthotopic"][i % 4],
                    "type": ["Subcutaneous", "Orthotopic"][i % 2],
                    "mouse_id": mid,
                },
                stats,
            )

        # ─── Measures ────────────────────────────────────────────────
        for i, iid in enumerate(implants):
            for j in range(3):
                mid = UUID(f"52000000-0000-0000-0000-{(i*3+j+1):012d}")
                _upsert(
                    session,
                    Measure,
                    mid,
                    {
                        "id": mid,
                        "measure_date": date(2023, 6, 1) + timedelta(days=i * 5 + j * 2),
                        "measure_value": 100.0 + (i * 15) + (j * 30),
                        "implant_id": iid,
                    },
                    stats,
                )

        # ─── FACS ────────────────────────────────────────────────────
        # FACS has UNIQUE on lc_trial_id — only create one per LC passage
        # passages[i] belongs to biomodels[i]; biomodel i is LC when i%3==2
        lc_passages = [passages[i] for i in range(len(passages)) if i % 3 == 2]
        for i, pid in enumerate(lc_passages[:15]):
            fid = UUID(f"53000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                FACS,
                fid,
                {
                    "id": fid,
                    "measure": ["FITC", "PE", "APC", "PerCP"][i % 4],
                    "measure_value": 1.0 + (i % 10) * 0.8,
                    "lc_trial_id": pid,
                },
                stats,
            )

        # ─── Usage Records ───────────────────────────────────────────
        for i in range(40):
            uid = f"UR-{i+1:03d}"
            _upsert(
                session,
                UsageRecord,
                uid,
                {
                    "id": uid,
                    "record_type": [
                        "Drug treatment", "Organoid assay", "Media optimization",
                        "Cryopreservation", "Sequencing", "Imaging"
                    ][i % 6],
                    "description": f"Usage record {i+1}",
                    "record_date": date(2023, 7, 1) + timedelta(days=i * 3),
                    "passage_id": passages[i % len(passages)] if passages else "",
                },
                stats,
            )

        # ─── Images ──────────────────────────────────────────────────
        for i in range(25):
            img_id = UUID(f"60000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                Image,
                img_id,
                {
                    "id": img_id,
                    "image_date": date(2023, 8, 1) + timedelta(days=i * 4),
                    "scanner_magnification": [10, 20, 40][i % 3],
                    "type": ["Histology", "Fluorescence", "Brightfield"][i % 3],
                    "ap_review": i % 2 == 0,
                    "passage_id": passages[i % len(passages)] if passages else "",
                },
                stats,
            )

        # ─── Cryopreservations ───────────────────────────────────────
        for i in range(20):
            cid = UUID(f"61000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                Cryopreservation,
                cid,
                {
                    "id": cid,
                    "location": f"LN2-Tank-{(i % 10)+1:02d}",
                    "cryo_date": date(2023, 9, 1) + timedelta(days=i * 6),
                    "vial_count": 5 + (i % 20),
                    "passage_id": passages[i % len(passages)] if passages else "",
                },
                stats,
            )

        # ─── Genomic / Molecular (trial-level) ───────────────────────
        for i in range(30):
            gid = UUID(f"62000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                TrialGenomicSequencing,
                gid,
                {
                    "id": gid,
                    "has_data": i % 3 != 0,
                    "data": f"WES batch {i+1}" if i % 3 != 0 else None,
                    "passage_id": passages[i % len(passages)] if passages else None,
                },
                stats,
            )
            mid = UUID(f"63000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                TrialMolecularData,
                mid,
                {
                    "id": mid,
                    "has_data": i % 4 != 0,
                    "data": f"qPCR panel {i+1}" if i % 4 != 0 else None,
                    "passage_id": passages[i % len(passages)] if passages else None,
                },
                stats,
            )

        # ─── Genomic / Molecular (tumor-level) ───────────────────────
        for i in range(40):
            tgid = UUID(f"64000000-0000-0000-0000-{i+1:012d}")
            tumor = tumors[i % len(tumors)]
            _upsert(
                session,
                TumorGenomicSequencing,
                tgid,
                {
                    "id": tgid,
                    "has_data": i % 3 != 0,
                    "data": f"Tumor WES {i+1}" if i % 3 != 0 else None,
                    "tumor_biobank_code": tumor,
                },
                stats,
            )
            tmid = UUID(f"65000000-0000-0000-0000-{i+1:012d}")
            _upsert(
                session,
                TumorMolecularData,
                tmid,
                {
                    "id": tmid,
                    "has_data": i % 4 != 0,
                    "data": f"Tumor IHC {i+1}" if i % 4 != 0 else None,
                    "tumor_biobank_code": tumor,
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
