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
    httpMock
      .expectOne('/api/passages')
      .flush([{ id: 'BM-1-P1', description: 'passage one', biomodel_id: 'B-9' }]);
    httpMock.expectOne('/api/biomodels').flush([{ id: 'B-EXISTING' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('starts invalid without id and tumor selection in create mode', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    expect(component.form.controls.id.value).toBe('');
    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);

    component.selectTumor('TB-1');
    component.form.patchValue({ id: 'B-1' });
    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('builds a create payload with id and success', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({
      id: 'B-1',
      tumor_biobank_code: 'TB-1',
      type: 'PDX',
      status: true,
      success: true,
    });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('B-1');
    expect(payload.type).toBe('PDX');
    expect(payload.status).toBe(true);
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
        status: true,
        success: false,
        tumor_biobank_code: 'TB-1',
        parent_passage_id: null,
        tumor_organ: null,
      },
    });
    expect(component.form.controls.id.disabled).toBe(true);
    expect(component.form.controls.type.disabled).toBe(true);
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

  it('filters tumors and stores only the selected biobank code', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.tumorSearch.setValue('TB-1');
    expect(component.filteredTumors().map((tumor) => tumor.biobank_code)).toEqual(['TB-1']);
    component.selectTumor('TB-1');
    expect(component.form.controls.tumor_biobank_code.value).toBe('TB-1');
    expect(component.tumorSearch.value).toBe('TB-1');
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

  it('clears the submitted relationship when the search text changes', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.selectTumor('TB-1');
    component.tumorSearch.setValue('edited text');
    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);
    component.tumorSearch.setValue('');
    expect(component.form.controls.tumor_biobank_code.value).toBe('');
    expect(component.form.invalid).toBe(true);
    component.selectTumor('TB-1');
    expect(component.form.controls.tumor_biobank_code.valid).toBe(true);
    httpMock.verify();
  });

  it('clears an optional parent and rejects unmatched search text', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.controls.id.setValue('NEW');
    component.selectTumor('TB-1');
    component.selectParentPassage('BM-1-P1');
    expect(component.form.valid).toBe(true);
    component.parentPassageSearch.setValue('another passage');
    expect(component.form.controls.parent_passage_id.value).toBeNull();
    expect(component.form.invalid).toBe(true);
    component.parentPassageSearch.setValue('');
    expect(component.form.controls.parent_passage_id.value).toBeNull();
    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('allows type edits when the biomodel has no passages', async () => {
    const { component, fixture, httpMock } = await setup({
      mode: 'edit',
      biomodel: {
        id: 'B-NEW',
        type: 'PDX',
        tumor_biobank_code: 'TB-1',
      } as BiomodelFormData['biomodel'],
    });
    await fixture.whenStable();
    expect(component.form.controls.type.enabled).toBe(true);
    httpMock.verify();
  });
});
