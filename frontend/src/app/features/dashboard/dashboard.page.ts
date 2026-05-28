import { NgOptimizedImage } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { API_URL } from '@core/tokens/api-url.token';
import { BiomodelSuccessChartComponent } from './components/biomodel-success-chart/biomodel-success-chart.component';
import { OrganClassificationChartComponent } from './components/organ-classification-chart/organ-classification-chart.component';
import { TumorsByOrganChartComponent } from './components/tumors-by-organ-chart/tumors-by-organ-chart.component';
import { DashboardPreferencesService } from './services/dashboard-preferences.service';

interface DashboardCard {
  title: string;
  icon: string;
  route: string;
  endpoint: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgOptimizedImage,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    TumorsByOrganChartComponent,
    BiomodelSuccessChartComponent,
    OrganClassificationChartComponent,
  ],
  template: `
    <div class="dashboard-container">
      <!-- Animated background blobs -->
      <div class="ambient-bg" aria-hidden="true">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>

      <!-- Hero -->
      <header class="dashboard-hero">
        <div class="hero-copy">
          <div class="hero-badge" i18n>Platform</div>
          <h1 class="hero-title" i18n>Biomodels Management at IRYCIS Biobank</h1>
          <p class="hero-subtitle" i18n>
            Biomedical research data management platform. Navigate through your registry, biomodels,
            and passage data.
          </p>
          @if (auth.isAdmin()) {
            <a mat-flat-button routerLink="/admin/data-transfer" class="hero-cta">
              <mat-icon>sync_alt</mat-icon>
              <ng-container i18n="@@openDatasetTransfer">Open Dataset Transfer</ng-container>
            </a>
          }
        </div>

        <div class="hero-brand-rail" aria-label="Institutional partners" i18n-aria-label>
          <img
            class="hero-brand hero-brand-eu"
            ngSrc="/founded-by-europe.png"
            width="196"
            height="54"
            alt="Funded by the European Union"
          />
          <img
            class="hero-brand hero-brand-techconnect"
            ngSrc="/techconnect.png"
            width="219"
            height="86"
            alt="TechConnect Human Tech Index"
          />
        </div>
      </header>

      <!-- Vitals Strip -->
      <nav class="vitals-strip" aria-label="Entity overview">
        @for (card of cards; track card.route; let i = $index) {
          <a
            [routerLink]="card.route"
            class="vital-tile"
            [style.--vital-color]="card.color"
            [style.animation-delay]="200 + i * 80 + 'ms'"
          >
            <div class="vital-accent" [style.background]="card.color"></div>
            <div class="vital-content">
              <div class="vital-icon">
                <mat-icon>{{ card.icon }}</mat-icon>
              </div>
              <div class="vital-data">
                <div class="vital-count">
                  @if (getResource(card.endpoint).isLoading()) {
                    <mat-spinner diameter="18" aria-label="Loading count"></mat-spinner>
                  } @else if (getResource(card.endpoint).error()) {
                    <mat-icon class="count-error-icon" aria-label="Error loading data"
                      >error_outline</mat-icon
                    >
                  } @else if (getResource(card.endpoint).hasValue()) {
                    <span class="count-number card-count">{{
                      getResource(card.endpoint).value()!.length
                    }}</span>
                  } @else {
                    <span class="count-number">—</span>
                  }
                </div>
                <div class="vital-label">{{ card.title }}</div>
              </div>
            </div>
            <div class="vital-arrow" aria-hidden="true">
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </a>
        }
      </nav>

      <!-- Charts Bento -->
      <section class="charts-bento" aria-label="Statistics charts">
        <div class="bento-header">
          <div class="bento-header-left">
            <h2 class="bento-title" i18n>Statistics</h2>
            <span class="bento-subtitle" i18n>Real-time analytics from your research data</span>
          </div>
          <button
            mat-icon-button
            [matMenuTriggerFor]="chartMenu"
            aria-label="Chart settings"
            i18n-aria-label
            class="bento-settings"
          >
            <mat-icon>settings</mat-icon>
          </button>
          <mat-menu #chartMenu="matMenu">
            <div class="chart-menu-content">
              <span class="chart-menu-heading" i18n>Show charts</span>
              <mat-slide-toggle
                [checked]="prefs.visibility().tumorsByOrgan"
                (change)="prefs.toggleChart('tumorsByOrgan')"
                i18n
              >
                Tumors by Organ
              </mat-slide-toggle>
              <mat-slide-toggle
                [checked]="prefs.visibility().biomodelSuccess"
                (change)="prefs.toggleChart('biomodelSuccess')"
                i18n
              >
                Biomodel Success
              </mat-slide-toggle>
              <mat-slide-toggle
                [checked]="prefs.visibility().organClassification"
                (change)="prefs.toggleChart('organClassification')"
                i18n
              >
                Organ Classification
              </mat-slide-toggle>
            </div>
          </mat-menu>
        </div>

        @if (anyChartVisible()) {
          <div class="bento-grid">
            @if (prefs.visibility().tumorsByOrgan) {
              <div class="bento-cell bento-cell-tumors">
                <app-tumors-by-organ-chart />
              </div>
            }
            @if (prefs.visibility().biomodelSuccess) {
              <div class="bento-cell bento-cell-biomodel">
                <app-biomodel-success-chart />
              </div>
            }
            @if (prefs.visibility().organClassification) {
              <div class="bento-cell bento-cell-classification">
                <app-organ-classification-chart />
              </div>
            }
          </div>
        } @else {
          <div class="charts-empty" role="status">
            <mat-icon aria-hidden="true">bar_chart</mat-icon>
            <span i18n>No charts selected. Use the settings button to enable charts.</span>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    /* ─── Container & Ambient Background ──────────────────────── */

    .dashboard-container {
      position: relative;
      padding: 2rem 1.5rem 3rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    .ambient-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.35;
      animation: blobFloat 12s ease-in-out infinite;
    }

    .blob-1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, #c5e3ec 0%, transparent 70%);
      top: -120px;
      right: -80px;
      animation-delay: 0s;
    }

    .blob-2 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #e8d5d5 0%, transparent 70%);
      top: 200px;
      left: -100px;
      animation-delay: -4s;
    }

    .blob-3 {
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, #d5e8d5 0%, transparent 70%);
      bottom: 10%;
      right: 10%;
      animation-delay: -8s;
    }

    @keyframes blobFloat {
      0%,
      100% {
        transform: translate(0, 0) scale(1);
      }
      33% {
        transform: translate(20px, -30px) scale(1.05);
      }
      66% {
        transform: translate(-15px, 15px) scale(0.95);
      }
    }

    /* ─── Hero ────────────────────────────────────────────────── */

    .dashboard-hero {
      position: relative;
      display: grid;
      gap: 1.75rem;
      z-index: 1;
      margin-bottom: 2.5rem;
      padding: 3rem 2.5rem;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.9) 0%,
        rgba(250, 248, 245, 0.85) 100%
      );
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      animation: heroEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      overflow: hidden;
    }

    .dashboard-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #2d6a4f, #006d77, #5c4d7d, #bc6c25, #9b2335);
      opacity: 0.6;
    }

    .hero-copy {
      position: relative;
      z-index: 1;
      max-width: 640px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 1rem;
      border-radius: 100px;
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.06);
      font-size: 0.6875rem;
      font-weight: 600;
      color: #57534e;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 1.25rem;
    }

    .hero-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    .hero-title {
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 700;
      color: #1c1917;
      margin: 0 0 0.75rem;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    .hero-subtitle {
      font-size: 1.0625rem;
      color: #78716c;
      margin: 0;
      max-width: 520px;
      line-height: 1.65;
      font-weight: 400;
    }

    .hero-cta {
      margin-top: 1.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 12px;
      font-weight: 600;
      letter-spacing: -0.01em;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }

    .hero-cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .hero-brand-rail {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: center;
      gap: 1.25rem;
      padding-top: 0.25rem;
    }

    .hero-brand {
      display: block;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 10px 20px rgba(28, 25, 23, 0.08));
    }

    .hero-brand-eu {
      width: min(196px, 45vw);
    }

    .hero-brand-techconnect {
      width: min(219px, 48vw);
    }

    /* ─── Vitals Strip ────────────────────────────────────────── */

    .vitals-strip {
      position: relative;
      z-index: 1;
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scrollbar-width: none;
    }

    .vitals-strip::-webkit-scrollbar {
      display: none;
    }

    .vital-tile {
      position: relative;
      flex: 1 1 0;
      min-width: 160px;
      max-width: 280px;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 20px;
      text-decoration: none;
      color: inherit;
      transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      animation: tileEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
      overflow: hidden;
    }

    .vital-tile:hover {
      transform: translateY(-3px);
      border-color: var(--vital-color);
      box-shadow:
        0 12px 32px rgba(0, 0, 0, 0.06),
        0 0 0 1px var(--vital-color);
    }

    .vital-tile:hover .vital-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    .vital-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      opacity: 0.7;
      transition:
        width 0.25s ease,
        opacity 0.25s ease;
    }

    .vital-tile:hover .vital-accent {
      width: 4px;
      opacity: 1;
    }

    .vital-content {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex: 1;
    }

    .vital-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--vital-color) 10%, transparent);
      color: var(--vital-color);
      flex-shrink: 0;
    }

    .vital-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .vital-data {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .vital-count {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1c1917;
      letter-spacing: -0.03em;
      line-height: 1.2;
      display: flex;
      align-items: center;
    }

    .count-number {
      animation: countPop 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    @keyframes countPop {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(4px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .count-error-icon {
      color: var(--mat-sys-error);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .vital-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #78716c;
      letter-spacing: -0.01em;
    }

    .vital-arrow {
      opacity: 0;
      transform: translateX(-6px);
      transition: all 0.25s ease;
      color: var(--vital-color);
    }

    .vital-arrow mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* ─── Charts Bento ────────────────────────────────────────── */

    .charts-bento {
      position: relative;
      z-index: 1;
      animation: fadeIn 0.5s ease 0.3s both;
    }

    .bento-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding: 0 0.25rem;
    }

    .bento-header-left {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .bento-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1c1917;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .bento-subtitle {
      font-size: 0.8125rem;
      color: #a8a29e;
      font-weight: 400;
    }

    .bento-settings {
      color: #a8a29e;
      transition:
        color 0.2s ease,
        transform 0.2s ease;
    }

    .bento-settings:hover {
      color: #57534e;
      transform: rotate(30deg);
    }

    .bento-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .bento-cell {
      animation: cellEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    }

    .bento-cell-tumors {
      animation-delay: 0.35s;
    }
    .bento-cell-biomodel {
      animation-delay: 0.45s;
    }
    .bento-cell-classification {
      animation-delay: 0.55s;
    }

    .bento-cell ::ng-deep .chart-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 20px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition:
        box-shadow 0.25s ease,
        transform 0.25s ease;
    }

    .bento-cell ::ng-deep .chart-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      transform: translateY(-1px);
    }

    .bento-cell ::ng-deep .mat-mdc-card-header {
      padding: 1.25rem 1.5rem 0.75rem;
    }

    .bento-cell ::ng-deep .mat-mdc-card-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #44403c;
      letter-spacing: -0.01em;
    }

    .bento-cell ::ng-deep .mat-mdc-card-content {
      padding: 0 1.5rem 1.5rem;
    }

    /* ─── Chart Menu ──────────────────────────────────────────── */

    .chart-menu-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      min-width: 220px;
    }

    .chart-menu-heading {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #a8a29e;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.25rem;
    }

    .charts-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 4rem 2rem;
      color: #a8a29e;
      background: rgba(255, 255, 255, 0.6);
      border: 2px dashed rgba(0, 0, 0, 0.08);
      border-radius: 20px;
      font-size: 0.9375rem;
    }

    /* ─── Animations ──────────────────────────────────────────── */

    @keyframes heroEnter {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes tileEnter {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes cellEnter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* ─── Responsive ──────────────────────────────────────────── */

    @media (min-width: 768px) {
      .dashboard-container {
        padding: 2.5rem 2rem 4rem;
      }

      .bento-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .bento-cell-classification {
        grid-column: 1 / -1;
      }
    }

    @media (min-width: 1024px) {
      .dashboard-container {
        padding: 3rem 2.5rem 5rem;
      }

      .dashboard-hero {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        padding: 3.5rem 3rem;
      }

      .hero-brand-rail {
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 1rem;
      }

      .vitals-strip {
        gap: 1rem;
      }

      .vital-tile {
        padding: 1.5rem 1.75rem;
      }

      .vital-icon {
        width: 48px;
        height: 48px;
      }

      .vital-count {
        font-size: 1.75rem;
      }
    }

    @media (max-width: 640px) {
      .dashboard-hero {
        padding: 2rem 1.5rem;
        border-radius: 20px;
      }

      .hero-brand-rail {
        gap: 1rem;
      }

      .vital-tile {
        min-width: 140px;
        padding: 1rem 1.25rem;
      }

      .vital-icon {
        width: 36px;
        height: 36px;
      }

      .vital-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .vital-count {
        font-size: 1.25rem;
      }
    }
  `,
})
export class DashboardPage {
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);
  protected readonly prefs = inject(DashboardPreferencesService);

  readonly anyChartVisible = computed(() => {
    const v = this.prefs.visibility();
    return v.tumorsByOrgan || v.biomodelSuccess || v.organClassification;
  });

  cards: DashboardCard[] = [
    {
      title: $localize`Patients`,
      icon: 'person',
      route: '/patients',
      endpoint: 'patients',
      color: '#2d6a4f',
      description: $localize`View and manage patient records and demographics.`,
    },
    {
      title: $localize`Tumors`,
      icon: 'coronavirus',
      route: '/tumors',
      endpoint: 'tumors',
      color: '#9b2335',
      description: $localize`:@@dashboardTumorsDescription:Track tumor samples, diagnoses, and biobank codes.`,
    },
    {
      title: $localize`Samples`,
      icon: 'water_drop',
      route: '/samples',
      endpoint: 'samples',
      color: '#006d77',
      description: $localize`Manage serum, buffy coat, and plasma samples.`,
    },
    {
      title: $localize`Biomodels`,
      icon: 'science',
      route: '/biomodels',
      endpoint: 'biomodels',
      color: '#5c4d7d',
      description: $localize`Preclinical biomodels derived from tumor samples.`,
    },
    {
      title: $localize`Passages`,
      icon: 'swap_horiz',
      route: '/passages',
      endpoint: 'passages',
      color: '#bc6c25',
      description: $localize`Track biomodel passages and detailed outcomes.`,
    },
  ];

  private readonly resources = new Map<string, ReturnType<typeof httpResource<unknown[]>>>();

  constructor() {
    for (const card of this.cards) {
      const endpoint = card.endpoint;
      const url = this.apiUrl;
      this.resources.set(
        endpoint,
        httpResource<unknown[]>(() => `${url}/${endpoint}`),
      );
    }
  }

  getResource(endpoint: string) {
    const resource = this.resources.get(endpoint);
    if (!resource) {
      throw new Error(`No resource found for endpoint: ${endpoint}`);
    }
    return resource;
  }
}
