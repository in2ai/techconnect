import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Sample } from '@generated/models';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SampleService } from '../../services/sample.service';
import { SampleDetailPage } from './sample-detail.page';

interface SetupOptions {
  id?: string;
  sample?: Sample;
  dialogResult?: unknown;
  updateResult?: 'ok' | 'error';
  deleteResult?: 'ok' | 'error';
}

async function setup(opts: SetupOptions = {}) {
  const id = opts.id ?? 'S-1';
  const authStub = { isAdmin: () => true } as unknown as AuthService;
  const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const service = {
    update: vi.fn(() =>
      opts.updateResult === 'error' ? throwError(() => new Error('boom')) : of({} as Sample),
    ),
    delete: vi.fn(() =>
      opts.deleteResult === 'error' ? throwError(() => new Error('boom')) : of(undefined),
    ),
  } as unknown as SampleService;
  const dialogRef = { afterClosed: () => of(opts.dialogResult) } as MatDialogRef<unknown>;
  const dialog = { open: vi.fn(() => dialogRef) } as unknown as MatDialog;

  TestBed.configureTestingModule({
    imports: [SampleDetailPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: AuthService, useValue: authStub },
      { provide: NotificationService, useValue: notification },
      { provide: SampleService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SampleDetailPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  httpMock.expectOne(`/api/samples/${id}`).flush(
    opts.sample ??
      ({
        id,
        has_serum: true,
        has_buffy: false,
        has_plasma: null,
        has_tumor_tissue: true,
        has_non_tumor_tissue: false,
        is_metastasis: null,
      } as unknown as Sample),
  );
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock, navSpy, notification, service, dialog };
}

describe('SampleDetailPage', () => {
  it('renders the detail card with both truthy and falsy boolean branches', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Yes');
    expect(text).toContain('No');
  });

  it('breadcrumbs include the sample id', async () => {
    const { fixture } = await setup({ id: 'S-42' });
    expect(fixture.componentInstance.breadcrumbs().at(-1)?.label).toBe('S-42');
  });

  it('updates the sample when the edit dialog returns a payload', async () => {
    const { fixture, service, notification } = await setup({
      dialogResult: { has_serum: false },
    });
    fixture.componentInstance.openEditDialog();
    expect(service.update).toHaveBeenCalledWith('S-1', { has_serum: false });
    expect(notification.success).toHaveBeenCalled();
  });

  it('notifies an error when edit fails', async () => {
    const { fixture, notification } = await setup({
      dialogResult: { has_serum: false },
      updateResult: 'error',
    });
    fixture.componentInstance.openEditDialog();
    expect(notification.error).toHaveBeenCalled();
  });

  it('does not update when the dialog is dismissed', async () => {
    const { fixture, service } = await setup({ dialogResult: null });
    fixture.componentInstance.openEditDialog();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('does nothing when the resource has no value', async () => {
    const { fixture, service, dialog } = await setup();
    vi.spyOn(fixture.componentInstance.resource, 'value').mockReturnValue(undefined);
    fixture.componentInstance.openEditDialog();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('deletes the sample and navigates back to the list', async () => {
    const { fixture, service, navSpy } = await setup({ dialogResult: true });
    fixture.componentInstance.confirmDelete();
    expect(service.delete).toHaveBeenCalledWith('S-1');
    expect(navSpy).toHaveBeenCalledWith(['/samples']);
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
    const { fixture, service } = await setup({ dialogResult: false });
    fixture.componentInstance.confirmDelete();
    expect(service.delete).not.toHaveBeenCalled();
  });
});
