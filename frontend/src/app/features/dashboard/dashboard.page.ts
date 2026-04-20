import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { httpResource } from '@angular/common/http';
import { API_URL } from '@core/tokens/api-url.token';

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
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="dashboard-hero">
      <div class="hero-content">
        <span class="hero-badge" i18n>Platform</span>
        <h1 class="hero-title" i18n>Welcome to TechConnect</h1>
        <p class="hero-subtitle" i18n>
          Biomedical research data management platform. Navigate through your registry, biomodels,
          and clinical trial data.
        </p>
      </div>
      <div class="hero-decoration" aria-hidden="true">
        <mat-icon class="hero-deco-icon">biotech</mat-icon>
      </div>
    </div>

    <section class="dashboard-grid" aria-label="Entity overview">
      @for (card of cards; track card.route; let i = $index) {
        <a [routerLink]="card.route" class="card-link" [style.animation-delay]="i * 60 + 'ms'">
          <mat-card class="entity-card" appearance="outlined">
            <mat-card-content>
              <div class="card-header">
                <div
                  class="card-icon-wrap"
                  [style.background]="card.color + '14'"
                  [style.color]="card.color"
                >
                  <mat-icon>{{ card.icon }}</mat-icon>
                </div>
                <div class="card-count">
                  @if (getResource(card.endpoint).isLoading()) {
                    <mat-spinner diameter="20" aria-label="Loading count"></mat-spinner>
                  } @else if (getResource(card.endpoint).error()) {
                    <mat-icon class="count-error-icon" aria-label="Error loading data"
                      >error_outline</mat-icon
                    >
                  } @else if (getResource(card.endpoint).hasValue()) {
                    {{ getResource(card.endpoint).value()!.length }}
                  } @else {
                    —
                  }
                </div>
              </div>
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-desc">{{ card.description }}</p>
              <div class="card-arrow" aria-hidden="true">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        </a>
      }
    </section>
  `,
  styles: `
    /* ─── Hero ────────────────────────────────────────────────── */

    .dashboard-hero {
      margin-bottom: 2rem;
      padding: 2.5rem 2.25rem;
      background: linear-gradient(
        135deg,
        var(--mat-sys-primary-container),
        var(--mat-sys-tertiary-container)
      );
      border-radius: 20px;
      position: relative;
      overflow: hidden;
      animation: heroEnter 0.5s ease-out;
    }

    .hero-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 100px;
      background: color-mix(in srgb, var(--mat-sys-on-primary-container) 10%, transparent);
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-primary-container);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .hero-title {
      font: var(--mat-sys-display-small);
      color: var(--mat-sys-on-primary-container);
      margin: 0 0 0.625rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .hero-subtitle {
      font: var(--mat-sys-body-large);
      color: var(--mat-sys-on-primary-container);
      opacity: 0.8;
      margin: 0;
      max-width: 560px;
      line-height: 1.65;
    }

    .hero-decoration {
      position: absolute;
      right: -16px;
      bottom: -20px;
      opacity: 0.06;
    }

    .hero-deco-icon {
      font-size: 200px;
      width: 200px;
      height: 200px;
    }

    /* ─── Card Grid ───────────────────────────────────────────── */

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .card-link {
      text-decoration: none;
      color: inherit;
      animation: cardEnter 0.45s ease backwards;
    }

    .entity-card {
      height: 100%;
      transition:
        transform 0.2s ease,
        box-shadow 0.25s ease;
      cursor: pointer;
      border-radius: 16px !important;
      position: relative;
      overflow: hidden;

      &:hover {
        transform: translateY(-4px);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.06),
          0 2px 8px rgba(0, 0, 0, 0.04);

        .card-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .card-count {
      font: var(--mat-sys-headline-medium);
      font-weight: 700;
      color: var(--mat-sys-on-surface);
      letter-spacing: -0.02em;
    }

    .count-error-icon {
      color: var(--mat-sys-error);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .card-title {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
      margin: 0 0 0.25rem;
      font-weight: 600;
    }

    .card-desc {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
      line-height: 1.5;
    }

    .card-arrow {
      position: absolute;
      bottom: 16px;
      right: 16px;
      opacity: 0;
      transform: translateX(-4px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease;
      color: var(--mat-sys-primary);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* ─── Animations ──────────────────────────────────────────── */

    @keyframes heroEnter {
      from {
        opacity: 0;
        transform: scale(0.98);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class DashboardPage {
  private readonly apiUrl = inject(API_URL);

  cards: DashboardCard[] = [
    {
      title: $localize`Patients`,
      icon: 'person',
      route: '/patients',
      endpoint: 'patients',
      color: '#2563eb',
      description: $localize`View and manage patient records and demographics.`,
    },
    {
      title: $localize`Tumors`,
      icon: 'coronavirus',
      route: '/tumors',
      endpoint: 'tumors',
      color: '#dc2626',
      description: $localize`:@@dashboardTumorsDescription:Track tumor samples, diagnoses, and biobank codes.`,
    },
    {
      title: $localize`Samples`,
      icon: 'water_drop',
      route: '/samples',
      endpoint: 'samples',
      color: '#0891b2',
      description: $localize`Manage serum, buffy coat, and plasma samples.`,
    },
    {
      title: $localize`Biomodels`,
      icon: 'science',
      route: '/biomodels',
      endpoint: 'biomodels',
      color: '#6366f1',
      description: $localize`Preclinical biomodels derived from tumor samples.`,
    },
    {
      title: $localize`Passages`,
      icon: 'swap_horiz',
      route: '/passages',
      endpoint: 'passages',
      color: '#059669',
      description: $localize`Track biomodel passages, viability, and growth indices.`,
    },
    {
      title: $localize`Trials`,
      icon: 'assignment',
      route: '/trials',
      endpoint: 'trials',
      color: '#d97706',
      description: $localize`PDX, PDO, and LC trial data with detailed outcomes.`,
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
