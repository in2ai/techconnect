import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { translateOrgan } from '@shared/pipes/organ-translate.pipe';
import { DashboardStatsService } from '../../services/dashboard-stats.service';

const TYPE_META: Record<string, { success: string; failure: string; label: string }> = {
  PDX: { success: '#3b82f6', failure: '#93c5fd', label: 'PDX' },
  PDO: { success: '#22c55e', failure: '#86efac', label: 'PDO' },
  LC: { success: '#f97316', failure: '#fdba74', label: 'LC' },
};

const ALL_TYPES = Object.keys(TYPE_META);

@Component({
  selector: 'app-biomodel-success-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    BaseChartDirective,
  ],
  template: `
    <mat-card class="chart-card" appearance="outlined">
      <mat-card-header>
        <mat-card-title i18n>Biomodel Success by Organ and Type</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-filters">
          <mat-chip-listbox aria-label="Biomodel types" [multiple]="true">
            @for (type of ALL_TYPES; track type) {
              <mat-chip-option
                [selected]="selectedTypes().has(type)"
                (selectionChange)="toggleType(type, $event.selected)"
              >
                {{ TYPE_META[type].label }}
              </mat-chip-option>
            }
          </mat-chip-listbox>
          <mat-slide-toggle
            [checked]="includeUndefined()"
            (change)="includeUndefined.set($event.checked)"
            i18n
          >
            Include undefined success
          </mat-slide-toggle>
        </div>

        @if (stats.isLoading()) {
          <div class="chart-loading">
            <mat-spinner diameter="40" aria-label="Loading chart data"></mat-spinner>
          </div>
        } @else if (stats.hasError()) {
          <div class="chart-error" role="alert">
            <mat-icon aria-hidden="true">error_outline</mat-icon>
            <span i18n>Error loading data</span>
          </div>
        } @else if (chartData().labels!.length === 0) {
          <div class="chart-empty" role="status">
            <span i18n>No data available for the selected filters</span>
          </div>
        } @else {
          <div class="chart-container">
            <canvas
              baseChart
              [data]="chartData()"
              [options]="chartOptions"
              [type]="'bar'"
              (chartClick)="onChartClick($event)"
            ></canvas>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .chart-card {
      border-radius: 16px !important;
    }
    .chart-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .chart-loading,
    .chart-error,
    .chart-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 0.5rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .chart-container {
      position: relative;
      height: 360px;
      width: 100%;
    }
  `,
})
export class BiomodelSuccessChartComponent {
  private readonly statsService = inject(DashboardStatsService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  protected readonly stats = this.statsService;
  protected readonly TYPE_META = TYPE_META;
  protected readonly ALL_TYPES = ALL_TYPES;

  readonly selectedTypes = signal<Set<string>>(new Set(ALL_TYPES));
  readonly includeUndefined = signal(true);

  toggleType(type: string, selected: boolean): void {
    this.selectedTypes.update((set) => {
      const next = new Set(set);
      if (selected) next.add(type);
      else next.delete(type);
      return next;
    });
  }

  protected readonly chartData = computed<ChartData<'bar'>>(() => {
    const raw = this.statsService.biomodelsByOrganAndType();
    const types = this.selectedTypes();
    const includeUndef = this.includeUndefined();

    const organs = Array.from(new Set(raw.map((d) => d.organ))).sort((a, b) => a.localeCompare(b));

    const datasets: ChartData<'bar'>['datasets'] = [];
    for (const type of ALL_TYPES) {
      if (!types.has(type)) continue;
      const meta = TYPE_META[type];
      datasets.push({
        data: organs.map((organ) => {
          const item = raw.find((d) => d.organ === organ && d.type === type);
          return item?.successCount ?? 0;
        }),
        label: `${meta.label} – ${$localize`Success`}`,
        backgroundColor: meta.success,
        stack: type,
        borderRadius: 4,
      });
      datasets.push({
        data: organs.map((organ) => {
          const item = raw.find((d) => d.organ === organ && d.type === type);
          return item?.failureCount ?? 0;
        }),
        label: `${meta.label} – ${$localize`No success`}`,
        backgroundColor: meta.failure,
        stack: type,
        borderRadius: 4,
      });
      if (includeUndef) {
        datasets.push({
          data: organs.map((organ) => {
            const item = raw.find((d) => d.organ === organ && d.type === type);
            return item?.undefinedCount ?? 0;
          }),
          label: `${meta.label} – ${$localize`Undefined`}`,
          backgroundColor: '#e5e7eb',
          stack: type,
          borderRadius: 4,
        });
      }
    }

    return {
      labels: organs.map((o) => translateOrgan(o, this.locale)),
      datasets,
    };
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 16, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { stepSize: 1, font: { size: 11 } },
      },
    },
    onHover: (event, activeElements) => {
      const target = event?.native?.target as HTMLElement | undefined;
      if (target) {
        target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      }
    },
  };

  onChartClick({ active }: { event?: ChartEvent; active?: object[] }): void {
    if (!active?.length) return;
    const element = active[0] as { index: number; datasetIndex: number };
    const raw = this.statsService.biomodelsByOrganAndType();
    const organs = Array.from(new Set(raw.map((d) => d.organ))).sort((a, b) => a.localeCompare(b));
    const organ = organs[element.index];
    const datasetLabel = this.chartData().datasets![element.datasetIndex].label ?? '';
    const typeMatch = datasetLabel.match(/^(PDX|PDO|LC)/);
    const type = typeMatch?.[1];
    const success = datasetLabel.includes($localize`Success`) && !datasetLabel.includes($localize`No success`)
      ? true
      : datasetLabel.includes($localize`No success`)
        ? false
        : undefined;

    const queryParams: Record<string, string | boolean> = { organ };
    if (type) queryParams['type'] = type;
    if (success !== undefined) queryParams['success'] = String(success);

    this.router.navigate(['/biomodels'], { queryParams });
  }
}
