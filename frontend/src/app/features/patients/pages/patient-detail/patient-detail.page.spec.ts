import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Patient, Tumor } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TumorService } from '../../../tumors/services/tumor.service';
import { PatientService } from '../../services/patient.service';
import { PatientDetailPage } from './patient-detail.page';

interface SetupOptions {
  nhc?: string;
  patient?: Patient;
  tumors?: Tumor[];
  dialogResult?: unknown;
  updateResult?: 'ok' | 'error';
  deleteResult?: 'ok' | 'error';
  createTumorResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const nhc = opts.nhc ?? 'P-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const patientService = {
    update: vi.fn(() =>
      opts.updateResult === 'error' ? throwError(() => new Error('boom')) : of({} as Patient),
    ),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as PatientService;
  const tumorService = {
    create: vi.fn(() =>
      opts.createTumorResult === 'error' ? throwError(() => new Error('boom')) : of({} as Tumor),
    ),
  } as unknown as TumorService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [PatientDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: PatientService, useValue: patientService },
      { provide: TumorService, useValue: tumorService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(PatientDetailPage);
  fixture.componentRef.setInput('nhc', nhc);
  fixture.detectChanges();

  const patientReq = httpMock.expectOne(`/api/patients/${nhc}`);
  patientReq.flush(opts.patient ?? ({ nhc, sex: 'F', birth_date: '1990-01-01' } as Patient));

  httpMock.expectOne('/api/tumors').flush(opts.tumors ?? []);
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, httpMock, navSpy, notification, patientService, tumorService, dialog };
}

describe('PatientDetailPage', () => {
  it('exposes the patient nhc in the pageTitle and breadcrumbs', async () => {
    const { fixture } = await setup({ nhc: 'P-42' });
    expect(fixture.componentInstance.pageTitle()).toContain('P-42');
    expect(fixture.componentInstance.breadcrumbs().at(-1)?.label).toBe('P-42');
  });

  it('filters tumors by patient nhc', async () => {
    const { fixture } = await setup({
      nhc: 'P-1',
      tumors: [
        { biobank_code: 'T-1', patient_nhc: 'P-1' } as Tumor,
        { biobank_code: 'T-2', patient_nhc: 'P-2' } as Tumor,
      ],
    });
    expect(fixture.componentInstance.filteredTumors().map((t) => t.biobank_code)).toEqual(['T-1']);
  });

  it('navigates to the tumor detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onTumorClick({ biobank_code: 'T-9' } as Tumor);
    expect(navSpy).toHaveBeenCalledWith(['/tumors', 'T-9']);
  });

  it('edits the patient when the dialog returns a payload', async () => {
    const { fixture, patientService, notification } = await setup({ dialogResult: { sex: 'M' } });
    fixture.componentInstance.openEditDialog();
    expect(patientService.update).toHaveBeenCalledWith('P-1', { sex: 'M' });
    expect(notification.success).toHaveBeenCalled();
  });

  it('reports an error when editing fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { sex: 'M' },
      updateResult: 'error',
    });
    fixture.componentInstance.openEditDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('skips edit when the patient resource has no value', async () => {
    const { fixture, patientService, dialog } = await setup();
    vi.spyOn(fixture.componentInstance.patientResource, 'value').mockReturnValue(undefined);
    fixture.componentInstance.openEditDialog();
    expect(patientService.update).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('creates a tumor seeded with the patient nhc', async () => {
    const { fixture, tumorService, notification } = await setup({
      dialogResult: { biobank_code: 'T-1', patient_nhc: 'P-1' },
    });
    fixture.componentInstance.openCreateTumorDialog();
    expect(tumorService.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('reports an error when tumor creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { biobank_code: 'T-1' },
      createTumorResult: 'error',
    });
    fixture.componentInstance.openCreateTumorDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('deletes the patient and navigates back to the list', async () => {
    const { fixture, patientService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(patientService.delete).toHaveBeenCalledWith('P-1');
    expect(navSpy).toHaveBeenCalledWith(['/patients']);
  });

  it('reports an error when delete fails', async () => {
    const { fixture, notification } = await setup({ dialogResult: true, deleteResult: 'error' });
    fixture.componentInstance.confirmDelete();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when delete confirmation is declined', async () => {
    const { fixture, patientService } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(patientService.delete).not.toHaveBeenCalled();
  });
});
