import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { API_URL } from '@core/tokens/api-url.token';
import { Biomodel, Passage } from '@generated/models';
import { NumericInputDirective } from '@shared/directives/numeric-input.directive';
import { numberFormatValidator } from '@shared/forms/numeric-input';

export interface PassageFormData {
  mode: 'create' | 'edit';
  passage?: Passage;
}

@Component({
  selector: 'app-passage-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    NumericInputDirective,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.mode === 'create') {
        <ng-container i18n="@@newPassageTitle">New Passage</ng-container>
      } @else {
        <ng-container i18n="@@editPassageTitle">Edit Passage</ng-container>
      }
    </h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        @if (showBiomodelPicker) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label i18n="@@passageBiomodelLbl">Biomodel</mat-label>
            @if (biomodelsResource.isLoading()) {
              <mat-select disabled>
                <mat-option i18n="@@loadingLbl">Loading…</mat-option>
              </mat-select>
            } @else {
              <mat-select formControlName="biomodel_id" required>
                @for (biomodel of biomodelsResource.value(); track biomodel.id) {
                  <mat-option [value]="biomodel.id">{{ biomodel.id }}</mat-option>
                }
              </mat-select>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label i18n="@@passageNumberLbl">Number</mat-label>
          <input
            matInput
            type="text"
            inputmode="numeric"
            formControlName="number"
            appNumericInput
            [integerOnly]="true"
            autocomplete="off"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialSuccessLbl">Success</mat-label>
          <mat-select formControlName="success">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialStatusLbl">Status</mat-label>
          <mat-select formControlName="status">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@activeStatusOpt">Active</mat-option>
            <mat-option [value]="false" i18n="@@inactiveStatusOpt">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialCreatedLbl">Created</mat-label>
          <input matInput type="date" formControlName="creation_date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialBiobankShipmentLbl">Biobank Shipment</mat-label>
          <mat-select formControlName="biobank_shipment">
            <mat-option [value]="null">—</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialArrivalDateLbl">Arrival Date</mat-label>
          <input matInput type="date" formControlName="biobank_arrival_date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@preclinicalTrialsLbl">Preclinical Trials</mat-label>
          <textarea matInput formControlName="preclinical_trials" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@passageDescLbl">Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
      min-width: 400px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
  `,
})
export class PassageFormComponent {
  readonly data = inject<PassageFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiUrl = inject(API_URL);

  /** When creating from the global passages list, the user must choose a biomodel. */
  readonly showBiomodelPicker =
    this.data.mode === 'create' &&
    (this.data.passage?.biomodel_id == null || this.data.passage.biomodel_id === '');

  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, {
    defaultValue: [],
  });

  readonly form = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(this.data.passage?.id ?? ''),
    number: this.formBuilder.control<number | string | null>(this.data.passage?.number ?? null, {
      validators: [numberFormatValidator(true)],
    }),
    description: this.formBuilder.control<Passage['description']>(
      this.data.passage?.description ?? null,
    ),
    biomodel_id: this.formBuilder.nonNullable.control(this.data.passage?.biomodel_id ?? '', {
      validators: [Validators.required],
    }),
    success: this.formBuilder.control<Passage['success']>(this.data.passage?.success ?? null),
    status: this.formBuilder.control<Passage['status']>(this.data.passage?.status ?? null),
    preclinical_trials: this.formBuilder.control<Passage['preclinical_trials']>(
      this.data.passage?.preclinical_trials ?? null,
    ),
    creation_date: this.formBuilder.control<Passage['creation_date']>(
      this.data.passage?.creation_date ?? null,
    ),
    biobank_shipment: this.formBuilder.control<Passage['biobank_shipment']>(
      this.data.passage?.biobank_shipment ?? null,
    ),
    biobank_arrival_date: this.formBuilder.control<Passage['biobank_arrival_date']>(
      this.data.passage?.biobank_arrival_date ?? null,
    ),
  });

  buildDialogResult(): Partial<Passage> {
    const value = this.form.getRawValue();
    const number =
      value.number === '' || value.number == null ? null : Math.trunc(Number(value.number));
    const withNumeric = {
      ...value,
      number: Number.isFinite(number) ? number : null,
    };
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = withNumeric;
      return createPayload;
    }
    return withNumeric;
  }
}
