import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Sample } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SampleService } from '../../services/sample.service';
import { SampleListPage } from './sample-list.page';

async function setup(
  opts: {
    samples?: Sample[];
    dialogResult?: Partial<Sample> | null;
    createResult?: 'ok' | 'error';
    isAdmin?: boolean;
  } = {},
) {
  const authStub = { isAdmin: () => opts.isAdmin ?? true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const service = {
    create: vi.fn(() =>
      opts.createResult === 'error'
        ? throwError(() => new Error('boom'))
        : of({ id: 'S-1' } as Sample),
    ),
  } as unknown as SampleService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult ?? null),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [SampleListPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: SampleService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SampleListPage);
  fixture.detectChanges();
  httpMock.expectOne('/api/samples').flush(opts.samples ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, service, dialog };
}

describe('SampleListPage', () => {
  it('renders the empty state when there are no samples', async () => {
    const { fixture } = await setup({ samples: [] });
    expect(fixture.nativeElement.textContent).toContain('No samples yet');
  });

  it('renders the data table when samples are returned', async () => {
    const { fixture } = await setup({
      samples: [{ id: 'S-1', has_serum: true } as Sample],
    });
    expect(fixture.nativeElement.textContent).toContain('S-1');
  });

  it('exposes a filter for each boolean flag', async () => {
    const { fixture } = await setup();
    const filters = fixture.componentInstance.tableFilters();
    expect(filters.map((f) => f.key)).toEqual(['has_serum', 'has_buffy', 'has_plasma']);
  });

  it('navigates to the sample detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onRowClick({ id: 'S-9' } as Sample);
    expect(navSpy).toHaveBeenCalledWith(['/samples', 'S-9']);
  });

  it('creates a sample when the dialog returns a payload', async () => {
    const { fixture, service, notification, httpMock } = await setup({
      dialogResult: { id: 'S-1', has_serum: true } as Sample,
    });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    httpMock.match('/api/samples').forEach((r) => r.flush([]));
  });

  it('notifies an error when sample creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { id: 'S-1', has_serum: true } as Sample,
      createResult: 'error',
    });
    fixture.componentInstance.openCreateDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when the dialog is dismissed', async () => {
    const { fixture, service } = await setup({ dialogResult: null });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('hides the add button for non-admins', async () => {
    const { fixture } = await setup({ isAdmin: false });
    expect(fixture.nativeElement.querySelector('app-page-header button')).toBeNull();
  });
});
