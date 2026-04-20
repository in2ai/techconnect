import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthUser } from '@core/models/auth.models';
import { AuthService } from '@core/services/auth.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { anonymousOnlyGuard, authChildGuard, authGuard } from './auth.guard';

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

function route(): ActivatedRouteSnapshot {
  return {} as ActivatedRouteSnapshot;
}

async function runGuard<T>(
  fn: () => T | Promise<T>,
): Promise<T extends boolean | UrlTree ? T : never> {
  return (await TestBed.runInInjectionContext(fn as () => Promise<any>)) as any;
}

function setupGuardTest(authMock: Partial<AuthService>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
  });
}

const sampleUser: AuthUser = {
  id: '1',
  email: 'admin@test',
  full_name: null,
  is_admin: true,
};

describe('authGuard', () => {
  it('allows activation when user is present', async () => {
    const auth = {
      restoreSession: vi.fn(() => of<AuthUser | null>(sampleUser)),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (authGuard(route(), state('/dashboard')) as any).toPromise(),
    );
    expect(result).toBe(true);
    expect(auth.rememberRedirectUrl).not.toHaveBeenCalled();
  });

  it('redirects to login when user is missing', async () => {
    const auth = {
      restoreSession: vi.fn(() => of<AuthUser | null>(null)),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (authGuard(route(), state('/patients')) as any).toPromise(),
    );
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    expect(auth.rememberRedirectUrl).toHaveBeenCalledWith('/patients');
  });

  it('redirects to login when restoreSession fails', async () => {
    const auth = {
      restoreSession: vi.fn(() => throwError(() => new Error('boom'))),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() => (authGuard(route(), state('/samples')) as any).toPromise());
    expect(result instanceof UrlTree).toBe(true);
    expect(auth.rememberRedirectUrl).toHaveBeenCalledWith('/samples');
  });
});

describe('authChildGuard', () => {
  it('allows activation when user is present', async () => {
    const auth = {
      restoreSession: vi.fn(() => of<AuthUser | null>(sampleUser)),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (authChildGuard(route(), state('/tumors')) as any).toPromise(),
    );
    expect(result).toBe(true);
  });
});

describe('anonymousOnlyGuard', () => {
  it('redirects authenticated users to /dashboard', async () => {
    const auth = {
      restoreSession: vi.fn(() => of<AuthUser | null>(sampleUser)),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (anonymousOnlyGuard(route(), state('/login')) as any).toPromise(),
    );
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('allows access when no user is logged in', async () => {
    const auth = {
      restoreSession: vi.fn(() => of<AuthUser | null>(null)),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (anonymousOnlyGuard(route(), state('/login')) as any).toPromise(),
    );
    expect(result).toBe(true);
  });

  it('falls back to allow access when session restore fails', async () => {
    const auth = {
      restoreSession: vi.fn(() => throwError(() => new Error('nope'))),
      rememberRedirectUrl: vi.fn(),
    };
    setupGuardTest(auth);
    const result = await runGuard(() =>
      (anonymousOnlyGuard(route(), state('/login')) as any).toPromise(),
    );
    expect(result).toBe(true);
  });
});
