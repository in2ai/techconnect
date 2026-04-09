import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { httpResource } from '@angular/common/http';
import { API_URL } from '@core/tokens/api-url.token';
import { Passage, Trial } from '@generated/models';

type PassageOption = Pick<Passage, 'id' | 'number' | 'biomodel_id'>;

export interface TrialFormData {
  mode: 'create' | 'edit';
  trial?: Trial;
}

@Component({
  selector: 'app-trial-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    SlicePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.mode === 'create') {
        <ng-container i18n="@@newTrialTitle">New Trial</ng-container>
      } @else {
        <ng-container i18n="@@editTrialTitle">Edit Trial</ng-container>
      }
    </h2>
    <mat-dialog-content>
      <form class="form-grid" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label i18n="@@passageTitleLbl">Passage</mat-label>
          @if (passagesResource.isLoading()) {
            <mat-select disabled>
              <mat-option i18n="@@loadingLbl">Loading…</mat-option>
            </mat-select>
          } @else {
            <mat-select formControlName="passage_id" required>
              @for (passage of passagesResource.value(); track passage.id) {
                <mat-option [value]="passage.id">
                  {{ passage.id | slice: 0 : 8 }}… (P{{ passage.number ?? '?' }})
                </mat-option>
              }
            </mat-select>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialCreationDateLbl">Creation Date</mat-label>
          <input matInput formControlName="creation_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialBiobankArrivalDateLbl">Biobank Arrival Date</mat-label>
          <input matInput formControlName="biobank_arrival_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@trialDescLbl">Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
        <div class="checkbox-group">
          <mat-checkbox formControlName="success" i18n="@@trialSuccessLbl">Success</mat-checkbox>
          <mat-checkbox formControlName="biobank_shipment" i18n="@@trialBiobankShipmentLbl">Biobank Shipment</mat-checkbox>
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
      min-width: 400px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .checkbox-group {
      grid-column: 1 / -1;
      display: flex;
      gap: 1.5rem;
      padding: 0.5rem 0;
    }
  `,
})
export class TrialFormComponent {
  private readonly apiUrl = inject(API_URL);
  readonly data = inject<TrialFormData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);

  passagesResource = httpResource<PassageOption[]>(() => `${this.apiUrl}/passages`, {
    defaultValue: [],
  });

  readonly form = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(this.data.trial?.id ?? ''),
    success: this.formBuilder.control<Trial['success']>(this.data.trial?.success ?? null),
    description: this.formBuilder.control<Trial['description']>(this.data.trial?.description ?? null),
    status: this.formBuilder.control<Trial['status']>(this.data.trial?.status ?? null),
    preclinical_trials: this.formBuilder.control<Trial['preclinical_trials']>(
      this.data.trial?.preclinical_trials ?? null,
    ),
    creation_date: this.formBuilder.control<Trial['creation_date']>(
      this.data.trial?.creation_date ?? null,
    ),
    biobank_shipment: this.formBuilder.control<Trial['biobank_shipment']>(
      this.data.trial?.biobank_shipment ?? null,
    ),
    biobank_arrival_date: this.formBuilder.control<Trial['biobank_arrival_date']>(
      this.data.trial?.biobank_arrival_date ?? null,
    ),
    passage_id: this.formBuilder.nonNullable.control(this.data.trial?.passage_id ?? '', {
      validators: [Validators.required],
    }),
  });

  buildDialogResult(): Partial<Trial> {
    const value = this.form.getRawValue();
    if (this.data.mode === 'create') {
      const { id: _, ...createPayload } = value;
      return createPayload;
    }
    return value;
  }
}
