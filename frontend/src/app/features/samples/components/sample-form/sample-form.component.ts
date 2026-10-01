import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { API_URL } from '@core/tokens/api-url.token';
import { Sample, Tumor } from '@generated/models';
import { synchronizeAutocompleteSelection } from '@shared/forms/autocomplete-selection';

type TumorOption = Pick<Tumor, 'biobank_code'>;

export interface SampleFormData {
  mode: 'create' | 'edit';
  biopsy?: Sample;
}

@Component({
  selector: 'app-sample-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.mode === 'create') {
        <ng-container i18n="@@newSampleTitle">New Sample</ng-container>
      } @else {
        <ng-container i18n="@@editSampleTitle">Edit Sample</ng-container>
      }
    </h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleTumorLbl">Tumor</mat-label>
          <input
            matInput
            required
            [formControl]="tumorSearch"
            [matAutocomplete]="tumorAutocomplete"
            [readonly]="tumorsResource.isLoading()"
            i18n-placeholder="@@sampleTumorSearchPlaceholder"
            placeholder="Search tumor biobank code"
          />
          <mat-autocomplete
            #tumorAutocomplete="matAutocomplete"
            (optionSelected)="selectTumor($event.option.value)"
          >
            @for (tumor of filteredTumors(); track tumor.biobank_code) {
              <mat-option [value]="tumor.biobank_code">{{ tumor.biobank_code }}</mat-option>
            }
          </mat-autocomplete>
          @if (tumorSearch.hasError('invalidSelection')) {
            <mat-error i18n="@@selectTumorOptionError">Select a tumor from the options.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleObtainDateLbl">Obtain Date</mat-label>
          <input matInput formControlName="obtain_date" type="date" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleOrganLbl">Organ</mat-label>
          <mat-select formControlName="organ">
            <mat-option [value]="null">—</mat-option>
            <mat-option value="Lung" i18n="@@lungOpt">Lung</mat-option>
            <mat-option value="Bladder" i18n="@@bladderOpt">Bladder</mat-option>
            <mat-option value="Colon" i18n="@@colonOpt">Colon</mat-option>
            <mat-option value="Pancreas" i18n="@@pancreasOpt">Pancreas</mat-option>
            <mat-option value="Breast" i18n="@@breastOpt">Breast</mat-option>
            <mat-option value="Soft tissue" i18n="@@softPartsOpt">Soft tissue</mat-option>
            <mat-option value="Bone/Hard tissue" i18n="@@hardPartsOpt">Bone/Hard tissue</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleHasSerumLbl">Has Serum</mat-label>
          <mat-select formControlName="has_serum">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleHasBuffyCoatLbl">Has Buffy Coat</mat-label>
          <mat-select formControlName="has_buffy">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleHasPlasmaLbl">Has Plasma</mat-label>
          <mat-select formControlName="has_plasma">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleHasTumorTissueOctLbl">Has Tumor Tissue OCT</mat-label>
          <mat-select formControlName="has_tumor_tissue_oct">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@sampleHasNonTumorTissueOctLbl">Has Non-Tumor Tissue OCT</mat-label>
          <mat-select formControlName="has_non_tumor_tissue_oct">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n="@@cancelBtn">Cancel</button>
      <button mat-flat-button [mat-dialog-close]="buildDialogResult()" [disabled]="form.invalid">
        @if (data.mode === 'create') {
          <ng-container i18n="@@createBtn">Create</ng-container>
        } @else {
          <ng-container i18n="@@saveBtn">Save</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      min-width: 360px;
    }
  `,
})
export class SampleFormComponent {
  private readonly apiUrl = inject(API_URL);
  readonly data = inject<SampleFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);

  tumorsResource = httpResource<TumorOption[]>(() => `${this.apiUrl}/tumors`, {
    defaultValue: [],
  });
  readonly tumorSearch = this.formBuilder.nonNullable.control(
    this.data.biopsy?.tumor_biobank_code ?? '',
  );

  readonly form = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(this.data.biopsy?.id ?? ''),
    has_serum: this.formBuilder.control<Sample['has_serum']>(this.data.biopsy?.has_serum ?? null),
    has_buffy: this.formBuilder.control<Sample['has_buffy']>(this.data.biopsy?.has_buffy ?? null),
    has_plasma: this.formBuilder.control<Sample['has_plasma']>(
      this.data.biopsy?.has_plasma ?? null,
    ),
    has_tumor_tissue_oct: this.formBuilder.control<Sample['has_tumor_tissue_oct']>(
      this.data.biopsy?.has_tumor_tissue_oct ?? null,
    ),
    has_non_tumor_tissue_oct: this.formBuilder.control<Sample['has_non_tumor_tissue_oct']>(
      this.data.biopsy?.has_non_tumor_tissue_oct ?? null,
    ),
    obtain_date: this.formBuilder.control<Sample['obtain_date']>(
      this.data.biopsy?.obtain_date ?? null,
    ),
    organ: this.formBuilder.control<Sample['organ']>(this.data.biopsy?.organ ?? null),
    tumor_biobank_code: this.formBuilder.nonNullable.control(
      this.data.biopsy?.tumor_biobank_code ?? '',
      { validators: [Validators.required] },
    ),
  });

  constructor() {
    synchronizeAutocompleteSelection({
      search: this.tumorSearch,
      selection: this.form.controls.tumor_biobank_code,
      emptyValue: '',
    });
  }

  filteredTumors(): TumorOption[] {
    const query = this.tumorSearch.value.trim().toLowerCase();
    return this.tumorsResource
      .value()
      .filter((tumor) => tumor.biobank_code.toLowerCase().includes(query));
  }

  selectTumor(tumorBiobankCode: string): void {
    this.form.controls.tumor_biobank_code.setValue(tumorBiobankCode);
    this.tumorSearch.setValue(tumorBiobankCode);
  }

  buildDialogResult(): Partial<Sample> {
    const value = this.form.getRawValue();
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = value;
      return createPayload;
    }
    return value;
  }
}
