import {
  mysqlTable,
  varchar,
  text,
  boolean,
  int,
  date,
  float,
} from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

// ============================================
// MAIN ENTITIES
// ============================================

// Patient
export const patient = mysqlTable('patient', {
  nhc: varchar('nhc', { length: 50 }).primaryKey(),
  sex: varchar('sex', { length: 20 }),
  birthDate: date('birth_date'),
});

// Tumor
export const tumor = mysqlTable('tumor', {
  biobankCode: varchar('biobank_code', { length: 100 }).primaryKey(),
  labCode: varchar('lab_code', { length: 100 }),
  classification: varchar('classification', { length: 100 }),
  apObservation: text('ap_observation'),
  grade: varchar('grade', { length: 50 }),
  organ: varchar('organ', { length: 100 }),
  status: varchar('status', { length: 50 }),
  tnm: varchar('tnm', { length: 50 }),
  patientNhc: varchar('patient_nhc', { length: 50 }).notNull().references(() => patient.nhc),
  registrationDate: date('registration_date'),
  operationDate: date('operation_date'),
});

// LiquidBiopsy
export const liquidBiopsy = mysqlTable('liquid_biopsy', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  hasSerum: boolean('has_serum'),
  hasBuffy: boolean('has_buffy'),
  hasPlasma: boolean('has_plasma'),
  tumorBiobankCode: varchar('tumor_biobank_code', { length: 100 }).references(() => tumor.biobankCode),
  biopsyDate: date('biopsy_date'),
});

// Biomodel
export const biomodel = mysqlTable('biomodel', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  type: varchar('type', { length: 100 }),
  preclinicalTrials: text('preclinical_trials'),
  description: text('description'),
  creationDate: date('creation_date'),
  status: varchar('status', { length: 50 }),
  progresses: boolean('progresses'),
  viability: float('viability'),
  tumorBiobankCode: varchar('tumor_biobank_code', { length: 100 }).notNull().references(() => tumor.biobankCode),
});

// Passage
export const passage = mysqlTable('passage', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  number: int('number'),
  status: varchar('status', { length: 50 }),
  sIndex: float('s_index'),
  viability: float('viability'),
  description: text('description'),
  biomodelId: varchar('biomodel_id', { length: 36 }).notNull().references(() => biomodel.id),
});

// ============================================
// TRIAL AND SUBTYPES (Is_a Inheritance)
// ============================================

// Trial (parent entity)
export const trial = mysqlTable('trial', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  success: boolean('success'),
  description: text('description'),
  creationDate: date('creation_date'),
  biobankShipment: boolean('biobank_shipment'),
  biobankArrivalDate: date('biobank_arrival_date'),
  passageId: varchar('passage_id', { length: 36 }).notNull().references(() => passage.id),
});

// PDXTrial (Trial subtype)
export const pdxTrial = mysqlTable('pdx_trial', {
  id: varchar('id', { length: 36 }).primaryKey().references(() => trial.id),
  ffpe: boolean('ffpe'),
  heSlide: boolean('he_slide'),
  ihqData: text('ihq_data'),
  latencyWeeks: int('latency_weeks'),
  sIndex: float('s_index'),
  scannerMagnification: varchar('scanner_magnification', { length: 100 }),
});

// PDOTrial (Trial subtype)
export const pdoTrial = mysqlTable('pdo_trial', {
  id: varchar('id', { length: 36 }).primaryKey().references(() => trial.id),
  dropCount: int('drop_count'),
  frozenOrganoidCount: int('frozen_organoid_count'),
  organoidCount: int('organoid_count'),
  plateType: varchar('plate_type', { length: 100 }),
  visualizationDay: int('visualization_day'),
  assessment: varchar('assessment', { length: 100 }),
});

// LCTrial (Trial subtype)
export const lcTrial = mysqlTable('lc_trial', {
  id: varchar('id', { length: 36 }).primaryKey().references(() => trial.id),
  confluence: float('confluence'),
  spheroids: boolean('spheroids'),
  digestionDate: date('digestion_date'),
  cellLine: varchar('cell_line', { length: 100 }),
  plateType: varchar('plate_type', { length: 100 }),
});

// ============================================
// ENTITIES RELATED TO PDX TRIAL
// ============================================

// Implant
export const implant = mysqlTable('implant', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  implantLocation: varchar('implant_location', { length: 100 }),
  type: varchar('type', { length: 100 }),
  sizeLimit: float('size_limit'),
  pdxTrialId: varchar('pdx_trial_id', { length: 36 }).notNull().references(() => pdxTrial.id),
});

// SizeRecord
export const sizeRecord = mysqlTable('size_record', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  weekNumber: int('week_number'),
  initialSizeMm3: float('initial_size_mm3'),
  finalSizeMm3: float('final_size_mm3'),
  implantId: varchar('implant_id', { length: 36 }).notNull().references(() => implant.id),
});

// Mouse
export const mouse = mysqlTable('mouse', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  birthDate: date('birth_date'),
  deathCause: varchar('death_cause', { length: 255 }),
  animalFacility: varchar('animal_facility', { length: 100 }),
  proex: varchar('proex', { length: 100 }),
  strain: varchar('strain', { length: 100 }),
  sex: varchar('sex', { length: 20 }),
  deathDate: date('death_date'),
  pdxTrialId: varchar('pdx_trial_id', { length: 36 }).notNull().references(() => pdxTrial.id),
});

// ============================================
// ENTITIES RELATED TO LC TRIAL
// ============================================

// FACS
export const facs = mysqlTable('facs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  lcTrialId: varchar('lc_trial_id', { length: 36 }).references(() => lcTrial.id),
});

// ============================================
// ENTITIES RELATED TO TRIAL
// ============================================

// UsageRecord
export const usageRecord = mysqlTable('usage_record', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  usageType: varchar('usage_type', { length: 100 }),
  description: text('description'),
  date: date('date'),
  trialId: varchar('trial_id', { length: 36 }).notNull().references(() => trial.id),
});

// Image
export const image = mysqlTable('image', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  date: date('date'),
  type: varchar('type', { length: 100 }),
  apReview: text('ap_review'),
  trialId: varchar('trial_id', { length: 36 }).notNull().references(() => trial.id),
});

// Cryopreservation
export const cryopreservation = mysqlTable('cryopreservation', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  location: varchar('location', { length: 100 }),
  date: date('date'),
  vialCount: int('vial_count'),
  trialId: varchar('trial_id', { length: 36 }).notNull().references(() => trial.id),
});

// GenomicSequencing
export const genomicSequencing = mysqlTable('genomic_sequencing', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  trialId: varchar('trial_id', { length: 36 }).references(() => trial.id),
});

// MolecularData
export const molecularData = mysqlTable('molecular_data', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  trialId: varchar('trial_id', { length: 36 }).references(() => trial.id),
});
