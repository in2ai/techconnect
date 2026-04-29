import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel, Passage } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PassageService } from '../../../passages/services/passage.service';
import { BiomodelService } from '../../services/biomodel.service';
import { BiomodelDetailPage } from './biomodel-detail.page';

interface SetupOptions {
  id?: string;
  biomodel?: Biomodel;
  passages?: Passage[];
  dialogResult?: unknown;
  updateResult?: 'ok' | 'error';
  deleteResult?: 'ok' | 'error';
  createPassageResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const id = opts.id ?? 'B-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const biomodelService = {
    update: vi.fn(() =>
      opts.updateResult === 'error' ? throwError(() => new Error('boom')) : of({} as Biomodel),
    ),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as BiomodelService;
  const passageService = {
    create: vi.fn(() =>
      opts.createPassageResult === 'error'
        ? throwError(() => new Error('boom'))
        : of({} as Passage),
    ),
  } as unknown as PassageService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [BiomodelDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: BiomodelService, useValue: biomodelService },
      { provide: PassageService, useValue: passageService },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(BiomodelDetailPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();

  httpMock
    .expectOne(`/api/biomodels/${id}`)
    .flush(opts.biomodel ?? ({ id, type: 'PDX', tumor_biobank_code: 'T-1' } as Biomodel));
  httpMock.expectOne('/api/passages').flush(opts.passages ?? []);
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, httpMock, navSpy, notification, biomodelService, passageService, dialog };
}

describe('BiomodelDetailPage', () => {
  it('filters passages by biomodel_id', async () => {
    const { fixture } = await setup({
      id: 'B-1',
      passages: [
        { id: 'P-1', biomodel_id: 'B-1' } as Passage,
        { id: 'P-2', biomodel_id: 'B-2' } as Passage,
      ],
    });
    expect(fixture.componentInstance.filteredPassages().map((p) => p.id)).toEqual(['P-1']);
  });

  it('navigates to passage detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onPassageClick({ id: 'P-9' } as Passage);
    expect(navSpy).toHaveBeenCalledWith(['/passages', 'P-9']);
  });

  it('updates the biomodel through the edit dialog', async () => {
    const { fixture, biomodelService, notification } = await setup({
      dialogResult: { type: 'PDO' },
    });
    fixture.componentInstance.openEditDialog();
    expect(biomodelService.update).toHaveBeenCalledWith('B-1', { type: 'PDO' });
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when edit fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { type: 'PDO' },
      updateResult: 'error',
    });
    fixture.componentInstance.openEditDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when no biomodel value is loaded', async () => {
    const { fixture, biomodelService, dialog } = await setup();
    vi.spyOn(fixture.componentInstance.biomodelResource, 'value').mockReturnValue(undefined);
    fixture.componentInstance.openEditDialog();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(biomodelService.update).not.toHaveBeenCalled();
  });

  it('creates a passage seeded with the biomodel id', async () => {
    const { fixture, passageService, notification } = await setup({
      dialogResult: { description: 'new passage' },
    });
    fixture.componentInstance.openCreatePassageDialog();
    expect(passageService.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when passage creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { description: 'new passage' },
      createPassageResult: 'error',
    });
    fixture.componentInstance.openCreatePassageDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('deletes the biomodel and navigates to the list', async () => {
    const { fixture, biomodelService, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(biomodelService.delete).toHaveBeenCalledWith('B-1');
    expect(navSpy).toHaveBeenCalledWith(['/biomodels']);
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
    const { fixture, biomodelService } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(biomodelService.delete).not.toHaveBeenCalled();
  });
});
