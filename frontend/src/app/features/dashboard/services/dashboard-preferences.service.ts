import { effect, Injectable, signal } from '@angular/core';

export interface ChartVisibility {
  tumorsByOrgan: boolean;
  biomodelSuccess: boolean;
  organClassification: boolean;
}

const STORAGE_KEY = 'dashboard_chart_visibility';
const DEFAULT_VISIBILITY: ChartVisibility = {
  tumorsByOrgan: true,
  biomodelSuccess: true,
  organClassification: true,
};

function isStorageAvailable(): boolean {
  return typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function';
}

@Injectable({ providedIn: 'root' })
export class DashboardPreferencesService {
  readonly visibility = signal<ChartVisibility>(this.loadFromStorage());

  constructor() {
    effect(() => {
      if (isStorageAvailable()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.visibility()));
      }
    });
  }

  private loadFromStorage(): ChartVisibility {
    if (!isStorageAvailable()) {
      return { ...DEFAULT_VISIBILITY };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ChartVisibility>;
        return { ...DEFAULT_VISIBILITY, ...parsed };
      }
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULT_VISIBILITY };
  }

  toggleChart(chartKey: keyof ChartVisibility): void {
    this.visibility.update((v) => ({ ...v, [chartKey]: !v[chartKey] }));
  }
}
