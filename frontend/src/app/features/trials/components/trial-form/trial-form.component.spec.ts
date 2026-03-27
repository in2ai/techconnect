import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { API_URL } from '@core/tokens/api-url.token';
import { TrialFormComponent, TrialFormData } from './trial-form.component';

describe('TrialFormComponent', () => {
  const setup = async (data: TrialFormData) => {
    await TestBed.configureTestingModule({
      imports: [TrialFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrialFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/api/passages').flush([{ id: 'P-1', number: 1, biomodel_id: 'BM-1' }]);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid in create mode when passage is missing', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    expect(component.form.controls.passage_id.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ passage_id: 'P-1' });
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('initializes edit mode values', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      trial: {
        id: 'TR-9',
        success: true,
        description: 'baseline',
        status: null,
        preclinical_trials: null,
        creation_date: '2025-02-01',
        biobank_shipment: false,
        biobank_arrival_date: '2025-02-10',
        passage_id: 'P-1',
      },
    });

    expect(component.form.getRawValue().id).toBe('TR-9');
    expect(component.form.getRawValue().passage_id).toBe('P-1');
    expect(component.form.getRawValue().success).toBe(true);
    httpMock.verify();
  });

  it('binds submit dialog payload to raw form value', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    component.form.patchValue({
      passage_id: 'P-1',
      success: true,
      description: 'trial payload',
    });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);

    expect(closeDirective.dialogResult).toEqual(component.buildDialogResult());
    expect(closeDirective.dialogResult).toMatchObject({
      passage_id: 'P-1',
      success: true,
      description: 'trial payload',
    });
    httpMock.verify();
  });
});
