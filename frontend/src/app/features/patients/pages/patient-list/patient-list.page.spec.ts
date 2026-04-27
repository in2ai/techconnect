import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Patient } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PatientService } from '../../services/patient.service';
import { PatientListPage } from './patient-list.page';

async function setup(
  opts: {
    patients?: Patient[];
    dialogResult?: Partial<Patient> | null;
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
        : of({ nhc: 'P-1' } as Patient),
    ),
  } as unknown as PatientService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult ?? null),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [PatientListPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: PatientService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PatientListPage);
  fixture.detectChanges();
  const req = httpMock.expectOne('/api/patients');
  req.flush(opts.patients ?? []);
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, httpMock, navSpy, notification, service, dialog, dialogRef };
}

describe('PatientListPage', () => {
  it('requests patients and renders the empty state when none come back', async () => {
    const { fixture, httpMock } = await setup({ patients: [] });
    expect(fixture.nativeElement.textContent).toContain('No patients yet');
    httpMock.verify();
  });

  it('renders the data table when patients are returned', async () => {
    const { fixture } = await setup({
      patients: [{ nhc: 'P-1', sex: 'F', age: 36 } as Patient],
    });
    expect(fixture.nativeElement.textContent).toContain('P-1');
  });

  it('computes filters only for non-empty sex values', async () => {
    const { fixture } = await setup({
      patients: [
        { nhc: 'P-1', sex: 'F' } as Patient,
        { nhc: 'P-2', sex: null } as unknown as Patient,
        { nhc: 'P-3', sex: 'M' } as Patient,
      ],
    });
    const filters = fixture.componentInstance.tableFilters();
    expect(filters[0].options.map((o) => o.value)).toEqual(['F', 'M']);
  });

  it('navigates to the patient detail when a row is clicked', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onPatientClick({ nhc: 'P-42' } as Patient);
    expect(navSpy).toHaveBeenCalledWith(['/patients', 'P-42']);
  });

  it('creates a patient when the dialog returns a value', async () => {
    const { fixture, service, notification, httpMock } = await setup({
      dialogResult: { nhc: 'P-1', sex: 'F' },
    });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    httpMock.match('/api/patients').forEach((r) => r.flush([]));
  });

  it('reports an error when patient creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { nhc: 'P-1' },
      createResult: 'error',
    });
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fixture.componentInstance.openCreateDialog();
    expect(notification.error).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('does nothing when the create dialog is dismissed without a result', async () => {
    const { fixture, service } = await setup({ dialogResult: null });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('does not expose the add button to non-admin users', async () => {
    const { fixture } = await setup({ isAdmin: false });
    expect(fixture.nativeElement.textContent).not.toContain('Add Patient');
  });
});
