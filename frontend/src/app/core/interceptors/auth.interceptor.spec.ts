import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth.service';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authMock: { handleUnauthorized: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authMock = { handleUnauthorized: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('calls handleUnauthorized on 401 outside auth endpoints', () => {
    http.get('/api/patients').subscribe({ error: () => undefined });
    httpTesting
      .expectOne('/api/patients')
      .flush({ detail: 'nope' }, { status: 401, statusText: 'Unauthorized' });
    expect(authMock.handleUnauthorized).toHaveBeenCalled();
  });

  it('ignores 401 for /auth/login and /auth/me', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    http.get('/api/auth/me').subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.handleUnauthorized).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors without touching auth', () => {
    http.get('/api/patients').subscribe({ error: () => undefined });
    httpTesting
      .expectOne('/api/patients')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(authMock.handleUnauthorized).not.toHaveBeenCalled();
  });
});
