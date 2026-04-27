import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
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
    httpMock.expectOne('/api/patients').flush([{ nhc: 'P-1', sex: null }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('requires biobank_code and patient_nhc in create mode', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ biobank_code: 'TB-1', patient_nhc: 'P-1' });
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    expect((submitButton.nativeElement as HTMLButtonElement).disabled).toBe(false);
    httpMock.verify();
  });

  it('keeps biobank_code readonly when editing', async () => {
    const { fixture, httpMock } = await setup({
      mode: 'edit',
      tumor: {
        biobank_code: 'TB-1',
        patient_nhc: 'P-1',
        tube_code: null,
        classification: null,
        ap_diagnosis: null,
        grade: null,
        organ: null,
        stage: null,
        tnm: null,
        intervention_date: null,
      },
    });
    const input = fixture.debugElement.query(By.css('input[formcontrolname="biobank_code"]'));
    expect((input.nativeElement as HTMLInputElement).readOnly).toBe(true);
    httpMock.verify();
  });

  it('binds submit payload to form raw value', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({
      biobank_code: 'TB-42',
      patient_nhc: 'P-1',
      classification: 'adenocarcinoma',
    });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);
    expect(closeDirective.dialogResult).toMatchObject({
      biobank_code: 'TB-42',
      patient_nhc: 'P-1',
      classification: 'adenocarcinoma',
    });
    httpMock.verify();
  });
});
