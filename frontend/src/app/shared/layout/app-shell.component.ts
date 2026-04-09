import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '@core/services/auth.service';

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
    MatMenuModule,
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
              <span class="brand-text" i18n="@@brandName">TechConnect</span>
              <span class="brand-subtitle" i18n="@@brandSubtitle">Biomedical Registry</span>
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
          
          <button 
            mat-button 
            [matMenuTriggerFor]="langMenu" 
            class="lang-selector-btn"
            aria-label="Select language"
            i18n-aria-label
          >
            <mat-icon class="lang-icon">language</mat-icon>
            <span class="lang-label">
              {{ currentLangName() }}
            </span>
            <mat-icon class="chevron-icon">keyboard_arrow_down</mat-icon>
          </button>

          <button
            mat-button
            [matMenuTriggerFor]="accountMenu"
            class="account-selector-btn"
            aria-label="Open account menu"
            i18n-aria-label
          >
            <mat-icon class="account-icon">account_circle</mat-icon>
            <span class="account-label">{{ currentUserLabel() }}</span>
            <mat-icon class="chevron-icon">keyboard_arrow_down</mat-icon>
          </button>

          <mat-menu #langMenu="matMenu" class="lang-dropdown-menu">
            <button mat-menu-item (click)="switchLanguage('en')" [class.active-lang]="currentLang() === 'en'">
              <span class="lang-item-content">
                <span class="lang-code">EN</span>
                <span class="lang-full" i18n="@@langEnglish">English</span>
                @if (currentLang() === 'en') {
                  <mat-icon class="check-icon">check</mat-icon>
                }
              </span>
            </button>
            <button mat-menu-item (click)="switchLanguage('es')" [class.active-lang]="currentLang() === 'es'">
              <span class="lang-item-content">
                <span class="lang-code">ES</span>
                <span class="lang-full" i18n="@@langSpanish">Español</span>
                @if (currentLang() === 'es') {
                  <mat-icon class="check-icon">check</mat-icon>
                }
              </span>
            </button>
          </mat-menu>

          <mat-menu #accountMenu="matMenu" class="account-dropdown-menu">
            <button mat-menu-item disabled>
              <span class="account-menu-label">
                <span i18n="@@signedInAs">Signed in as</span>
                <strong>{{ currentUserLabel() }}</strong>
              </span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span i18n="@@signOut">Sign out</span>
            </button>
          </mat-menu>
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
      flex-shrink: 0;
      min-height: 64px;
      box-sizing: border-box;
    }


    .lang-selector-btn,
    .account-selector-btn {
      height: 40px;
      padding: 0 12px 0 8px !important;
      border-radius: 20px !important;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      font-weight: 500;
      border: 1px solid transparent;

      &:hover {
        background: var(--mat-sys-surface-container-highest);
        border-color: var(--mat-sys-outline-variant);
      }
    }

    .lang-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-primary);
    }

    .lang-label {
      font: var(--mat-sys-label-large);
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .chevron-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-on-surface-variant);
      margin-left: -4px;
    }

    .account-icon {
      color: var(--mat-sys-secondary);
    }

    .account-label {
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: var(--mat-sys-label-large);
      font-weight: 600;
    }

    .account-menu-label {
      display: grid;
      gap: 0.15rem;
      line-height: 1.35;
    }

    .lang-item-content {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .lang-code {
      font-weight: 700;
      font-size: 0.75rem;
      color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
      padding: 2px 6px;
      border-radius: 4px;
      min-width: 24px;
      text-align: center;
    }

    .lang-full {
      flex: 1;
    }

    .check-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-primary);
      margin-left: 8px;
    }

    .active-lang {
      background-color: var(--mat-sys-surface-variant) !important;
      
      .lang-full {
        font-weight: 600;
        color: var(--mat-sys-primary);
      }
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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  isMobile = toSignal(this.breakpoint.observe([Breakpoints.Handset]).pipe(map((r) => r.matches)), {
    initialValue: false,
  });

  currentLang = signal(this.detectLanguage());
  currentLangName = computed(() => (this.currentLang() === 'es' ? 'Español' : 'English'));
  currentUserLabel = computed(() => {
    const user = this.auth.currentUser();
    return user?.full_name?.trim() || user?.email || $localize`:@@accountLabel:Account`;
  });

  private detectLanguage(): string {
    const path = globalThis.location.pathname;
    if (path.startsWith('/es/') || path === '/es') return 'es';
    return 'en';
  }

  navGroups = [
    {
      title: $localize`:@@navOverview:Overview`,
      items: [{ label: $localize`:@@navDashboard:Dashboard`, icon: 'dashboard', route: '/dashboard' }],
    },
    {
      title: $localize`:@@navRegistry:Registry`,
      items: [
        { label: $localize`:@@navPatients:Patients`, icon: 'person', route: '/patients' },
        { label: $localize`:@@navTumors:Tumors`, icon: 'coronavirus', route: '/tumors' },
        { label: $localize`:@@navSamples:Samples`, icon: 'water_drop', route: '/samples' },
      ],
    },
    {
      title: $localize`:@@navResearch:Research`,
      items: [
        { label: $localize`:@@navBiomodels:Biomodels`, icon: 'science', route: '/biomodels' },
        { label: $localize`:@@navPassages:Passages`, icon: 'swap_horiz', route: '/passages' },
        { label: $localize`:@@navTrials:Trials`, icon: 'assignment', route: '/trials' },
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

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        void this.router.navigate(['/login']);
      },
    });
  }
}
