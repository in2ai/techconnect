import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import {
  Biomodel,
  Cryopreservation,
  FACS,
  LCTrial,
  Mouse,
  Passage,
  PDXTrial,
  TrialGenomicSequencing,
  TrialImage,
  TrialMolecularData,
  UsageRecord,
} from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PassageService } from '../../services/passage.service';
import { PassageDetailPage } from './passage-detail.page';

interface SetupOptions {
  id?: string;
  dialogResult?: unknown;
  deleteResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const id = opts.id ?? 'BM-1-P1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const passageService = {
    update: vi.fn(() => of({} as Passage)),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as PassageService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [PassageDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: PassageService, useValue: passageService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PassageDetailPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();

  httpMock.expectOne(`/api/passages/${id}`).flush({
    id,
    biomodel_id: 'BM-1',
    success: true,
  } as Passage);
  httpMock.expectOne('/api/biomodels').flush([
    {
      id: 'BM-1',
      type: 'PDX',
      description: null,
      creation_date: null,
      status: null,
      success: null,
      tumor_biobank_code: 'T-1',
      parent_passage_id: null,
      tumor_organ: null,
    },
    {
      id: 'BM-CHILD',
      type: 'PDX',
      description: null,
      creation_date: null,
      status: null,
      success: null,
      tumor_biobank_code: 'T-1',
      parent_passage_id: id,
      tumor_organ: null,
    },
  ] as Biomodel[]);
  httpMock.expectOne('/api/pdx-trials').flush([{ id } as PDXTrial]);
  httpMock.expectOne('/api/pdo-trials').flush([]);
  httpMock.expectOne('/api/lc-trials').flush([{ id } as LCTrial]);
  httpMock.expectOne('/api/implants').flush([]);
  httpMock.expectOne('/api/mice').flush([{ id: 'M-1', pdx_trial_id: id } as Mouse]);
  httpMock
    .expectOne('/api/usage-records')
    .flush([
      { id: 'U-1', passage_id: id } as UsageRecord,
      { id: 'U-2', passage_id: 'OTHER' } as UsageRecord,
    ]);
  httpMock.expectOne('/api/images').flush([{ id: 'IMG-1', passage_id: id } as TrialImage]);
  httpMock
    .expectOne('/api/cryopreservations')
    .flush([{ id: 'C-1', passage_id: id } as Cryopreservation]);
  httpMock.expectOne('/api/measures').flush([]);
  httpMock.expectOne('/api/facs').flush([{ id: 'F-1', lc_trial_id: id } as FACS]);
  httpMock
    .expectOne('/api/trial-genomic-sequencings')
    .flush([{ id: 'G-1', passage_id: id } as TrialGenomicSequencing]);
  httpMock
    .expectOne('/api/trial-molecular-data')
    .flush([{ id: 'MO-1', passage_id: id } as TrialMolecularData]);
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, httpMock, navSpy, notification, passageService };
}

describe('PassageDetailPage', () => {
  it('filters passage-owned related data by passage id', async () => {
    const { fixture, httpMock } = await setup();
    expect(fixture.componentInstance.currentBiomodel()?.type).toBe('PDX');
    expect(fixture.componentInstance.filteredUsage().map((item) => item.id)).toEqual(['U-1']);
    expect(fixture.componentInstance.filteredGenomic().map((item) => item.id)).toEqual(['G-1']);
    expect(fixture.componentInstance.filteredBiomodels().map((item) => item.id)).toEqual([
      'BM-CHILD',
    ]);
    httpMock.verify();
  });

  it('updates a passage from the edit dialog', async () => {
    const { fixture, passageService, notification } = await setup({
      dialogResult: { description: 'updated' },
    });
    fixture.componentInstance.openEditDialog();
    expect(passageService.update).toHaveBeenCalledWith('BM-1-P1', { description: 'updated' });
    expect(notification.success).toHaveBeenCalled();
  });

  it('deletes the passage and navigates to the list', async () => {
    const { fixture, passageService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(passageService.delete).toHaveBeenCalledWith('BM-1-P1');
    expect(navSpy).toHaveBeenCalledWith(['/passages']);
  });

  it('notifies error on delete failure', async () => {
    const { fixture, notification } = await setup({ dialogResult: true, deleteResult: 'error' });
    fixture.componentInstance.confirmDelete();
    expect(notification.error).toHaveBeenCalled();
  });
});
