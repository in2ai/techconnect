import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { API_URL } from '@core/tokens/api-url.token';
import { PassageFormComponent, PassageFormData } from './passage-form.component';

describe('PassageFormComponent', () => {
  const setup = async (data: PassageFormData) => {
    await TestBed.configureTestingModule({
      imports: [PassageFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PassageFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/biomodels').flush([{ id: 'BM-1' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  };

  it('requires a biomodel selection in create mode without a preset biomodel', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    expect(component.showBiomodelPicker).toBe(true);
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ id: 'P-1', biomodel_id: 'BM-1' });
    expect(component.form.valid).toBe(true);
    httpMock.verify();
  });

  it('computes composite id from passage number and biomodel_id in create mode', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.form.patchValue({ id: 'P-1', biomodel_id: 'BM-1' });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('BM-1-P-1');
    httpMock.verify();
  });

  it('skips the biomodel picker when biomodel_id is preset', async () => {
    const { component, httpMock } = await setup({
      mode: 'create',
      passage: {
        id: '',
        description: null,
        biomodel_id: 'BM-7',
        success: null,
        status: null,
        creation_date: null,
        biobank_shipment: null,
        biobank_arrival_date: null,
      },
    });
    expect(component.showBiomodelPicker).toBe(false);
    expect(component.form.controls.biomodel_id.value).toBe('BM-7');
    httpMock.verify();
  });

  it('keeps id in edit mode payload', async () => {
    const { component, httpMock } = await setup({
      mode: 'edit',
      passage: {
        id: 'PS-1',
        description: 'existing',
        biomodel_id: 'BM-1',
        success: null,
        status: null,
        creation_date: null,
        biobank_shipment: null,
        biobank_arrival_date: null,
      },
    });
    const payload = component.buildDialogResult();
    expect(payload.id).toBe('PS-1');
    expect('number' in payload).toBe(false);
    httpMock.verify();
  });

  it('filters biomodels and stores only the selected id', async () => {
    const { component, httpMock } = await setup({ mode: 'create' });
    component.biomodelSearch.setValue('BM-1');
    expect(component.filteredBiomodels().map((biomodel) => biomodel.id)).toEqual(['BM-1']);
    component.selectBiomodel('BM-1');
    expect(component.form.controls.biomodel_id.value).toBe('BM-1');
    expect(component.biomodelSearch.value).toBe('BM-1');
    httpMock.verify();
  });

  it('shows a readonly loading input while the biomodels resource is pending', async () => {
    await TestBed.configureTestingModule({
      imports: [PassageFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'create' } satisfies PassageFormData },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PassageFormComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    expect(fixture.componentInstance.biomodelsResource.isLoading()).toBe(true);
    const input = fixture.nativeElement.querySelector('input[placeholder="Search biomodel ID"]');
    expect(input).toBeTruthy();
    expect(input.readOnly).toBe(true);

    httpMock.expectOne('/api/biomodels').flush([]);
    fixture.detectChanges();
    httpMock.verify();
  });
});
