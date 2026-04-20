import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BiomodelService } from '../../services/biomodel.service';
import { BiomodelListPage } from './biomodel-list.page';

async function setup(
  opts: {
    biomodels?: Biomodel[];
    dialogResult?: Partial<Biomodel> | null;
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
        : of({ id: 'B-1' } as Biomodel),
    ),
  } as unknown as BiomodelService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult ?? null),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [BiomodelListPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: BiomodelService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(BiomodelListPage);
  fixture.detectChanges();
  httpMock.expectOne('/api/biomodels').flush(opts.biomodels ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, service, dialog };
}

describe('BiomodelListPage', () => {
  it('renders the empty state when there are no biomodels', async () => {
    const { fixture } = await setup({ biomodels: [] });
    expect(fixture.nativeElement.textContent).toContain('No biomodels yet');
  });

  it('computes filters from the biomodels payload', async () => {
    const { fixture } = await setup({
      biomodels: [
        { id: 'B-1', type: 'PDX', tumor_organ: 'Liver' } as Biomodel,
        { id: 'B-2', type: null, tumor_organ: 'Lung' } as unknown as Biomodel,
      ],
    });
    const filters = fixture.componentInstance.tableFilters();
    expect(filters[0].options.map((o) => o.value)).toEqual(['Liver', 'Lung']);
    expect(filters[1].options.map((o) => o.value)).toEqual(['PDX']);
  });

  it('navigates to the biomodel detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onBiomodelClick({ id: 'B-9' } as Biomodel);
    expect(navSpy).toHaveBeenCalledWith(['/biomodels', 'B-9']);
  });

  it('creates a biomodel and notifies on success', async () => {
    const { fixture, service, notification, httpMock } = await setup({
      dialogResult: { id: 'B-1', type: 'PDX' } as Biomodel,
    });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    httpMock.match('/api/biomodels').forEach((r) => r.flush([]));
  });

  it('notifies an error when creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { id: 'B-1' } as Biomodel,
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
    expect(fixture.nativeElement.textContent).not.toContain('Add Biomodel');
  });
});
