import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';

// ============================================
// MAIN ENTITIES
// ============================================

// Patient
export const patient = sqliteTable('patient', {
  nhc: text('nhc').primaryKey(),
  sex: text('sex'),
  birthDate: text('birth_date'),
});

// Tumor
export const tumor = sqliteTable('tumor', {
  biobankCode: text('biobank_code').primaryKey(),
  labCode: text('lab_code'),
  classification: text('classification'),
  apObservation: text('ap_observation'),
  grade: text('grade'),
  organ: text('organ'),
  status: text('status'),
  tnm: text('tnm'),
  patientNhc: text('patient_nhc').notNull().references(() => patient.nhc),
  registrationDate: text('registration_date'),
  operationDate: text('operation_date'),
});

// LiquidBiopsy
export const liquidBiopsy = sqliteTable('liquid_biopsy', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  hasSerum: integer('has_serum', { mode: 'boolean' }),
  hasBuffy: integer('has_buffy', { mode: 'boolean' }),
  hasPlasma: integer('has_plasma', { mode: 'boolean' }),
  tumorBiobankCode: text('tumor_biobank_code').references(() => tumor.biobankCode),
  biopsyDate: text('biopsy_date'),
});

// Biomodel
export const biomodel = sqliteTable('biomodel', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  type: text('type'),
  preclinicalTrials: text('preclinical_trials'),
  description: text('description'),
  creationDate: text('creation_date'),
  status: text('status'),
  progresses: integer('progresses', { mode: 'boolean' }),
  viability: real('viability'),
  tumorBiobankCode: text('tumor_biobank_code').notNull().references(() => tumor.biobankCode),
});

// Passage
export const passage = sqliteTable('passage', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  number: integer('number'),
  status: text('status'),
  sIndex: real('s_index'),
  viability: real('viability'),
  description: text('description'),
  biomodelId: text('biomodel_id').notNull().references(() => biomodel.id),
});

// ============================================
// TRIAL AND SUBTYPES (Is_a Inheritance)
// ============================================

// Trial (parent entity)
export const trial = sqliteTable('trial', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  success: integer('success', { mode: 'boolean' }),
  description: text('description'),
  creationDate: text('creation_date'),
  biobankShipment: integer('biobank_shipment', { mode: 'boolean' }),
  biobankArrivalDate: text('biobank_arrival_date'),
  passageId: text('passage_id').notNull().references(() => passage.id),
});

// PDXTrial (Trial subtype)
export const pdxTrial = sqliteTable('pdx_trial', {
  id: text('id').primaryKey().references(() => trial.id),
  ffpe: integer('ffpe', { mode: 'boolean' }),
  heSlide: integer('he_slide', { mode: 'boolean' }),
  ihqData: text('ihq_data'),
  latencyWeeks: integer('latency_weeks'),
  sIndex: real('s_index'),
  scannerMagnification: text('scanner_magnification'),
});

// PDOTrial (Trial subtype)
export const pdoTrial = sqliteTable('pdo_trial', {
  id: text('id').primaryKey().references(() => trial.id),
  dropCount: integer('drop_count'),
  frozenOrganoidCount: integer('frozen_organoid_count'),
  organoidCount: integer('organoid_count'),
  plateType: text('plate_type'),
  visualizationDay: integer('visualization_day'),
  assessment: text('assessment'),
});

// LCTrial (Trial subtype)
export const lcTrial = sqliteTable('lc_trial', {
  id: text('id').primaryKey().references(() => trial.id),
  confluence: real('confluence'),
  spheroids: integer('spheroids', { mode: 'boolean' }),
  digestionDate: text('digestion_date'),
  cellLine: text('cell_line'),
  plateType: text('plate_type'),
});

// ============================================
// ENTITIES RELATED TO PDX TRIAL
// ============================================

// Implant
export const implant = sqliteTable('implant', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  implantLocation: text('implant_location'),
  type: text('type'),
  sizeLimit: real('size_limit'),
  pdxTrialId: text('pdx_trial_id').notNull().references(() => pdxTrial.id),
});

// SizeRecord
export const sizeRecord = sqliteTable('size_record', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  weekNumber: integer('week_number'),
  initialSizeMm3: real('initial_size_mm3'),
  finalSizeMm3: real('final_size_mm3'),
  implantId: text('implant_id').notNull().references(() => implant.id),
});

// Mouse
export const mouse = sqliteTable('mouse', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  birthDate: text('birth_date'),
  deathCause: text('death_cause'),
  animalFacility: text('animal_facility'),
  proex: text('proex'),
  strain: text('strain'),
  sex: text('sex'),
  deathDate: text('death_date'),
  pdxTrialId: text('pdx_trial_id').notNull().references(() => pdxTrial.id),
});

// ============================================
// ENTITIES RELATED TO LC TRIAL
// ============================================

// FACS
export const facs = sqliteTable('facs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  lcTrialId: text('lc_trial_id').references(() => lcTrial.id),
});

// ============================================
// ENTITIES RELATED TO TRIAL
// ============================================

// UsageRecord
export const usageRecord = sqliteTable('usage_record', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  usageType: text('usage_type'),
  description: text('description'),
  date: text('date'),
  trialId: text('trial_id').notNull().references(() => trial.id),
});

// Image
export const image = sqliteTable('image', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  date: text('date'),
  type: text('type'),
  apReview: text('ap_review'),
  trialId: text('trial_id').notNull().references(() => trial.id),
});

// Cryopreservation
export const cryopreservation = sqliteTable('cryopreservation', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  location: text('location'),
  date: text('date'),
  vialCount: integer('vial_count'),
  trialId: text('trial_id').notNull().references(() => trial.id),
});

// GenomicSequencing
export const genomicSequencing = sqliteTable('genomic_sequencing', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  trialId: text('trial_id').references(() => trial.id),
});

// MolecularData
export const molecularData = sqliteTable('molecular_data', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  trialId: text('trial_id').references(() => trial.id),
});
