import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { httpResource } from '@angular/common/http';
import { API_URL } from '@core/tokens/api-url.token';
import { Patient, Tumor } from '@generated/models';

type PatientOption = Pick<Patient, 'nhc' | 'sex'>;

export interface TumorFormData {
  mode: 'create' | 'edit';
  tumor?: Tumor;
}

@Component({
  selector: 'app-tumor-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.mode === 'create') {
        <ng-container i18n="@@newTumorTitle">New Tumor</ng-container>
      } @else {
        <ng-container i18n="@@editTumorTitle">Edit Tumor</ng-container>
      }
    </h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biobankCodeLbl">Biobank Code</mat-label>
          <input
            matInput
            formControlName="biobank_code"
            required
            [readonly]="data.mode === 'edit'"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorPatientLbl">Patient</mat-label>
          @if (patientsResource.isLoading()) {
            <mat-select disabled>
              <mat-option i18n="@@loadingLbl">Loading…</mat-option>
            </mat-select>
          } @else {
            <mat-select formControlName="patient_nhc" required>
              @for (patient of patientsResource.value(); track patient.nhc) {
                <mat-option [value]="patient.nhc">{{ patient.nhc }}</mat-option>
              }
            </mat-select>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@labCodeLbl">Lab Code</mat-label>
          <input matInput formControlName="lab_code" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@classificationLbl">Classification</mat-label>
          <input matInput formControlName="classification" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorGradeLbl">Grade</mat-label>
          <input matInput formControlName="grade" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@organLbl">Organ</mat-label>
          <input matInput formControlName="organ" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorStatusLbl">Status</mat-label>
          <input matInput formControlName="status" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorTnmLbl">TNM</mat-label>
          <input matInput formControlName="tnm" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorApObservationLbl">AP Observation</mat-label>
          <textarea matInput formControlName="ap_observation" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorRegistrationDateLbl">Registration Date</mat-label>
          <input matInput formControlName="registration_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@tumorOperationDateLbl">Operation Date</mat-label>
          <input matInput formControlName="operation_date" type="date" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n="@@cancelBtn">Cancel</button>
      <button
        mat-flat-button
        [mat-dialog-close]="form.getRawValue()"
        [disabled]="form.invalid"
      >
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
    .form-grid mat-form-field:first-child,
    .form-grid mat-form-field:nth-child(9) {
      grid-column: 1 / -1;
    }
  `,
})
export class TumorFormComponent {
  private readonly apiUrl = inject(API_URL);
  readonly data = inject<TumorFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);

  patientsResource = httpResource<PatientOption[]>(() => `${this.apiUrl}/patients`, {
    defaultValue: [],
  });

  readonly form = this.formBuilder.group({
    biobank_code: this.formBuilder.nonNullable.control(this.data.tumor?.biobank_code ?? '', {
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    lab_code: this.formBuilder.control<Tumor['lab_code']>(this.data.tumor?.lab_code ?? null),
    classification: this.formBuilder.control<Tumor['classification']>(
      this.data.tumor?.classification ?? null,
    ),
    ap_observation: this.formBuilder.control<Tumor['ap_observation']>(
      this.data.tumor?.ap_observation ?? null,
    ),
    grade: this.formBuilder.control<Tumor['grade']>(this.data.tumor?.grade ?? null),
    organ: this.formBuilder.control<Tumor['organ']>(this.data.tumor?.organ ?? null),
    status: this.formBuilder.control<Tumor['status']>(this.data.tumor?.status ?? null),
    tnm: this.formBuilder.control<Tumor['tnm']>(this.data.tumor?.tnm ?? null),
    registration_date: this.formBuilder.control<Tumor['registration_date']>(
      this.data.tumor?.registration_date ?? null,
    ),
    operation_date: this.formBuilder.control<Tumor['operation_date']>(
      this.data.tumor?.operation_date ?? null,
    ),
    patient_nhc: this.formBuilder.nonNullable.control(this.data.tumor?.patient_nhc ?? '', {
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });
}
