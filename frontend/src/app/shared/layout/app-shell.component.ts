import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="app-sidenav"
        role="navigation"
      >
        <div class="sidenav-header">
          <a routerLink="/dashboard" class="brand-link">
            <div class="brand-icon-wrap">
              <mat-icon class="brand-icon">biotech</mat-icon>
            </div>
            <div class="brand-text-wrap">
              <span class="brand-text" i18n>TechConnect</span>
              <span class="brand-subtitle" i18n>Biomedical Registry</span>
            </div>
          </a>
        </div>

        <mat-nav-list class="sidenav-nav">
          @for (group of navGroups; track group.title) {
            <div class="nav-group">
              <span class="nav-group-label">{{ group.title }}</span>
              @for (item of group.items; track item.route) {
                <a
                  mat-list-item
                  [routerLink]="item.route"
                  routerLinkActive="active-link"
                  class="nav-item"
                  (click)="isMobile() ? sidenav.close() : null"
                >
                  <mat-icon matListItemIcon class="nav-icon">{{ item.icon }}</mat-icon>
                  <span matListItemTitle>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <mat-toolbar class="app-toolbar">
          @if (isMobile()) {
            <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle navigation" i18n-aria-label>
              <mat-icon>menu</mat-icon>
            </button>
          }
          <div style="flex: 1"></div>
          <button mat-button class="lang-switch-btn" (click)="switchLanguage('en')" i18n>EN</button>
          <button mat-button class="lang-switch-btn" (click)="switchLanguage('es')" i18n>ES</button>
        </mat-toolbar>

        <main class="content-area">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    /* ─── Shell Container ──────────────────────────────────────── */

    .shell-container {
      height: 100%;
    }

    /* ─── Sidenav ──────────────────────────────────────────────── */

    .app-sidenav {
      width: 264px;
      border-right: none;
      background: var(--mat-sys-surface);
      display: flex;
      flex-direction: column;
      box-shadow: 1px 0 0 var(--mat-sys-outline-variant);
    }

    .sidenav-header {
      padding: 1.25rem 1.25rem 1rem;
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--mat-sys-on-surface);
      padding: 0.5rem;
      border-radius: 12px;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: var(--mat-sys-surface-variant);
      }
    }

    .brand-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
      flex-shrink: 0;
    }

    .brand-icon {
      color: var(--mat-sys-on-primary);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .brand-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
      min-width: 0;
    }

    .brand-text {
      font: var(--mat-sys-title-medium);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .brand-subtitle {
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
      letter-spacing: 0.02em;
    }

    /* ─── Navigation ───────────────────────────────────────────── */

    .sidenav-nav {
      flex: 1;
      overflow-y: auto;
      padding: 0 0.75rem;
    }

    .nav-group {
      padding: 0.375rem 0;
    }

    .nav-group-label {
      display: block;
      padding: 0.75rem 1rem 0.375rem;
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }

    .nav-item {
      border-radius: 10px !important;
      margin-bottom: 2px;
      transition: background-color 0.15s ease;
    }

    .nav-icon {
      color: var(--mat-sys-on-surface-variant);
      transition: color 0.15s ease;
    }

    .active-link {
      background-color: var(--mat-sys-secondary-container) !important;
      color: var(--mat-sys-on-secondary-container) !important;
      font-weight: 500;

      .nav-icon,
      mat-icon {
        color: var(--mat-sys-on-secondary-container);
      }
    }

    /* ─── Sidenav Footer ───────────────────────────────────────── */

    .sidenav-footer {
      padding: 0.5rem 1.25rem 1rem;
    }

    .footer-divider {
      height: 1px;
      background: var(--mat-sys-outline-variant);
      margin-bottom: 0.75rem;
    }

    .footer-version {
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-outline);
    }

    /* ─── Toolbar ──────────────────────────────────────────────── */

    .app-toolbar {
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky;
      top: 0;
      z-index: 10;
      gap: 0.5rem;
      padding: 0 1.25rem;
    }

    .lang-switch-btn {
      min-width: unset;
      padding: 0 12px;
      font-weight: 600;
    }

    /* ─── Main Content ─────────────────────────────────────────── */

    .main-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--mat-sys-surface-container-lowest);
    }

    .content-area {
      flex: 1;
      padding: 1.75rem 2.25rem;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      animation: fadeSlideUp 0.3s ease-out;

      @media (max-width: 768px) {
        padding: 1rem;
      }
    }

    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class AppShellComponent {
  private readonly breakpoint = inject(BreakpointObserver);

  isMobile = toSignal(this.breakpoint.observe([Breakpoints.Handset]).pipe(map((r) => r.matches)), {
    initialValue: false,
  });

  navGroups = [
    {
      title: $localize`Overview`,
      items: [{ label: $localize`Dashboard`, icon: 'dashboard', route: '/dashboard' }],
    },
    {
      title: $localize`Registry`,
      items: [
        { label: $localize`Patients`, icon: 'person', route: '/patients' },
        { label: $localize`Tumors`, icon: 'coronavirus', route: '/tumors' },
        { label: $localize`Samples`, icon: 'water_drop', route: '/samples' },
      ],
    },
    {
      title: $localize`Research`,
      items: [
        { label: $localize`Biomodels`, icon: 'science', route: '/biomodels' },
        { label: $localize`Passages`, icon: 'swap_horiz', route: '/passages' },
        { label: $localize`Trials`, icon: 'assignment', route: '/trials' },
      ],
    },
  ];

  switchLanguage(lang: string) {
    const currentPath = globalThis.location.pathname;
    // Replace current language code context (either starts with /en/ or /es/ or ends with /en or /es)
    let newPath = currentPath.replace(/^\/(en|es)(\/|$)/, `/${lang}/`);
    // If running in development serve it might not have the language base yet
    if (newPath === currentPath && !currentPath.startsWith('/en/') && !currentPath.startsWith('/es/')) {
       newPath = `/${lang}${currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath}`;
    }
    
    // Redirect if different
    if (newPath !== currentPath) {
       globalThis.location.href = newPath;
    }
  }
}
