import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { translateOrgan as _translateOrgan } from '@shared/pipes/organ-translate.pipe';
import { DashboardStatsService } from '../../services/dashboard-stats.service';

@Component({
  selector: 'app-organ-classification-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    BaseChartDirective,
  ],
  template: `
    <mat-card class="chart-card" appearance="outlined">
      <mat-card-header>
        <mat-card-title i18n>Biomodel Success by Tumor Classification</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-filters">
          <mat-form-field appearance="outline" class="organ-select">
            <mat-label i18n>Select organ</mat-label>
            <mat-select [value]="selectedOrgan()" (selectionChange)="selectedOrgan.set($event.value)">
              @for (organ of stats.availableOrgans(); track organ) {
                <mat-option [value]="organ">{{ translateOrgan(organ) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
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
        } @else if (!selectedOrgan()) {
          <div class="chart-empty" role="status">
            <span i18n>Please select an organ to view the chart</span>
          </div>
        } @else if (chartData().labels!.length === 0) {
          <div class="chart-empty" role="status">
            <span i18n>No data available for the selected organ</span>
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
    .organ-select {
      min-width: 200px;
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
export class OrganClassificationChartComponent {
  private readonly statsService = inject(DashboardStatsService);
  private readonly router = inject(Router);
  protected readonly locale = inject(LOCALE_ID);

  protected readonly stats = this.statsService;

  protected translateOrgan(organ: string | null | undefined): string {
    return _translateOrgan(organ, this.locale);
  }

  readonly selectedOrgan = signal<string>('');
  readonly includeUndefined = signal(true);

  protected readonly classificationData = computed(() => {
    const organ = this.selectedOrgan();
    if (!organ) return [];
    return this.statsService.classificationStatsForOrgan(organ);
  });

  protected readonly chartData = computed<ChartData<'bar'>>(() => {
    const data = this.classificationData();
    const includeUndef = this.includeUndefined();

    const datasets: ChartData<'bar'>['datasets'] = [
      {
        data: data.map((d) => d.successCount),
        label: $localize`Success`,
        backgroundColor: '#22c55e',
        borderRadius: 4,
        stack: 'success',
      },
      {
        data: data.map((d) => d.failureCount),
        label: $localize`No success`,
        backgroundColor: '#ef4444',
        borderRadius: 4,
        stack: 'success',
      },
    ];

    if (includeUndef) {
      datasets.push({
        data: data.map((d) => d.undefinedCount),
        label: $localize`Undefined`,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        stack: 'success',
      });
    }

    return {
      labels: data.map((d) => d.classification),
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
    const classification = this.chartData().labels![element.index] as string;
    const datasetLabel = this.chartData().datasets![element.datasetIndex].label ?? '';
    const success = datasetLabel.includes($localize`Success`) && !datasetLabel.includes($localize`No success`)
      ? true
      : datasetLabel.includes($localize`No success`)
        ? false
        : undefined;

    const queryParams: Record<string, string | boolean> = {};
    if (classification && classification !== 'Unknown') queryParams['classification'] = classification;
    if (success !== undefined) queryParams['success'] = String(success);

    this.router.navigate(['/biomodels'], { queryParams });
  }
}
