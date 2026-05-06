import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { API_URL } from '@core/tokens/api-url.token';
import { Sample, Tumor } from '@generated/models';

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
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
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
          @if (tumorsResource.isLoading()) {
            <mat-select disabled>
              <mat-option i18n="@@loadingLbl">Loading…</mat-option>
            </mat-select>
          } @else {
            <mat-select formControlName="tumor_biobank_code" required>
              @for (tumor of tumorsResource.value(); track tumor.biobank_code) {
                <mat-option [value]="tumor.biobank_code">{{ tumor.biobank_code }}</mat-option>
              }
            </mat-select>
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
        <div class="checkbox-group">
          <mat-checkbox formControlName="has_serum" i18n="@@sampleHasSerumLbl"
            >Has Serum</mat-checkbox
          >
          <mat-checkbox formControlName="has_buffy" i18n="@@sampleHasBuffyCoatLbl"
            >Has Buffy Coat</mat-checkbox
          >
          <mat-checkbox formControlName="has_plasma" i18n="@@sampleHasPlasmaLbl"
            >Has Plasma</mat-checkbox
          >
          <mat-checkbox formControlName="has_tumor_tissue_oct" i18n="@@sampleHasTumorTissueOctLbl"
            >Has Tumor Tissue OCT</mat-checkbox
          >
          <mat-checkbox
            formControlName="has_non_tumor_tissue_oct"
            i18n="@@sampleHasNonTumorTissueOctLbl"
            >Has Non-Tumor Tissue OCT</mat-checkbox
          >
        </div>
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
    .checkbox-group {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 0.5rem 0;
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

  buildDialogResult(): Partial<Sample> {
    const value = this.form.getRawValue();
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = value;
      return createPayload;
    }
    return value;
  }
}
