"""Shared entity catalog used by CRUD and dataset transfer flows."""

from sqlmodel import SQLModel

from models import (
    Biomodel,
    Cryopreservation,
    FACS,
    Image,
    Implant,
    LCTrial,
    Measure,
    Mouse,
    Passage,
    Patient,
    PDOTrial,
    PDXTrial,
    Sample,
    TrialGenomicSequencing,
    TrialMolecularData,
    Tumor,
    TumorGenomicSequencing,
    TumorMolecularData,
    UsageRecord,
)

ENTITY_ROUTERS: tuple[tuple[type[SQLModel], str, str], ...] = (
    (Patient, 'patients', 'Patients'),
    (Tumor, 'tumors', 'Tumors'),
    (Sample, 'samples', 'Samples'),
    (Biomodel, 'biomodels', 'Biomodels'),
    (Passage, 'passages', 'Passages'),
    (PDXTrial, 'pdx-trials', 'PDX Trials'),
    (PDOTrial, 'pdo-trials', 'PDO Trials'),
    (LCTrial, 'lc-trials', 'LC Trials'),
    (Mouse, 'mice', 'Mice'),
    (Implant, 'implants', 'Implants'),
    (Measure, 'measures', 'Measures'),
    (FACS, 'facs', 'FACS'),
    (UsageRecord, 'usage-records', 'Usage Records'),
    (Image, 'images', 'Images'),
    (Cryopreservation, 'cryopreservations', 'Cryopreservations'),
    (TrialGenomicSequencing, 'trial-genomic-sequencings', 'Trial Genomic Sequencings'),
    (TrialMolecularData, 'trial-molecular-data', 'Trial Molecular Data'),
    (TumorGenomicSequencing, 'tumor-genomic-sequencings', 'Tumor Genomic Sequencings'),
    (TumorMolecularData, 'tumor-molecular-data', 'Tumor Molecular Data'),
)