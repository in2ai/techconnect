import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumericInputDirective } from '@shared/directives/numeric-input.directive';
import { numberFormatValidator } from '@shared/forms/numeric-input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';

export interface EntityField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  /** For numeric fields: allow only integers (no decimal separator). */
  integerOnly?: boolean;
  required?: boolean;
  options?: { value: any; label: string }[];
}

export interface GenericEntityDialogData {
  title: string;
  endpoint: string; // e.g. '/implants'
  fields: EntityField[];
  entity?: any; // the object being edited
  defaultValues?: Record<string, any>; // default fields like mouse_id: 'auto'
}

/** Values for native `<input type="date">` (yyyy-MM-dd). */
function toDateInputValue(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.split('T')[0];
  if (value instanceof Date) {
    const d = value;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function toApiDateString(value: unknown): string | null {
  if (value === '' || value == null) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return null;
}

function toApiNumber(value: unknown, integerOnly: boolean): number | null {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return integerOnly ? Math.trunc(n) : n;
}

function applyPayloadFieldTransforms(payload: Record<string, unknown>, fields: EntityField[]): void {
  for (const field of fields) {
    if (field.type === 'date') {
      payload[field.name] = toApiDateString(payload[field.name]);
    }
    if (field.type === 'number') {
      payload[field.name] = toApiNumber(payload[field.name], field.integerOnly ?? false);
    }
  }
}

@Component({
  selector: 'app-generic-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    NumericInputDirective,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="entity-form">
        @for (field of data.fields; track field.name) {
          @if (field.type === 'text') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput type="text" [formControlName]="field.name" />
            </mat-form-field>
          }

          @if (field.type === 'number') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <input
                matInput
                type="text"
                [attr.inputmode]="field.integerOnly ? 'numeric' : 'decimal'"
                [formControlName]="field.name"
                appNumericInput
                [integerOnly]="field.integerOnly ?? false"
                autocomplete="off"
              />
            </mat-form-field>
          }

          @if (field.type === 'date') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput [formControlName]="field.name" type="date" />
            </mat-form-field>
          }

          @if (field.type === 'boolean') {
            <mat-checkbox [formControlName]="field.name" class="full-width">
              {{ field.label }}
            </mat-checkbox>
          }

          @if (field.type === 'select') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <mat-select [formControlName]="field.name">
                @for (opt of field.options; track opt.value) {
                  <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (auth.isAdmin()) {
        @if (isEdit) {
          <button mat-button color="warn" (click)="deleteEntity()" i18n="@@deleteBtn">Delete</button>
        }
        <span class="spacer"></span>
        <button mat-button mat-dialog-close i18n="@@cancelBtn">Cancel</button>
        <button
          mat-flat-button
          color="primary"
          [disabled]="form.invalid || submitting"
          (click)="save()"
          i18n="@@saveBtn"
        >Save</button>
      } @else {
        <span class="spacer"></span>
        <button mat-button mat-dialog-close i18n="@@closeAction">Close</button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      .entity-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
      }
      .full-width {
        width: 100%;
      }
      .spacer {
        flex: 1 1 auto;
      }
      mat-checkbox {
        margin-bottom: 8px;
      }
    `,
  ],
})
export class GenericEntityFormComponent implements OnInit {
  data = inject<GenericEntityDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<GenericEntityFormComponent>);
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  notification = inject(NotificationService);
  apiUrl = inject(API_URL);
  auth = inject(AuthService);

  form!: FormGroup;
  isEdit = false;
  submitting = false;

  ngOnInit() {
    this.isEdit = !!this.data.entity;
    const group: Record<string, any> = {};

    for (const field of this.data.fields) {
      const validators = [...(field.required ? [Validators.required] : [])];
      if (field.type === 'number') {
        validators.push(numberFormatValidator(field.integerOnly ?? false));
      }

      let initValue = null;
      if (this.isEdit && this.data.entity) {
        initValue = this.data.entity[field.name];
      } else if (this.data.defaultValues && field.name in this.data.defaultValues) {
        initValue = this.data.defaultValues[field.name];
      }

      if (field.type === 'date') {
        initValue = toDateInputValue(initValue);
      }

      group[field.name] = [initValue, validators];
    }
    this.form = this.fb.group(group);

    if (!this.auth.isAdmin()) {
      this.form.disable();
    }
  }

  save() {
    if (this.form.invalid) return;

    this.submitting = true;
    const payload = { ...this.form.value };

    // Restore any hidden defaultValues like IDs that aren't form fields
    if (!this.isEdit && this.data.defaultValues) {
      for (const [k, v] of Object.entries(this.data.defaultValues)) {
        if (!(k in payload)) {
          payload[k] = v;
        }
      }
    }

    applyPayloadFieldTransforms(payload, this.data.fields);

    const request = this.isEdit
      ? this.http.patch(`${this.apiUrl}${this.data.endpoint}/${this.data.entity.id}`, payload)
      : this.http.post(`${this.apiUrl}${this.data.endpoint}`, payload);

    request.subscribe({
      next: () => {
        this.notification.success(`Successfully ${this.isEdit ? 'updated' : 'created'} item`);
        this.dialogRef.close(true);
      },
      error: () => {
        this.notification.error(`Failed to save item`);
        this.submitting = false;
      },
    });
  }

  deleteEntity() {
    if (!confirm('Are you sure you want to delete this item?')) return;

    this.submitting = true;
    this.http.delete(`${this.apiUrl}${this.data.endpoint}/${this.data.entity.id}`).subscribe({
      next: () => {
        this.notification.success('Item deleted');
        this.dialogRef.close(true);
      },
      error: () => {
        this.notification.error('Failed to delete item');
        this.submitting = false;
      },
    });
  }
}
