import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
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
    httpMock.expectOne('/api/tumors').flush([{ biobank_code: 'TB-1' }]);
    httpMock.expectOne('/api/trials').flush([{ id: 'TR-1', description: 'trial one' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid without a tumor selection in create mode', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ tumor_biobank_code: 'TB-1' });
    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('builds a create payload without id', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({
      tumor_biobank_code: 'TB-1',
      type: 'PDX',
      viability: '75.5',
      progresses: true,
    });
    const payload = component.buildDialogResult();
    expect('id' in payload).toBe(false);
    expect(payload.viability).toBe(75.5);
    expect(payload.type).toBe('PDX');
    expect(payload.progresses).toBe(true);
    httpMock.verify();
  });

  it('preserves id and converts viability to number in edit mode', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      biomodel: {
        id: 'B-9',
        type: 'PDO',
        description: 'old',
        creation_date: '2024-05-01',
        status: 'active',
        progresses: false,
        viability: 50,
        tumor_biobank_code: 'TB-1',
        parent_trial_id: null,
        tumor_organ: null,
      },
    });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('B-9');
    expect(payload.viability).toBe(50);
    httpMock.verify();
  });

  it('coerces empty viability to null', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({ tumor_biobank_code: 'TB-1', viability: '' });
    expect(component.buildDialogResult().viability).toBeNull();
    httpMock.verify();
  });
});
