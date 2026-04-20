import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { LCTrial, Passage, PDOTrial, PDXTrial, Trial } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TrialService } from '../../../trials/services/trial.service';
import { PassageService } from '../../services/passage.service';
import { PassageDetailPage } from './passage-detail.page';

interface SetupOptions {
  id?: string;
  passage?: Passage;
  trials?: Trial[];
  pdx?: PDXTrial[];
  pdo?: PDOTrial[];
  lc?: LCTrial[];
  dialogResult?: unknown;
  deleteResult?: 'ok' | 'error';
  createTrialResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const id = opts.id ?? 'P-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const passageService = {
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as PassageService;
  const trialService = {
    createWithSubtype: vi.fn(() =>
      opts.createTrialResult === 'error' ? throwError(() => new Error('boom')) : of({} as Trial),
    ),
  } as unknown as TrialService;
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
      { provide: TrialService, useValue: trialService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PassageDetailPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  httpMock
    .expectOne(`/api/passages/${id}`)
    .flush(opts.passage ?? ({ id, number: 1, biomodel_id: 'B-1' } as Passage));
  httpMock.expectOne('/api/trials').flush(opts.trials ?? []);
  httpMock.expectOne('/api/pdx-trials').flush(opts.pdx ?? []);
  httpMock.expectOne('/api/pdo-trials').flush(opts.pdo ?? []);
  httpMock.expectOne('/api/lc-trials').flush(opts.lc ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, passageService, trialService, dialog };
}

describe('PassageDetailPage', () => {
  it('resolves filteredTrials with their typed flavor', async () => {
    const { fixture } = await setup({
      trials: [
        { id: 'T-1', passage_id: 'P-1' } as Trial,
        { id: 'T-2', passage_id: 'P-1' } as Trial,
        { id: 'T-3', passage_id: 'P-1' } as Trial,
        { id: 'T-4', passage_id: 'P-1' } as Trial,
        { id: 'T-9', passage_id: 'P-OTHER' } as Trial,
      ],
      pdx: [{ id: 'T-1' } as PDXTrial],
      pdo: [{ id: 'T-2' } as PDOTrial],
      lc: [{ id: 'T-3' } as LCTrial],
    });
    const filtered = fixture.componentInstance.filteredTrials();
    expect(filtered.map((t) => t.id)).toEqual(['T-1', 'T-2', 'T-3', 'T-4']);
    expect(filtered.map((t) => t.type)).toEqual(['PDX', 'PDO', 'LC', 'Unknown']);
  });

  it('navigates to trial detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onTrialClick({ id: 'T-9' } as Trial);
    expect(navSpy).toHaveBeenCalledWith(['/trials', 'T-9']);
  });

  it('creates a trial with subtype when dialog returns one', async () => {
    const { fixture, trialService, notification } = await setup({
      dialogResult: { trialType: 'PDX', passage_id: 'P-1', success: true },
    });
    fixture.componentInstance.openCreateTrialDialog();
    expect(trialService.createWithSubtype).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies error when trial creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { trialType: 'PDO', passage_id: 'P-1', success: false },
      createTrialResult: 'error',
    });
    fixture.componentInstance.openCreateTrialDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when trial dialog has no result or missing trialType', async () => {
    const { fixture, trialService } = await setup({ dialogResult: undefined });
    fixture.componentInstance.openCreateTrialDialog();
    expect(trialService.createWithSubtype).not.toHaveBeenCalled();

    (trialService.createWithSubtype as ReturnType<typeof vi.fn>).mockClear();
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      afterClosed: () => of({ passage_id: 'P-1' } as Partial<Trial>),
    });
    fixture.componentInstance.openCreateTrialDialog();
    expect(trialService.createWithSubtype).not.toHaveBeenCalled();
  });

  it('deletes the passage and navigates to the list', async () => {
    const { fixture, passageService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(passageService.delete).toHaveBeenCalledWith('P-1');
    expect(navSpy).toHaveBeenCalledWith(['/passages']);
  });

  it('notifies error on delete failure', async () => {
    const { fixture, notification } = await setup({
      dialogResult: true,
      deleteResult: 'error',
    });
    fixture.componentInstance.confirmDelete();
    expect(notification.error).toHaveBeenCalled();
  });

  it('skips delete when confirmation is declined', async () => {
    const { fixture, passageService } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(passageService.delete).not.toHaveBeenCalled();
  });
});
