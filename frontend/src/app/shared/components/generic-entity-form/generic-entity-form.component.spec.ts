import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { vi } from 'vitest';
import {
  EntityField,
  GenericEntityDialogData,
  GenericEntityFormComponent,
} from './generic-entity-form.component';

const baseFields: EntityField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'count', label: 'Count', type: 'number', integerOnly: true },
  { name: 'due', label: 'Due', type: 'date' },
  { name: 'active', label: 'Active', type: 'boolean' },
];

function setup(options: {
  data: GenericEntityDialogData;
  isAdmin?: boolean;
  dialogRef?: Partial<MatDialogRef<unknown>>;
  notification?: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
}) {
  const notification = options.notification ?? { success: vi.fn(), error: vi.fn() };
  const dialogRef = { close: vi.fn(), ...options.dialogRef };
  const authMock = {
    isAdmin: signal(options.isAdmin ?? true),
  } as unknown as AuthService;

  TestBed.configureTestingModule({
    imports: [GenericEntityFormComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: MAT_DIALOG_DATA, useValue: options.data },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: NotificationService, useValue: notification },
      { provide: AuthService, useValue: authMock },
    ],
  });

  const fixture = TestBed.createComponent(GenericEntityFormComponent);
  fixture.detectChanges();
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    dialogRef,
    notification,
  };
}

describe('GenericEntityFormComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('marks required fields as invalid when empty', () => {
    const { component } = setup({
      data: { title: 'New', endpoint: '/items', fields: baseFields },
    });
    expect(component.isEdit).toBe(false);
    expect(component.form.invalid).toBe(true);
  });

  it('pre-populates values from entity in edit mode', () => {
    const { component } = setup({
      data: {
        title: 'Edit',
        endpoint: '/items',
        fields: baseFields,
        entity: { id: 42, title: 'hello', count: 3, due: '2024-05-01', active: true },
      },
    });
    expect(component.isEdit).toBe(true);
    expect(component.form.value).toEqual({
      title: 'hello',
      count: 3,
      due: '2024-05-01',
      active: true,
    });
  });

  it('disables the form entirely when the user is not an admin', () => {
    const { component } = setup({
      data: { title: 't', endpoint: '/items', fields: baseFields },
      isAdmin: false,
    });
    expect(component.form.disabled).toBe(true);
  });

  it('POSTs to the endpoint with transformed payload on create and closes the dialog', () => {
    const { component, httpMock, dialogRef, notification } = setup({
      data: {
        title: 'New',
        endpoint: '/items',
        fields: baseFields,
        defaultValues: { owner_id: 'u-1' },
      },
    });
    component.form.patchValue({ title: 'hi', count: '7', due: '2024-02-03', active: true });
    component.save();

    const req = httpMock.expectOne('/api/items');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'hi',
      count: 7,
      due: '2024-02-03',
      active: true,
      owner_id: 'u-1',
    });
    req.flush({});
    expect(notification.success).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('PATCHes the existing entity and notifies errors without closing', () => {
    const { component, httpMock, dialogRef, notification } = setup({
      data: {
        title: 'Edit',
        endpoint: '/items',
        fields: baseFields,
        entity: { id: 'ID-9', title: 'hello', count: 1, due: null, active: false },
      },
    });
    component.form.patchValue({ title: 'bye', count: '2' });
    component.save();

    const req = httpMock.expectOne('/api/items/ID-9');
    expect(req.request.method).toBe('PATCH');
    req.flush({ detail: 'bad' }, { status: 422, statusText: 'Unprocessable' });
    expect(notification.error).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.submitting).toBe(false);
  });

  it('uses defaultValues to seed form controls in create mode', () => {
    const { component } = setup({
      data: {
        title: 'New',
        endpoint: '/items',
        fields: baseFields,
        defaultValues: { title: 'seeded', owner_id: 'u-1' },
      },
    });
    expect(component.form.controls['title'].value).toBe('seeded');
  });

  it('does nothing when save() is called while the form is invalid', () => {
    const { component, httpMock, dialogRef } = setup({
      data: { title: 'New', endpoint: '/items', fields: baseFields },
    });
    component.save();
    httpMock.expectNone('/api/items');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('deleteEntity sends a DELETE and closes on success when confirmed', () => {
    const { component, httpMock, dialogRef, notification } = setup({
      data: {
        title: 'Edit',
        endpoint: '/items',
        fields: baseFields,
        entity: { id: 'X-1', title: 'x', count: 1, due: null, active: null },
      },
    });
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    component.deleteEntity();
    const req = httpMock.expectOne('/api/items/X-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    expect(notification.success).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    confirmSpy.mockRestore();
  });

  it('deleteEntity aborts when the user cancels the confirmation', () => {
    const { component, httpMock } = setup({
      data: {
        title: 'Edit',
        endpoint: '/items',
        fields: baseFields,
        entity: { id: 'X-1', title: 'x', count: 1, due: null, active: null },
      },
    });
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    component.deleteEntity();
    httpMock.expectNone('/api/items/X-1');
    confirmSpy.mockRestore();
  });

  it('deleteEntity surfaces errors and keeps the dialog open', () => {
    const { component, httpMock, dialogRef, notification } = setup({
      data: {
        title: 'Edit',
        endpoint: '/items',
        fields: baseFields,
        entity: { id: 'X-2', title: 'x', count: 1, due: null, active: null },
      },
    });
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    component.deleteEntity();
    httpMock
      .expectOne('/api/items/X-2')
      .flush({ detail: 'nope' }, { status: 500, statusText: 'fail' });
    expect(notification.error).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.submitting).toBe(false);
    confirmSpy.mockRestore();
  });
});
