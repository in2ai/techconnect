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
  Implant,
  LCTrial,
  Measure,
  Mouse,
  PDOTrial,
  PDXTrial,
  Trial,
  TrialGenomicSequencing,
  TrialImage,
  TrialMolecularData,
  UsageRecord,
} from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TrialService } from '../../services/trial.service';
import { TrialDetailPage } from './trial-detail.page';

interface SetupOptions {
  id?: string;
  trial?: Trial;
  pdx?: PDXTrial[];
  pdo?: PDOTrial[];
  lc?: LCTrial[];
  mice?: Mouse[];
  implants?: Implant[];
  measures?: Measure[];
  usage?: UsageRecord[];
  images?: TrialImage[];
  cryo?: Cryopreservation[];
  facs?: FACS[];
  genomic?: TrialGenomicSequencing[];
  molecular?: TrialMolecularData[];
  biomodels?: Biomodel[];
  dialogResult?: unknown;
  updateResult?: 'ok' | 'error';
  deleteResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const id = opts.id ?? 'T-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const trialService = {
    update: vi.fn(() =>
      opts.updateResult === 'error' ? throwError(() => new Error('boom')) : of({} as Trial),
    ),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as TrialService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [TrialDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: TrialService, useValue: trialService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TrialDetailPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  httpMock
    .expectOne(`/api/trials/${id}`)
    .flush(opts.trial ?? ({ id, passage_id: 'P-1', success: true } as Trial));
  httpMock.expectOne('/api/pdx-trials').flush(opts.pdx ?? []);
  httpMock.expectOne('/api/pdo-trials').flush(opts.pdo ?? []);
  httpMock.expectOne('/api/lc-trials').flush(opts.lc ?? []);
  httpMock.expectOne('/api/implants').flush(opts.implants ?? []);
  httpMock.expectOne('/api/mice').flush(opts.mice ?? []);
  httpMock.expectOne('/api/usage-records').flush(opts.usage ?? []);
  httpMock.expectOne('/api/images').flush(opts.images ?? []);
  httpMock.expectOne('/api/cryopreservations').flush(opts.cryo ?? []);
  httpMock.expectOne('/api/measures').flush(opts.measures ?? []);
  httpMock.expectOne('/api/facs').flush(opts.facs ?? []);
  httpMock.expectOne('/api/trial-genomic-sequencings').flush(opts.genomic ?? []);
  httpMock.expectOne('/api/trial-molecular-data').flush(opts.molecular ?? []);
  httpMock.expectOne('/api/biomodels').flush(opts.biomodels ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, trialService, dialog };
}

describe('TrialDetailPage', () => {
  it('resolves current subtype trials and filtered children', async () => {
    const { fixture } = await setup({
      id: 'T-1',
      pdx: [{ id: 'T-1' } as PDXTrial],
      pdo: [{ id: 'T-1' } as PDOTrial],
      lc: [{ id: 'T-1' } as LCTrial],
      mice: [
        { id: 'M-1', pdx_trial_id: 'T-1' } as Mouse,
        { id: 'M-2', pdx_trial_id: 'T-OTHER' } as Mouse,
      ],
      implants: [
        { id: 'I-1', mouse_id: 'M-1' } as Implant,
        { id: 'I-2', mouse_id: 'M-2' } as Implant,
      ],
      measures: [
        { id: 'Me-1', implant_id: 'I-1' } as Measure,
        { id: 'Me-2', implant_id: 'I-2' } as Measure,
      ],
      usage: [
        { id: 'U-1', trial_id: 'T-1' } as UsageRecord,
        { id: 'U-2', trial_id: 'T-OTHER' } as UsageRecord,
      ],
      images: [{ id: 'Img-1', trial_id: 'T-1' } as TrialImage],
      cryo: [{ id: 'C-1', trial_id: 'T-1' } as Cryopreservation],
      facs: [{ id: 'F-1', lc_trial_id: 'T-1' } as FACS],
      genomic: [{ id: 'G-1', trial_id: 'T-1' } as TrialGenomicSequencing],
      molecular: [{ id: 'Mo-1', trial_id: 'T-1' } as TrialMolecularData],
      biomodels: [{ id: 'B-1', parent_trial_id: 'T-1' } as Biomodel],
    });
    const c = fixture.componentInstance;
    expect(c.currentPdxTrial()?.id).toBe('T-1');
    expect(c.currentPdoTrial()?.id).toBe('T-1');
    expect(c.currentLcTrial()?.id).toBe('T-1');
    expect(c.filteredMice().map((m) => m.id)).toEqual(['M-1']);
    expect(c.filteredImplants().map((i) => i.id)).toEqual(['I-1']);
    expect(c.filteredMeasures().map((m) => m.id)).toEqual(['Me-1']);
    expect(c.filteredUsage().map((u) => u.id)).toEqual(['U-1']);
    expect(c.filteredImages().map((i) => i.id)).toEqual(['Img-1']);
    expect(c.filteredCryo().map((i) => i.id)).toEqual(['C-1']);
    expect(c.filteredFACS().map((i) => i.id)).toEqual(['F-1']);
    expect(c.filteredGenomic().map((i) => i.id)).toEqual(['G-1']);
    expect(c.filteredMolecular().map((i) => i.id)).toEqual(['Mo-1']);
    expect(c.filteredBiomodels().map((i) => i.id)).toEqual(['B-1']);
  });

  it('updates the trial when the edit dialog returns a payload', async () => {
    const { fixture, trialService, notification } = await setup({
      dialogResult: { description: 'x' },
    });
    fixture.componentInstance.openEditDialog();
    expect(trialService.update).toHaveBeenCalledWith('T-1', { description: 'x' });
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when trial update fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { description: 'x' },
      updateResult: 'error',
    });
    fixture.componentInstance.openEditDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('skips edit when the dialog is dismissed or no value is loaded', async () => {
    const { fixture, trialService, dialog } = await setup({ dialogResult: null });
    fixture.componentInstance.openEditDialog();
    expect(trialService.update).not.toHaveBeenCalled();

    vi.spyOn(fixture.componentInstance.trialResource, 'value').mockReturnValue(undefined);
    (dialog.open as ReturnType<typeof vi.fn>).mockClear();
    fixture.componentInstance.openEditDialog();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('deletes the trial and navigates back to the list', async () => {
    const { fixture, trialService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(trialService.delete).toHaveBeenCalledWith('T-1');
    expect(navSpy).toHaveBeenCalledWith(['/trials']);
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
    const { fixture, trialService } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(trialService.delete).not.toHaveBeenCalled();
  });

  it('opens entity forms and reloads resources when the result is truthy', async () => {
    const { fixture, dialog } = await setup({ dialogResult: { ok: true } });
    const reloadSpies = {
      mouse: vi.spyOn(fixture.componentInstance.mouseResource, 'reload'),
      implant: vi.spyOn(fixture.componentInstance.implantsResource, 'reload'),
      measure: vi.spyOn(fixture.componentInstance.measuresResource, 'reload'),
      usage: vi.spyOn(fixture.componentInstance.usageResource, 'reload'),
      image: vi.spyOn(fixture.componentInstance.imagesResource, 'reload'),
      cryo: vi.spyOn(fixture.componentInstance.cryoResource, 'reload'),
      facs: vi.spyOn(fixture.componentInstance.facsResource, 'reload'),
      genomic: vi.spyOn(fixture.componentInstance.genomicResource, 'reload'),
      molecular: vi.spyOn(fixture.componentInstance.molecularResource, 'reload'),
      biomodel: vi.spyOn(fixture.componentInstance.biomodelsResource, 'reload'),
    };
    fixture.componentInstance.openMouseForm();
    fixture.componentInstance.openImplantForm();
    fixture.componentInstance.openMeasureForm();
    fixture.componentInstance.openUsageForm();
    fixture.componentInstance.openImageForm();
    fixture.componentInstance.openCryoForm();
    fixture.componentInstance.openFacsForm();
    fixture.componentInstance.openGenomicForm();
    fixture.componentInstance.openMolecularForm();
    fixture.componentInstance.openBiomodelForm();
    expect(dialog.open).toHaveBeenCalledTimes(10);
    for (const spy of Object.values(reloadSpies)) {
      expect(spy).toHaveBeenCalled();
    }
  });

  it('does not reload when entity form is dismissed without a result', async () => {
    const { fixture } = await setup({ dialogResult: null });
    const reloadSpy = vi.spyOn(fixture.componentInstance.mouseResource, 'reload');
    fixture.componentInstance.openMouseForm();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
