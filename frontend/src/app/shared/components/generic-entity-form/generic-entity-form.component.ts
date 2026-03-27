import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';

export interface EntityField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
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

@Component({
  selector: 'app-generic-entity-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="entity-form">
        @for (field of data.fields; track field.name) {
          @if (field.type === 'text' || field.type === 'number') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput [type]="field.type" [formControlName]="field.name" />
            </mat-form-field>
          }

          @if (field.type === 'date') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput [matDatepicker]="picker" [formControlName]="field.name" />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
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
      @if (isEdit) {
        <button mat-button color="warn" (click)="deleteEntity()">Delete</button>
      }
      <span class="spacer"></span>
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || submitting"
        (click)="save()"
      >
        Save
      </button>
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

  form!: FormGroup;
  isEdit = false;
  submitting = false;

  ngOnInit() {
    this.isEdit = !!this.data.entity;
    const group: Record<string, any> = {};

    for (const field of this.data.fields) {
      const validators = field.required ? [Validators.required] : [];

      let initValue = null;
      if (this.isEdit && this.data.entity) {
        initValue = this.data.entity[field.name];
      } else if (this.data.defaultValues && field.name in this.data.defaultValues) {
        initValue = this.data.defaultValues[field.name];
      }

      // Automatically convert YYYY-MM-DD strings to Date for datepicker if needed
      if (field.type === 'date' && initValue && typeof initValue === 'string') {
        initValue = new Date(initValue);
      }

      group[field.name] = [initValue, validators];
    }
    this.form = this.fb.group(group);
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

    // Convert Date objects back to ISO for backend
    for (const field of this.data.fields) {
      if (field.type === 'date' && payload[field.name] instanceof Date) {
        payload[field.name] = payload[field.name].toISOString().split('T')[0];
      }
    }

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
