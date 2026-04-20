import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthUser } from '../models/auth.models';
import { API_URL } from '../tokens/api-url.token';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let router: Router;

  const adminUser: AuthUser = {
    id: 'user-1',
    email: 'admin@techconnect.local',
    full_name: 'Admin User',
    is_admin: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should store the current user after login', () => {
    const user: AuthUser = {
      id: 'user-1',
      email: 'admin@techconnect.local',
      full_name: 'Admin User',
      is_admin: true,
    };

    service.login({ email: user.email, password: 'secret' }).subscribe((result) => {
      expect(result).toEqual(user);
    });

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(user);

    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.initialized()).toBe(true);
  });

  it('should mark the user unauthenticated on an unauthorized session restore', () => {
    service.restoreSession().subscribe((result) => {
      expect(result).toBeNull();
    });

    const req = httpTesting.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({ detail: 'Authentication required.' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.initialized()).toBe(true);
  });

  it('should remember and consume a redirect url once', () => {
    service.rememberRedirectUrl('/patients');

    expect(service.consumeRedirectUrl()).toBe('/patients');
    expect(service.consumeRedirectUrl()).toBe('/dashboard');
  });

  it('ignores empty or /login redirect urls', () => {
    service.rememberRedirectUrl('');
    service.rememberRedirectUrl('/login?foo=1');
    expect(service.consumeRedirectUrl()).toBe('/dashboard');
  });

  it('clears the session when logout completes', () => {
    service.currentUser.set(adminUser);
    service.initialized.set(false);

    service.logout().subscribe();
    const req = httpTesting.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(service.currentUser()).toBeNull();
    expect(service.initialized()).toBe(true);
  });

  it('restoreSession returns current user when already initialized', () => {
    service.currentUser.set(adminUser);
    service.initialized.set(true);

    let emitted: AuthUser | null = null;
    service.restoreSession().subscribe((user) => (emitted = user));
    expect(emitted).toEqual(adminUser);
    httpTesting.expectNone('/api/auth/me');
  });

  it('restoreSession sets the user on success and replays in-flight requests', () => {
    let firstValue: AuthUser | null = null;
    let secondValue: AuthUser | null = null;
    service.restoreSession().subscribe((u) => (firstValue = u));
    service.restoreSession().subscribe((u) => (secondValue = u));

    const req = httpTesting.expectOne('/api/auth/me');
    req.flush(adminUser);

    expect(firstValue).toEqual(adminUser);
    expect(secondValue).toEqual(adminUser);
    expect(service.currentUser()).toEqual(adminUser);
    expect(service.initialized()).toBe(true);
  });

  it('restoreSession rethrows unexpected errors and leaves initialized false', () => {
    let error: unknown;
    service.restoreSession().subscribe({
      next: () => {},
      error: (err) => (error = err),
    });

    httpTesting
      .expectOne('/api/auth/me')
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeTruthy();
    expect(service.initialized()).toBe(false);
  });

  it('handleUnauthorized remembers the current url and navigates to /login', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/patients/42');
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    service.currentUser.set(adminUser);

    service.handleUnauthorized();

    expect(service.currentUser()).toBeNull();
    expect(service.initialized()).toBe(true);
    expect(navSpy).toHaveBeenCalledWith(['/login']);
    expect(service.consumeRedirectUrl()).toBe('/patients/42');
  });

  it('handleUnauthorized does not navigate when already on /login', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login');
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    service.handleUnauthorized();

    expect(navSpy).not.toHaveBeenCalled();
    expect(service.consumeRedirectUrl()).toBe('/dashboard');
  });
});
