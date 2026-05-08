import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { translateOrgan } from '@shared/pipes/organ-translate.pipe';
import { DashboardStatsService } from '../../services/dashboard-stats.service';

const ORGAN_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#14b8a6',
];

@Component({
  selector: 'app-tumors-by-organ-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  template: `
    <mat-card class="chart-card" appearance="outlined">
      <mat-card-header>
        <mat-card-title i18n>Tumors by Organ</mat-card-title>
      </mat-card-header>
      <mat-card-content>
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
            <span i18n>No data available</span>
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
      height: 320px;
      width: 100%;
    }
  `,
})
export class TumorsByOrganChartComponent {
  private readonly statsService = inject(DashboardStatsService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  protected readonly stats = this.statsService;

  protected readonly chartData = computed<ChartData<'bar'>>(() => {
    const data = this.statsService.tumorsByOrgan();
    return {
      labels: data.map((d) => translateOrgan(d.organ, this.locale)),
      datasets: [
        {
          data: data.map((d) => d.count),
          label: $localize`Tumors`,
          backgroundColor: data.map((_, i) => ORGAN_COLORS[i % ORGAN_COLORS.length]),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
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
    const index = (active[0] as { index: number }).index;
    const organ = this.statsService.tumorsByOrgan()[index]?.organ;
    if (organ && organ !== 'Unknown') {
      this.router.navigate(['/tumors'], { queryParams: { organ } });
    }
  }
}
