import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginPage } from './login.page';

function setup(opts: { loginResult: 'ok' | 'error'; redirectUrl?: string }) {
  const loginMock = vi.fn(() =>
    opts.loginResult === 'ok'
      ? of({ id: 'u-1' })
      : throwError(() => new HttpErrorResponse({ status: 401 })),
  );
  const authMock = {
    login: loginMock,
    consumeRedirectUrl: vi.fn(() => opts.redirectUrl ?? '/dashboard'),
  };
  const notification = {
    success: vi.fn(),
    error: vi.fn(),
    requestError: NotificationService.prototype.requestError,
  };

  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: AuthService, useValue: authMock },
      { provide: NotificationService, useValue: notification },
    ],
  });

  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  return { fixture, loginMock, navSpy, notification, authMock };
}

describe('LoginPage', () => {
  it('does not attempt to log in when the form is invalid', () => {
    const { fixture, loginMock } = setup({ loginResult: 'ok' });
    fixture.componentInstance.submit();
    expect(loginMock).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.email.touched).toBe(true);
  });

  it('logs in, notifies success, and navigates to the redirect url', () => {
    const { fixture, loginMock, notification, navSpy } = setup({
      loginResult: 'ok',
      redirectUrl: '/patients',
    });
    fixture.componentInstance.form.setValue({
      email: 'admin@example.com',
      password: 'secret',
    });
    fixture.componentInstance.submit();

    expect(loginMock).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'secret',
    });
    expect(notification.success).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith('/patients');
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('notifies an error and stays on the page on bad credentials', () => {
    const { fixture, notification, navSpy } = setup({ loginResult: 'error' });
    fixture.componentInstance.form.setValue({
      email: 'admin@example.com',
      password: 'bad',
    });
    fixture.componentInstance.submit();
    expect(notification.error).toHaveBeenCalled();
    expect(navSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('toggles the password visibility signal', () => {
    const { fixture } = setup({ loginResult: 'ok' });
    expect(fixture.componentInstance.hidePassword()).toBe(true);
    fixture.componentInstance.hidePassword.set(false);
    expect(fixture.componentInstance.hidePassword()).toBe(false);
  });

  it.each([
    { status: 401, message: 'Invalid email or password.' },
    { status: 500, message: 'A server error occurred. Please try again later.' },
    { status: 0, message: 'Unable to connect to the server. Please check your connection.' },
  ])('shows one appropriate login error for HTTP $status', ({ status, message }) => {
    const notification = {
      success: vi.fn(),
      error: vi.fn(),
      requestError: NotificationService.prototype.requestError,
    };
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: NotificationService, useValue: notification },
      ],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.form.setValue({ email: 'admin@example.com', password: 'test' });
    fixture.componentInstance.submit();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/login').flush(null, { status, statusText: 'Login failed' });

    expect(notification.error).toHaveBeenCalledExactlyOnceWith(message);
    expect(notification.success).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
    http.verify();
  });

  it('reports unexpected login failures without blaming the credentials', () => {
    const { fixture, loginMock, notification } = setup({ loginResult: 'error' });
    loginMock.mockReturnValue(throwError(() => new Error('unexpected failure')));
    fixture.componentInstance.form.setValue({ email: 'admin@example.com', password: 'test' });
    fixture.componentInstance.submit();

    expect(notification.error).toHaveBeenCalledExactlyOnceWith(
      'Unable to sign in. Please try again.',
    );
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });
});
