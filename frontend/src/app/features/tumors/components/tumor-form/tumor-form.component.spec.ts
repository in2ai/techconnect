import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { API_URL } from '@core/tokens/api-url.token';
import { TumorFormComponent, TumorFormData } from './tumor-form.component';

describe('TumorFormComponent', () => {
  const setup = async (data: TumorFormData) => {
    await TestBed.configureTestingModule({
      imports: [TumorFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TumorFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/api/patients').flush([{ nhc: 'NHC-1', sex: 'F' }]);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid in create mode until required fields are set', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    expect(component.form.controls.biobank_code.value).toBe('');
    expect(component.form.controls.patient_nhc.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ biobank_code: 'TB-1', patient_nhc: 'NHC-1' });
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('initializes edit mode with tumor data', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      tumor: {
        biobank_code: 'TB-9',
        patient_nhc: 'NHC-9',
        lab_code: 'LAB-9',
        classification: 'Type A',
        ap_observation: 'obs',
        grade: 'G2',
        organ: 'Lung',
        status: 'Active',
        tnm: 'T1',
        registration_date: '2024-01-02',
        operation_date: '2024-01-03',
      },
    });

    expect(component.form.getRawValue().biobank_code).toBe('TB-9');
    expect(component.form.getRawValue().patient_nhc).toBe('NHC-9');
    expect(component.form.getRawValue().classification).toBe('Type A');
    httpMock.verify();
  });

  it('binds submit dialog payload to raw form value', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    component.form.patchValue({
      biobank_code: 'TB-20',
      patient_nhc: 'NHC-1',
      classification: 'Updated',
    });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);

    expect(closeDirective.dialogResult).toEqual(component.form.getRawValue());
    httpMock.verify();
  });
});
