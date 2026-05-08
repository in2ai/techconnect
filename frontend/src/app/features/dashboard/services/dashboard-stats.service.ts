import { computed, inject, Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel, Tumor } from '@generated/models';

export interface OrganCount {
  organ: string;
  count: number;
}

export interface BiomodelOrganTypeStats {
  organ: string;
  type: string;
  successCount: number;
  failureCount: number;
  undefinedCount: number;
}

export interface ClassificationStats {
  classification: string;
  successCount: number;
  failureCount: number;
  undefinedCount: number;
}

export function aggregateTumorsByOrgan(tumors: Tumor[]): OrganCount[] {
  const counts = new Map<string, number>();
  for (const tumor of tumors) {
    const organ = tumor.organ?.trim() ?? 'Unknown';
    counts.set(organ, (counts.get(organ) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([organ, count]) => ({ organ, count }))
    .sort((a, b) => b.count - a.count);
}

export function extractAvailableOrgans(tumors: Tumor[]): string[] {
  const organs = new Set<string>();
  for (const tumor of tumors) {
    if (tumor.organ?.trim()) {
      organs.add(tumor.organ.trim());
    }
  }
  return Array.from(organs).sort((a, b) => a.localeCompare(b));
}

export function aggregateBiomodelsByOrganAndType(biomodels: Biomodel[]): BiomodelOrganTypeStats[] {
  const map = new Map<string, BiomodelOrganTypeStats>();
  for (const biomodel of biomodels) {
    const organ = biomodel.tumor_organ?.trim() ?? 'Unknown';
    const type = (biomodel.type?.trim() ?? 'Unknown').toUpperCase();
    const key = `${organ}||${type}`;
    const existing = map.get(key);
    if (existing) {
      if (biomodel.success === true) existing.successCount++;
      else if (biomodel.success === false) existing.failureCount++;
      else existing.undefinedCount++;
    } else {
      map.set(key, {
        organ,
        type,
        successCount: biomodel.success === true ? 1 : 0,
        failureCount: biomodel.success === false ? 1 : 0,
        undefinedCount: biomodel.success === null || biomodel.success === undefined ? 1 : 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.organ.localeCompare(b.organ) || a.type.localeCompare(b.type));
}

export function aggregateClassificationStats(tumors: Tumor[], biomodels: Biomodel[], organ: string): ClassificationStats[] {
  const tumorMap = new Map<string, Tumor>();
  for (const tumor of tumors) {
    tumorMap.set(tumor.biobank_code, tumor);
  }

  const counts = new Map<string, ClassificationStats>();
  for (const biomodel of biomodels) {
    const tumor = tumorMap.get(biomodel.tumor_biobank_code);
    if (!tumor) continue;
    const tumorOrgan = tumor.organ?.trim() ?? 'Unknown';
    if (tumorOrgan !== organ) continue;

    const classification = tumor.classification?.trim() ?? 'Unknown';
    const existing = counts.get(classification);
    if (existing) {
      if (biomodel.success === true) existing.successCount++;
      else if (biomodel.success === false) existing.failureCount++;
      else existing.undefinedCount++;
    } else {
      counts.set(classification, {
        classification,
        successCount: biomodel.success === true ? 1 : 0,
        failureCount: biomodel.success === false ? 1 : 0,
        undefinedCount: biomodel.success === null || biomodel.success === undefined ? 1 : 0,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.successCount + b.failureCount + b.undefinedCount - (a.successCount + a.failureCount + a.undefinedCount));
}

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private readonly apiUrl = inject(API_URL);

  readonly tumorsResource = httpResource<Tumor[]>(() => `${this.apiUrl}/tumors`);
  readonly biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`);

  readonly tumors = computed(() => this.tumorsResource.value() ?? []);
  readonly biomodels = computed(() => this.biomodelsResource.value() ?? []);
  readonly isLoading = computed(() => this.tumorsResource.isLoading() || this.biomodelsResource.isLoading());
  readonly hasError = computed(() => this.tumorsResource.error() !== undefined || this.biomodelsResource.error() !== undefined);

  readonly tumorsByOrgan = computed<OrganCount[]>(() => aggregateTumorsByOrgan(this.tumors()));
  readonly availableOrgans = computed<string[]>(() => extractAvailableOrgans(this.tumors()));
  readonly biomodelsByOrganAndType = computed<BiomodelOrganTypeStats[]>(() => aggregateBiomodelsByOrganAndType(this.biomodels()));

  classificationStatsForOrgan(organ: string): ClassificationStats[] {
    return aggregateClassificationStats(this.tumors(), this.biomodels(), organ);
  }
}
