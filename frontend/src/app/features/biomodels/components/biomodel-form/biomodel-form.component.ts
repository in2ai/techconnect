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
import { Biomodel, Passage, Tumor } from '@generated/models';

type TumorOption = Pick<Tumor, 'biobank_code' | 'classification'>;
type PassageOption = Pick<Passage, 'id' | 'description'>;

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
    MatAutocompleteModule,
    ReactiveFormsModule,
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
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@biomodelIdLbl">ID</mat-label>
          <input
            matInput
            formControlName="id"
            required
            [readonly]="data.mode === 'edit'"
            i18n-placeholder="@@biomodelIdPlaceholder"
            placeholder="Enter biomodel ID"
          />
          @if (duplicateBiomodelId()) {
            <mat-error i18n="@@biomodelDuplicateIdError"
              >This biomodel ID already exists.</mat-error
            >
          }
        </mat-form-field>

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
          <mat-label i18n="@@biomodelParentPassageOptionalLbl">Parent Passage (Optional)</mat-label>
          @if (passagesResource.isLoading()) {
            <input matInput disabled i18n-placeholder="@@loadingLbl" placeholder="Loading…" />
          } @else {
            <input
              matInput
              [formControl]="parentPassageSearch"
              [matAutocomplete]="parentPassageAutocomplete"
              i18n-placeholder="@@parentPassageSearchPlaceholder"
              placeholder="Search passage ID"
            />
            <mat-autocomplete
              #parentPassageAutocomplete="matAutocomplete"
              (optionSelected)="selectParentPassage($event.option.value)"
            >
              <mat-option [value]="null" i18n="@@noneOptionLbl">None</mat-option>
              @for (passage of filteredParentPassages(); track passage.id) {
                <mat-option [value]="passage.id">{{ passage.id }}</mat-option>
              }
            </mat-autocomplete>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelTypeLbl">Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="PDX">PDX</mat-option>
            <mat-option value="PDO">PDO</mat-option>
            <mat-option value="LC">LC</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelStatusLbl">Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="active" i18n="@@activeStatusOpt">Active</mat-option>
            <mat-option value="inactive" i18n="@@inactiveStatusOpt">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label i18n="@@biomodelSuccessLbl">Success</mat-label>
          <mat-select formControlName="success">
            <mat-option [value]="null" i18n="@@sexNotSpecified">Not specified</mat-option>
            <mat-option [value]="true" i18n="@@yesOpt">Yes</mat-option>
            <mat-option [value]="false" i18n="@@noOpt">No</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label i18n="@@trialCreationDateLbl">Creation Date</mat-label>
          <input matInput formControlName="creation_date" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label i18n="@@biomodelDescriptionLbl">Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n="@@cancelBtn">Cancel</button>
      <button
        mat-flat-button
        [mat-dialog-close]="buildDialogResult()"
        [disabled]="form.invalid || duplicateBiomodelId()"
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
  passagesResource = httpResource<PassageOption[]>(() => `${this.apiUrl}/passages`, {
    defaultValue: [],
  });
  biomodelsResource = httpResource<Pick<Biomodel, 'id'>[]>(() => `${this.apiUrl}/biomodels`, {
    defaultValue: [],
  });

  readonly form = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(this.data.biomodel?.id ?? '', {
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    type: this.formBuilder.control<Biomodel['type']>(this.data.biomodel?.type ?? null),
    description: this.formBuilder.control<Biomodel['description']>(
      this.data.biomodel?.description ?? null,
    ),
    creation_date: this.formBuilder.control<Biomodel['creation_date']>(
      this.data.biomodel?.creation_date ?? null,
    ),
    status: this.formBuilder.control<Biomodel['status']>(this.data.biomodel?.status ?? null),
    success: this.formBuilder.control<Biomodel['success']>(this.data.biomodel?.success ?? null),
    tumor_biobank_code: this.formBuilder.nonNullable.control(
      this.data.biomodel?.tumor_biobank_code ?? '',
      { validators: [Validators.required] },
    ),
    parent_passage_id: this.formBuilder.control<Biomodel['parent_passage_id']>(
      this.data.biomodel?.parent_passage_id ?? null,
    ),
  });
  readonly parentPassageSearch = this.formBuilder.nonNullable.control(
    this.data.biomodel?.parent_passage_id ?? '',
  );

  filteredParentPassages(): PassageOption[] {
    const query = this.parentPassageSearch.value.trim().toLowerCase();
    return this.passagesResource
      .value()
      .filter((passage) => passage.id.toLowerCase().includes(query));
  }

  selectParentPassage(passageId: string | null): void {
    this.form.controls.parent_passage_id.setValue(passageId);
    this.parentPassageSearch.setValue(passageId ?? '');
  }

  duplicateBiomodelId(): boolean {
    if (this.data.mode !== 'create') return false;
    const id = this.form.controls.id.value.trim();
    if (!id) return false;
    return this.biomodelsResource.value().some((biomodel) => biomodel.id === id);
  }

  buildDialogResult(): Partial<Biomodel> {
    return this.form.getRawValue();
  }
}
