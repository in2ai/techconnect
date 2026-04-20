import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AppShellComponent } from './app-shell.component';

function configure(opts: {
  logoutResult?: 'ok' | 'error';
  user?: { full_name: string | null; email: string } | null;
}) {
  const logoutMock = vi.fn(() =>
    opts.logoutResult === 'error' ? throwError(() => new Error('fail')) : of(undefined),
  );
  const authMock = {
    logout: logoutMock,
    currentUser: signal(opts.user ?? null),
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: AuthService, useValue: authMock },
      {
        provide: BreakpointObserver,
        useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
      },
    ],
  });

  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(AppShellComponent);
  fixture.detectChanges();
  return { fixture, navSpy, logoutMock };
}

describe('AppShellComponent', () => {
  it('uses the user full name as the account label when present', () => {
    const { fixture } = configure({ user: { full_name: 'Admin User', email: 'a@b' } });
    expect(fixture.componentInstance.currentUserLabel()).toBe('Admin User');
  });

  it('falls back to email when full_name is missing', () => {
    const { fixture } = configure({ user: { full_name: null, email: 'jane@example.com' } });
    expect(fixture.componentInstance.currentUserLabel()).toBe('jane@example.com');
  });

  it('navigates to /login after successful logout', async () => {
    const { fixture, navSpy, logoutMock } = configure({ logoutResult: 'ok' });
    fixture.componentInstance.logout();
    expect(logoutMock).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('still navigates to /login when logout errors', async () => {
    const { fixture, navSpy } = configure({ logoutResult: 'error' });
    fixture.componentInstance.logout();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('falls back to a localized account label when neither name nor email is present', () => {
    const { fixture } = configure({ user: { full_name: '   ', email: '' } });
    expect(fixture.componentInstance.currentUserLabel()).toBe('Account');
  });

  it('computes the current language name based on the locale signal', () => {
    const { fixture } = configure({ logoutResult: 'ok' });
    fixture.componentInstance.currentLang.set('es');
    expect(fixture.componentInstance.currentLangName()).toBe('Español');
    fixture.componentInstance.currentLang.set('en');
    expect(fixture.componentInstance.currentLangName()).toBe('English');
  });

  it('switchLanguage prepends the language prefix when none exists', () => {
    const { fixture } = configure({ logoutResult: 'ok' });
    const originalLocation = globalThis.location;
    let assignedHref: string | null = null;
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        pathname: '/dashboard',
        get href() {
          return '/dashboard';
        },
        set href(v: string) {
          assignedHref = v;
        },
      },
    });
    try {
      fixture.componentInstance.switchLanguage('es');
      expect(assignedHref).toBe('/es/dashboard');
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('switchLanguage replaces an existing language prefix', () => {
    const { fixture } = configure({ logoutResult: 'ok' });
    const originalLocation = globalThis.location;
    let assignedHref: string | null = null;
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        pathname: '/es/patients',
        get href() {
          return '/es/patients';
        },
        set href(v: string) {
          assignedHref = v;
        },
      },
    });
    try {
      fixture.componentInstance.switchLanguage('en');
      expect(assignedHref).toBe('/en/patients');
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('switchLanguage does nothing when target language equals current prefix', () => {
    const { fixture } = configure({ logoutResult: 'ok' });
    const originalLocation = globalThis.location;
    let assignedHref: string | null = null;
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        pathname: '/es/patients',
        get href() {
          return '/es/patients';
        },
        set href(v: string) {
          assignedHref = v;
        },
      },
    });
    try {
      fixture.componentInstance.switchLanguage('es');
      expect(assignedHref).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
