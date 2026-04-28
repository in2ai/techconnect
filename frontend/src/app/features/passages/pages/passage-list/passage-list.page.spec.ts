import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Passage } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PassageService } from '../../services/passage.service';
import { PassageListPage } from './passage-list.page';

async function setup(
  opts: {
    passages?: Passage[];
    dialogResult?: Partial<Passage> | null;
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
        : of({ id: 'P-1' } as Passage),
    ),
  } as unknown as PassageService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult ?? null),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [PassageListPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: PassageService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PassageListPage);
  fixture.detectChanges();
  httpMock.expectOne('/api/passages').flush(opts.passages ?? []);
  httpMock.expectOne('/api/biomodels').flush([{ id: 'B-1', type: 'PDX' }]);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, service, dialog };
}

describe('PassageListPage', () => {
  it('renders the empty state when no passages are returned', async () => {
    const { fixture } = await setup({ passages: [] });
    expect(fixture.nativeElement.textContent).toContain('No passages yet');
  });

  it('renders the data table when passages are returned', async () => {
    const { fixture } = await setup({
      passages: [{ id: 'P-1', number: 1, biomodel_id: 'B-1' } as Passage],
    });
    expect(fixture.nativeElement.textContent).toContain('P-1');
  });

  it('navigates to the passage detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onPassageClick({ id: 'P-42' } as Passage);
    expect(navSpy).toHaveBeenCalledWith(['/passages', 'P-42']);
  });

  it('creates a passage when the dialog returns a payload', async () => {
    const { fixture, service, notification, httpMock } = await setup({
      dialogResult: { id: 'P-1' } as Passage,
    });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    httpMock.match('/api/passages').forEach((r) => r.flush([]));
    httpMock.match('/api/biomodels').forEach((r) => r.flush([]));
  });

  it('notifies an error when passage creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { id: 'P-1' } as Passage,
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
    const addBtn = fixture.nativeElement.querySelector('app-page-header button');
    expect(addBtn).toBeNull();
  });
});
