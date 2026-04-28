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
    httpMock.expectOne('/api/passages').flush([{ id: 'BM-1-P1', description: 'passage one' }]);
    httpMock.expectOne('/api/biomodels').flush([{ id: 'B-EXISTING' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid without id and tumor selection in create mode', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    expect(component.form.controls.id.value).toBe('');
    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ id: 'B-1', tumor_biobank_code: 'TB-1' });
    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('builds a create payload with id and success', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({
      id: 'B-1',
      tumor_biobank_code: 'TB-1',
      type: 'PDX',
      status: 'active',
      success: true,
    });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('B-1');
    expect(payload.type).toBe('PDX');
    expect(payload.status).toBe('active');
    expect(payload.success).toBe(true);
    httpMock.verify();
  });

  it('preserves id and success in edit mode', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      biomodel: {
        id: 'B-9',
        type: 'PDO',
        description: 'old',
        creation_date: '2024-05-01',
        status: 'active',
        success: false,
        tumor_biobank_code: 'TB-1',
        parent_passage_id: null,
        tumor_organ: null,
      },
    });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('B-9');
    expect(payload.success).toBe(false);
    httpMock.verify();
  });

  it('marks duplicate create ids as invalid for submission', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({ id: 'B-EXISTING', tumor_biobank_code: 'TB-1' });
    expect(component.duplicateBiomodelId()).toBe(true);
    httpMock.verify();
  });

  it('filters parent passages and stores only the selected id', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.parentPassageSearch.setValue('P1');
    expect(component.filteredParentPassages().map((passage) => passage.id)).toEqual(['BM-1-P1']);
    component.selectParentPassage('BM-1-P1');
    expect(component.form.controls.parent_passage_id.value).toBe('BM-1-P1');
    expect(component.parentPassageSearch.value).toBe('BM-1-P1');
    httpMock.verify();
  });
});
