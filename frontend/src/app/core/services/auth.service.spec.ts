import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { API_URL } from '../tokens/api-url.token';
import { AuthUser } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

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
    req.flush(
      { detail: 'Authentication required.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.initialized()).toBe(true);
  });

  it('should remember and consume a redirect url once', () => {
    service.rememberRedirectUrl('/patients');

    expect(service.consumeRedirectUrl()).toBe('/patients');
    expect(service.consumeRedirectUrl()).toBe('/dashboard');
  });
});