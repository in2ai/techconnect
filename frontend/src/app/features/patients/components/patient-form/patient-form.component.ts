import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Patient } from '@generated/models';

export interface PatientFormData {
  mode: 'create' | 'edit';
  patient?: Patient;
}

@Component({
  selector: 'app-patient-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'New Patient' : 'Edit Patient' }}</h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n>NHC</mat-label>
          <input
            matInput
            formControlName="nhc"
            required
            [readonly]="data.mode === 'edit'"
            placeholder="Enter NHC identifier"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n>Sex</mat-label>
          <mat-select formControlName="sex">
            <mat-option [value]="null">Not specified</mat-option>
            <mat-option value="M">Male</mat-option>
            <mat-option value="F">Female</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n>Birth Date</mat-label>
          <input matInput formControlName="birth_date" type="date" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n>Cancel</button>
      <button mat-flat-button [mat-dialog-close]="form.getRawValue()" [disabled]="form.invalid">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 350px;
    }
  `,
})
export class PatientFormComponent {
  readonly data = inject<PatientFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.group({
    nhc: this.formBuilder.nonNullable.control(this.data.patient?.nhc ?? '', {
      validators: [Validators.required],
    }),
    sex: this.formBuilder.control<Patient['sex']>(this.data.patient?.sex ?? null),
    birth_date: this.formBuilder.control<Patient['birth_date']>(this.data.patient?.birth_date ?? null),
  });
}
