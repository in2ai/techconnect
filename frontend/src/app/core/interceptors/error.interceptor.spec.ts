import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import { vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let notification: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notification = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function trigger(status: number, body: any = {}, statusText = 'Err'): void {
    http.get('/x').subscribe({ error: () => undefined });
    httpTesting.expectOne('/x').flush(body, { status, statusText });
  }

  it('notifies connectivity error for status 0', () => {
    trigger(0);
    expect(notification.error).toHaveBeenCalledWith(
      'Unable to connect to the server. Please check your connection.',
    );
  });

  it('does not notify on 401 and lets auth interceptor handle it', () => {
    trigger(401);
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('notifies a friendly 404 message', () => {
    trigger(404);
    expect(notification.error).toHaveBeenCalledWith('The requested resource was not found.');
  });

  it('notifies a 422 validation message', () => {
    trigger(422);
    expect(notification.error).toHaveBeenCalledWith('Validation error. Please check your input.');
  });

  it('notifies a 500 server message', () => {
    trigger(500);
    expect(notification.error).toHaveBeenCalledWith(
      'A server error occurred. Please try again later.',
    );
  });

  it('surfaces string details from errors under 500 when no specific branch matches', () => {
    trigger(400, { detail: 'Bad NHC' });
    expect(notification.error).toHaveBeenCalledWith('Bad NHC');
  });

  it('falls back to generic message when no detail provided', () => {
    trigger(400, null);
    expect(notification.error).toHaveBeenCalledWith('An unexpected error occurred');
  });

  it('uses a generic message when the detail is not a string', () => {
    trigger(400, { detail: [{ msg: 'oops' }] });
    expect(notification.error).toHaveBeenCalledWith('Request failed. Please try again.');
  });
});
