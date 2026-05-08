import { describe, expect, it } from 'vitest';
import { Biomodel, Tumor } from '@generated/models';
import {
  aggregateTumorsByOrgan,
  extractAvailableOrgans,
  aggregateBiomodelsByOrganAndType,
  aggregateClassificationStats,
  OrganCount,
  BiomodelOrganTypeStats,
  ClassificationStats,
} from './dashboard-stats.service';

describe('aggregateTumorsByOrgan', () => {
  it('counts tumors by organ and sorts descending', () => {
    const tumors: Tumor[] = [
      { biobank_code: 'T1', organ: 'Liver', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T2', organ: 'Liver', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T3', organ: 'Lung', patient_nhc: 'P2', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T4', organ: null, patient_nhc: 'P3', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
    ];
    const result = aggregateTumorsByOrgan(tumors);
    expect(result).toEqual<OrganCount[]>([
      { organ: 'Liver', count: 2 },
      { organ: 'Lung', count: 1 },
      { organ: 'Unknown', count: 1 },
    ]);
  });

  it('trims organ names', () => {
    const tumors: Tumor[] = [
      { biobank_code: 'T1', organ: '  Liver  ', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T2', organ: 'Liver', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
    ];
    const result = aggregateTumorsByOrgan(tumors);
    expect(result).toEqual([{ organ: 'Liver', count: 2 }]);
  });
});

describe('extractAvailableOrgans', () => {
  it('returns sorted unique organs excluding null', () => {
    const tumors: Tumor[] = [
      { biobank_code: 'T1', organ: 'Lung', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T2', organ: 'Liver', patient_nhc: 'P1', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T3', organ: 'Lung', patient_nhc: 'P2', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T4', organ: null, patient_nhc: 'P3', tube_code: null, classification: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
    ];
    expect(extractAvailableOrgans(tumors)).toEqual(['Liver', 'Lung']);
  });
});

describe('aggregateBiomodelsByOrganAndType', () => {
  it('aggregates success/failure/undefined by organ and type', () => {
    const biomodels: Biomodel[] = [
      { id: 'B1', type: 'PDX', success: true, tumor_biobank_code: 'T1', tumor_organ: 'Liver', description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B2', type: 'PDX', success: false, tumor_biobank_code: 'T1', tumor_organ: 'Liver', description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B3', type: 'PDO', success: true, tumor_biobank_code: 'T2', tumor_organ: 'Liver', description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B4', type: 'LC', success: null, tumor_biobank_code: 'T3', tumor_organ: 'Lung', description: null, creation_date: null, status: null, parent_passage_id: null },
    ];
    const result = aggregateBiomodelsByOrganAndType(biomodels);
    expect(result).toEqual<BiomodelOrganTypeStats[]>([
      { organ: 'Liver', type: 'PDO', successCount: 1, failureCount: 0, undefinedCount: 0 },
      { organ: 'Liver', type: 'PDX', successCount: 1, failureCount: 1, undefinedCount: 0 },
      { organ: 'Lung', type: 'LC', successCount: 0, failureCount: 0, undefinedCount: 1 },
    ]);
  });

  it('uppercases type and handles unknown', () => {
    const biomodels: Biomodel[] = [
      { id: 'B1', type: 'pdx', success: true, tumor_biobank_code: 'T1', tumor_organ: null, description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B2', type: null, success: true, tumor_biobank_code: 'T2', tumor_organ: null, description: null, creation_date: null, status: null, parent_passage_id: null },
    ];
    const result = aggregateBiomodelsByOrganAndType(biomodels);
    expect(result).toEqual([
      { organ: 'Unknown', type: 'PDX', successCount: 1, failureCount: 0, undefinedCount: 0 },
      { organ: 'Unknown', type: 'UNKNOWN', successCount: 1, failureCount: 0, undefinedCount: 0 },
    ]);
  });
});

describe('aggregateClassificationStats', () => {
  it('aggregates by tumor classification for the given organ', () => {
    const tumors: Tumor[] = [
      { biobank_code: 'T1', organ: 'Liver', classification: 'Adenocarcinoma', patient_nhc: 'P1', tube_code: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T2', organ: 'Liver', classification: 'Carcinoma', patient_nhc: 'P2', tube_code: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
      { biobank_code: 'T3', organ: 'Lung', classification: 'Adenocarcinoma', patient_nhc: 'P3', tube_code: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
    ];
    const biomodels: Biomodel[] = [
      { id: 'B1', success: true, tumor_biobank_code: 'T1', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B2', success: false, tumor_biobank_code: 'T1', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B3', success: true, tumor_biobank_code: 'T2', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B4', success: true, tumor_biobank_code: 'T3', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
    ];
    const result = aggregateClassificationStats(tumors, biomodels, 'Liver');
    expect(result).toEqual<ClassificationStats[]>([
      { classification: 'Adenocarcinoma', successCount: 1, failureCount: 1, undefinedCount: 0 },
      { classification: 'Carcinoma', successCount: 1, failureCount: 0, undefinedCount: 0 },
    ]);
  });

  it('ignores biomodels without matching tumor', () => {
    const tumors: Tumor[] = [
      { biobank_code: 'T1', organ: 'Liver', classification: 'A', patient_nhc: 'P1', tube_code: null, ap_diagnosis: null, grade: null, stage: null, tnm: null, intervention_date: null },
    ];
    const biomodels: Biomodel[] = [
      { id: 'B1', success: true, tumor_biobank_code: 'T1', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
      { id: 'B2', success: true, tumor_biobank_code: 'T99', tumor_organ: null, type: null, description: null, creation_date: null, status: null, parent_passage_id: null },
    ];
    const result = aggregateClassificationStats(tumors, biomodels, 'Liver');
    expect(result).toEqual([{ classification: 'A', successCount: 1, failureCount: 0, undefinedCount: 0 }]);
  });
});
