import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel, Sample, Tumor } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BiomodelService } from '../../../biomodels/services/biomodel.service';
import { SampleService } from '../../../samples/services/sample.service';
import { TumorService } from '../../services/tumor.service';
import { TumorDetailPage } from './tumor-detail.page';

interface SetupOptions {
  biobank?: string;
  tumor?: Tumor;
  biomodels?: Biomodel[];
  samples?: Sample[];
  dialogResult?: unknown;
  updateResult?: 'ok' | 'error';
  deleteResult?: 'ok' | 'error';
  createBiomodelResult?: 'ok' | 'error';
  createSampleResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const biobank = opts.biobank ?? 'T-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const tumorService = {
    update: vi.fn(() =>
      opts.updateResult === 'error' ? throwError(() => new Error('boom')) : of({} as Tumor),
    ),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as TumorService;
  const biomodelService = {
    create: vi.fn(() =>
      opts.createBiomodelResult === 'error'
        ? throwError(() => new Error('boom'))
        : of({} as Biomodel),
    ),
  } as unknown as BiomodelService;
  const sampleService = {
    create: vi.fn(() =>
      opts.createSampleResult === 'error' ? throwError(() => new Error('boom')) : of({} as Sample),
    ),
  } as unknown as SampleService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [TumorDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: TumorService, useValue: tumorService },
      { provide: BiomodelService, useValue: biomodelService },
      { provide: SampleService, useValue: sampleService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TumorDetailPage);
  fixture.componentRef.setInput('biobank_code', biobank);
  fixture.detectChanges();

  httpMock
    .expectOne(`/api/tumors/${biobank}`)
    .flush(opts.tumor ?? ({ biobank_code: biobank, patient_nhc: 'P-1' } as Tumor));
  httpMock.expectOne('/api/biomodels').flush(opts.biomodels ?? []);
  httpMock.expectOne('/api/samples').flush(opts.samples ?? []);
  await fixture.whenStable();
  fixture.detectChanges();

  return {
    fixture,
    httpMock,
    navSpy,
    notification,
    tumorService,
    biomodelService,
    sampleService,
    dialog,
  };
}

describe('TumorDetailPage', () => {
  it('computes filtered biomodels and samples by biobank_code', async () => {
    const { fixture } = await setup({
      biobank: 'T-1',
      biomodels: [
        { id: 'B-1', tumor_biobank_code: 'T-1' } as Biomodel,
        { id: 'B-2', tumor_biobank_code: 'T-2' } as Biomodel,
      ],
      samples: [
        { id: 'S-1', tumor_biobank_code: 'T-1' } as Sample,
        { id: 'S-2', tumor_biobank_code: 'T-2' } as Sample,
      ],
    });
    expect(fixture.componentInstance.filteredBiomodels().map((b) => b.id)).toEqual(['B-1']);
    expect(fixture.componentInstance.filteredSamples().map((s) => s.id)).toEqual(['S-1']);
  });

  it('navigates to biomodel and sample detail on row clicks', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onBiomodelClick({ id: 'B-9' } as Biomodel);
    fixture.componentInstance.onSampleClick({ id: 'S-9' } as Sample);
    expect(navSpy).toHaveBeenCalledWith(['/biomodels', 'B-9']);
    expect(navSpy).toHaveBeenCalledWith(['/samples', 'S-9']);
  });

  it('updates the tumor through the edit dialog', async () => {
    const { fixture, tumorService, notification } = await setup({
      dialogResult: { organ: 'Kidney' },
    });
    fixture.componentInstance.openEditDialog();
    expect(tumorService.update).toHaveBeenCalledWith('T-1', { organ: 'Kidney' });
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when edit fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { organ: 'Kidney' },
      updateResult: 'error',
    });
    fixture.componentInstance.openEditDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when edit has no result or no tumor value', async () => {
    const { fixture, tumorService, dialog } = await setup();
    vi.spyOn(fixture.componentInstance.tumorResource, 'value').mockReturnValue(undefined);
    fixture.componentInstance.openEditDialog();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(tumorService.update).not.toHaveBeenCalled();
  });

  it('creates a biomodel seeded with the tumor biobank code', async () => {
    const { fixture, biomodelService, notification } = await setup({
      dialogResult: { type: 'PDX' },
    });
    fixture.componentInstance.openCreateBiomodelDialog();
    expect(biomodelService.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when biomodel creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { type: 'PDX' },
      createBiomodelResult: 'error',
    });
    fixture.componentInstance.openCreateBiomodelDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('creates a sample seeded with the tumor biobank code', async () => {
    const { fixture, sampleService, notification } = await setup({
      dialogResult: { has_serum: true },
    });
    fixture.componentInstance.openCreateSampleDialog();
    expect(sampleService.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when sample creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { has_serum: true },
      createSampleResult: 'error',
    });
    fixture.componentInstance.openCreateSampleDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('deletes the tumor and navigates back to the list', async () => {
    const { fixture, tumorService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(tumorService.delete).toHaveBeenCalledWith('T-1');
    expect(navSpy).toHaveBeenCalledWith(['/tumors']);
  });

  it('notifies an error when delete fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: true,
      deleteResult: 'error',
    });
    fixture.componentInstance.confirmDelete();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when delete confirmation is declined', async () => {
    const { fixture, tumorService } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(tumorService.delete).not.toHaveBeenCalled();
  });
});
