import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Tumor } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TumorService } from '../../services/tumor.service';
import { TumorListPage } from './tumor-list.page';

async function setup(
  opts: {
    tumors?: Tumor[];
    dialogResult?: Partial<Tumor> | null;
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
        : of({ biobank_code: 'T-1' } as Tumor),
    ),
  } as unknown as TumorService;
  const dialogRef = {
    afterClosed: () => of(opts.dialogResult ?? null),
  } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [TumorListPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: TumorService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TumorListPage);
  fixture.detectChanges();
  httpMock.expectOne('/api/tumors').flush(opts.tumors ?? []);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, service, dialog };
}

describe('TumorListPage', () => {
  it('renders the empty state when no tumors are returned', async () => {
    const { fixture } = await setup({ tumors: [] });
    expect(fixture.nativeElement.textContent).toContain('No tumors yet');
  });

  it('renders a row per tumor and computes filters', async () => {
    const { fixture } = await setup({
      tumors: [
        { biobank_code: 'T-1', organ: 'Liver', classification: 'Class1' } as Tumor,
        { biobank_code: 'T-2', organ: null, classification: 'Class2' } as unknown as Tumor,
      ],
    });
    const filters = fixture.componentInstance.tableFilters();
    expect(filters[0].options.map((o) => o.value)).toEqual(['Liver']);
    expect(filters[1].options.map((o) => o.value)).toEqual(['Class1', 'Class2']);
  });

  it('navigates to the tumor detail on row click', async () => {
    const { fixture, navSpy } = await setup();
    fixture.componentInstance.onTumorClick({ biobank_code: 'T-9' } as Tumor);
    expect(navSpy).toHaveBeenCalledWith(['/tumors', 'T-9']);
  });

  it('creates a tumor and notifies success when the dialog returns a payload', async () => {
    const { fixture, service, notification, httpMock } = await setup({
      dialogResult: { biobank_code: 'T-1' } as Tumor,
    });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).toHaveBeenCalled();
    expect(notification.success).toHaveBeenCalled();
    httpMock.match('/api/tumors').forEach((r) => r.flush([]));
  });

  it('notifies an error when tumor creation fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { biobank_code: 'T-1' } as Tumor,
      createResult: 'error',
    });
    fixture.componentInstance.openCreateDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does nothing when the dialog is dismissed without a payload', async () => {
    const { fixture, service } = await setup({ dialogResult: null });
    fixture.componentInstance.openCreateDialog();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('hides the add button for non-admins', async () => {
    const { fixture } = await setup({ isAdmin: false });
    expect(fixture.nativeElement.textContent).not.toContain('Add Tumor');
  });
});
