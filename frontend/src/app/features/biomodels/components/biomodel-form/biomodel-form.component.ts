import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { Biomodel } from '../../models/biomodel.model';

interface Tumor {
  biobank_code: string;
  classification: string | null;
}

interface Trial {
  id: string;
  description: string | null;
}

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
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'New Biomodel' : 'Edit Biomodel' }}</h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n>Tumor</mat-label>
          @if (tumorsResource.isLoading()) {
            <mat-select disabled>
              <mat-option>Loading…</mat-option>
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
          <mat-label i18n>Parent Trial (Optional)</mat-label>
          @if (trialsResource.isLoading()) {
            <mat-select disabled>
              <mat-option>Loading…</mat-option>
            </mat-select>
          } @else {
            <mat-select formControlName="parent_trial_id">
              <mat-option [value]="null">None</mat-option>
              @for (trial of trialsResource.value(); track trial.id) {
                <mat-option [value]="trial.id">{{ trial.description || trial.id }}</mat-option>
              }
            </mat-select>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n>Type</mat-label>
          <input matInput formControlName="type" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n>Status</mat-label>
          <input matInput formControlName="status" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n>Viability</mat-label>
          <input matInput formControlName="viability" type="number" step="0.01" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n>Creation Date</mat-label>
          <input matInput formControlName="creation_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="progresses">Progresses</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n>Cancel</button>
      <button mat-flat-button [mat-dialog-close]="buildDialogResult()" [disabled]="form.invalid">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
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

  tumorsResource = httpResource<Tumor[]>(() => `${this.apiUrl}/tumors`, { defaultValue: [] });
  trialsResource = httpResource<Trial[]>(() => `${this.apiUrl}/trials`, { defaultValue: [] });

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
    viability: this.formBuilder.control<Biomodel['viability']>(
      this.data.biomodel?.viability ?? null,
    ),
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
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = value;
      return createPayload;
    }
    return value;
  }
}
