import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginPage } from './login.page';

function setup(opts: { loginResult: 'ok' | 'error'; redirectUrl?: string }) {
  const loginMock = vi.fn(() =>
    opts.loginResult === 'ok' ? of({ id: 'u-1' }) : throwError(() => new Error('bad')),
  );
  const authMock = {
    login: loginMock,
    consumeRedirectUrl: vi.fn(() => opts.redirectUrl ?? '/dashboard'),
  } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn() };

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
});
