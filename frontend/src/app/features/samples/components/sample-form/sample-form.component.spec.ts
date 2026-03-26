import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { API_URL } from '../../../../core/tokens/api-url.token';
import { SampleFormComponent, SampleFormData } from './sample-form.component';

describe('SampleFormComponent', () => {
  const setup = async (data: SampleFormData) => {
    await TestBed.configureTestingModule({
      imports: [SampleFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SampleFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/api/tumors').flush([{ biobank_code: 'TB-1' }]);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid in create mode when tumor is not selected', async () => {
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
      biopsy: {
        id: 'S-10',
        has_serum: true,
        has_buffy: false,
        has_plasma: true,
        has_tumor_tissue: false,
        has_non_tumor_tissue: false,
        organ: 'Lung',
        is_metastasis: false,
        obtain_date: '2023-03-11',
        tumor_biobank_code: 'TB-1',
      },
    });

    expect(component.form.getRawValue()).toEqual({
      id: 'S-10',
      has_serum: true,
      has_buffy: false,
      has_plasma: true,
      has_tumor_tissue: false,
      has_non_tumor_tissue: false,
      organ: 'Lung',
      is_metastasis: false,
      obtain_date: '2023-03-11',
      tumor_biobank_code: 'TB-1',
    });
    httpMock.verify();
  });

  it('binds submit dialog payload to raw form value', async () => {
    const { fixture, component, httpMock } = await setup({ mode: 'create' });

    component.form.patchValue({
      tumor_biobank_code: 'TB-1',
      obtain_date: '2024-05-18',
      has_serum: true,
    });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);

    expect(closeDirective.dialogResult).toEqual(component.buildDialogResult());
    expect(closeDirective.dialogResult).toEqual({
      has_serum: true,
      has_buffy: null,
      has_plasma: null,
      has_tumor_tissue: null,
      has_non_tumor_tissue: null,
      organ: null,
      is_metastasis: null,
      obtain_date: '2024-05-18',
      tumor_biobank_code: 'TB-1',
    });
    httpMock.verify();
  });
});
