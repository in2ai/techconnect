import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { LCTrial, PDOTrial, PDXTrial, Trial } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TrialService } from '../../services/trial.service';
import { TrialListPage } from './trial-list.page';

interface SetupOptions {
  trials?: Trial[];
  pdx?: PDXTrial[];
  pdo?: PDOTrial[];
  lc?: LCTrial[];
  dialogResult?: unknown;
  createResult?: 'ok' | 'error';
  isAdmin?: boolean;
}

async function setup(opts: SetupOptions = {}) {
  const authStub = { isAdmin: () => opts.isAdmin ?? true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const trialService = {
    createWithSubtype: vi.fn(() =>
      opts.createResult === 'error' ? throwError(() => new Error('boom')) : of({} as Trial),
    ),
  } as unknown as TrialService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [TrialListPage],
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
  const fixture = TestBed.createComponent(TrialListPage);
  fixture.detectChanges();
  httpMock.expectOne('/api/trials').flush(opts.trials ?? []);
  httpMock.expectOne('/api/pdx-trials').flush(opts.pdx ?? []);
  httpMock.expectOne('/api/pdo-trials').flush(opts.pdo ?? []);
  httpMock.expectOne('/api/lc-trials').flush(opts.lc ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, trialService, dialog };
}

describe('TrialListPage', () => {
  it('renders the empty state when there are no trials', async () => {
    const { fixture } = await setup({ trials: [] });
    expect(fixture.nativeElement.textContent).toContain('No trials yet');
  });

  it('decorates each trial with its subtype', async () => {
    const { fixture } = await setup({
      trials: [
        { id: 'T-1', passage_id: 'P-1' } as Trial,
        { id: 'T-2', passage_id: 'P-1' } as Trial,
        { id: 'T-3', passage_id: 'P-1' } as Trial,
        { id: 'T-4', passage_id: 'P-1' } as Trial,
      ],
      pdx: [{ id: 'T-1' } as PDXTrial],
      pdo: [{ id: 'T-2' } as PDOTrial],
      lc: [{ id: 'T-3' } as LCTrial],
    });
    const typed = fixture.componentInstance.trialsWithType();
    expect(typed.map((t) => t.type)).toEqual(['PDX', 'PDO', 'LC', 'Unknown']);
  });

  it('exposes static filters for trial type and success', async () => {
    const { fixture } = await setup();
    const filters = fixture.componentInstance.tableFilters();
    expect(filters.map((f) => f.key)).toEqual(['type', 'success']);
    expect(filters[0].options.map((o) => o.value)).toEqual(['PDX', 'PDO', 'LC']);
  });

  it('navigates to the trial detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onTrialClick({ id: 'T-9' } as Trial);
    expect(navSpy).toHaveBeenCalledWith(['/trials', 'T-9']);
  });

  it('creates a trial with subtype when the dialog returns a trialType', async () => {
    const { fixture, trialService, notification } = await setup({
      dialogResult: { trialType: 'PDX', success: true },
    });
    fixture.componentInstance.openCreateDialog();
    expect(trialService.createWithSubtype).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when trial creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { trialType: 'PDX', success: true },
      createResult: 'error',
    });
    fixture.componentInstance.openCreateDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('ignores dialog results without a trialType', async () => {
    const { fixture, trialService } = await setup({
      dialogResult: { success: true },
    });
    fixture.componentInstance.openCreateDialog();
    expect(trialService.createWithSubtype).not.toHaveBeenCalled();
  });

  it('does nothing when the dialog is dismissed', async () => {
    const { fixture, trialService } = await setup({ dialogResult: undefined });
    fixture.componentInstance.openCreateDialog();
    expect(trialService.createWithSubtype).not.toHaveBeenCalled();
  });

  it('hides the add button for non-admins', async () => {
    const { fixture } = await setup({ isAdmin: false });
    expect(fixture.nativeElement.querySelector('app-page-header button')).toBeNull();
  });
});
