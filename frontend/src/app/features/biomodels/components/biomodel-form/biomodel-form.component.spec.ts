import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { API_URL } from '@core/tokens/api-url.token';
import { BiomodelFormComponent, BiomodelFormData } from './biomodel-form.component';

describe('BiomodelFormComponent', () => {
  const setup = async (data: BiomodelFormData) => {
    await TestBed.configureTestingModule({
      imports: [BiomodelFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BiomodelFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/api/tumors').flush([{ biobank_code: 'TB-1', classification: null }]);
    httpMock.expectOne('/api/trials').flush([{ id: 'T-1', description: 'Trial 1' }]);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid in create mode when tumor is missing', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ tumor_biobank_code: 'TB-1' });
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('initializes edit mode values', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      biomodel: {
        id: 'BM-5',
        type: 'PDX',
        description: 'desc',
        creation_date: '2023-01-01',
        status: 'active',
        progresses: true,
        viability: 88,
        tumor_biobank_code: 'TB-1',
        parent_trial_id: null,
      },
    });

    expect(component.form.getRawValue().id).toBe('BM-5');
    expect(component.form.getRawValue().tumor_biobank_code).toBe('TB-1');
    expect(component.form.getRawValue().viability).toBe(88);
    httpMock.verify();
  });

  it('binds submit dialog payload to raw form value', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    component.form.patchValue({
      tumor_biobank_code: 'TB-1',
      type: 'PDO',
      progresses: false,
    });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);

    expect(closeDirective.dialogResult).toEqual(component.buildDialogResult());
    expect(closeDirective.dialogResult).toMatchObject({
      tumor_biobank_code: 'TB-1',
      type: 'PDO',
      progresses: false,
    });
    httpMock.verify();
  });
});
