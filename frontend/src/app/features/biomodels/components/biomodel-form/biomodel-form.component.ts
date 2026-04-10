import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumericInputDirective } from '@shared/directives/numeric-input.directive';
import { numberFormatValidator } from '@shared/forms/numeric-input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel, Trial, Tumor } from '@generated/models';

type TumorOption = Pick<Tumor, 'biobank_code' | 'classification'>;
type TrialOption = Pick<Trial, 'id' | 'description'>;

export interface BiomodelFormData {
  mode: 'create' | 'edit';
  biomodel?: Biomodel;
}

@Component({
  selector: 'app-biomodel-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    NumericInputDirective,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.mode === 'create') {
        <ng-container i18n="@@newBiomodelTitle">New Biomodel</ng-container>
      } @else {
        <ng-container i18n="@@editBiomodelTitle">Edit Biomodel</ng-container>
      }
    </h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelTumorLbl">Tumor</mat-label>
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
          <mat-label i18n="@@biomodelParentTrialOptionalLbl">Parent Trial (Optional)</mat-label>
          @if (trialsResource.isLoading()) {
            <mat-select disabled>
              <mat-option i18n="@@loadingLbl">Loading…</mat-option>
            </mat-select>
          } @else {
            <mat-select formControlName="parent_trial_id">
              <mat-option [value]="null" i18n="@@noneOptionLbl">None</mat-option>
              @for (trial of trialsResource.value(); track trial.id) {
                <mat-option [value]="trial.id">{{ trial.description || trial.id }}</mat-option>
              }
            </mat-select>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelTypeLbl">Type</mat-label>
          <input matInput formControlName="type" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelStatusLbl">Status</mat-label>
          <input matInput formControlName="status" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelViabilityLbl">Viability</mat-label>
          <input
            matInput
            type="text"
            inputmode="decimal"
            formControlName="viability"
            appNumericInput
            autocomplete="off"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialCreationDateLbl">Creation Date</mat-label>
          <input matInput formControlName="creation_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@biomodelDescriptionLbl">Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="progresses" i18n="@@biomodelProgressesLbl">Progresses</mat-checkbox>
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
      min-width: 400px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
  `,
})
export class BiomodelFormComponent {
  private readonly apiUrl = inject(API_URL);
  readonly data = inject<BiomodelFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);

  tumorsResource = httpResource<TumorOption[]>(() => `${this.apiUrl}/tumors`, {
    defaultValue: [],
  });
  trialsResource = httpResource<TrialOption[]>(() => `${this.apiUrl}/trials`, {
    defaultValue: [],
  });

  readonly form = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(this.data.biomodel?.id ?? ''),
    type: this.formBuilder.control<Biomodel['type']>(this.data.biomodel?.type ?? null),
    description: this.formBuilder.control<Biomodel['description']>(
      this.data.biomodel?.description ?? null,
    ),
    creation_date: this.formBuilder.control<Biomodel['creation_date']>(
      this.data.biomodel?.creation_date ?? null,
    ),
    status: this.formBuilder.control<Biomodel['status']>(this.data.biomodel?.status ?? null),
    progresses: this.formBuilder.control<Biomodel['progresses']>(
      this.data.biomodel?.progresses ?? null,
    ),
    viability: this.formBuilder.control<number | string | null>(this.data.biomodel?.viability ?? null, {
      validators: [numberFormatValidator(false)],
    }),
    tumor_biobank_code: this.formBuilder.nonNullable.control(
      this.data.biomodel?.tumor_biobank_code ?? '',
      { validators: [Validators.required] },
    ),
    parent_trial_id: this.formBuilder.control<Biomodel['parent_trial_id']>(
      this.data.biomodel?.parent_trial_id ?? null,
    ),
  });

  buildDialogResult(): Partial<Biomodel> {
    const value = this.form.getRawValue();
    const viability =
      value.viability === '' || value.viability == null
        ? null
        : Number(value.viability);
    const withNumeric = { ...value, viability: Number.isFinite(viability) ? viability : null };
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = withNumeric;
      return createPayload;
    }
    return withNumeric;
  }
}
