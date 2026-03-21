import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { httpResource } from '@angular/common/http';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PatientFormComponent } from '../../components/patient-form/patient-form.component';

@Component({
  selector: 'app-patient-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    DataTableComponent,
    LoadingStateComponent,
  ],
  template: `
    <app-page-header i18n-title="@@patientsTitle" title="Patients" i18n-subtitle="@@patientsSubtitle" subtitle="Manage patient records and demographics">
      <button mat-flat-button (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addPatient">Add Patient</ng-container>
      </button>
    </app-page-header>

    @if (patientsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (patientsResource.error()) {
      <app-loading-state status="error" errorMessage="Failed to load patients" (retry)="patientsResource.reload()" />
    } @else if (patientsResource.hasValue() && patientsResource.value()!.length === 0) {
      <app-loading-state
        status="empty"
        emptyIcon="person_off"
        i18n-emptyTitle="@@noPatientsYet"
        emptyTitle="No patients yet"
        i18n-emptyMessage="@@addFirstPatient"
        emptyMessage="Add your first patient to get started."
      />
    } @else if (patientsResource.hasValue()) {
      <app-data-table
        [columns]="columns"
        [data]="patientsResource.value()!"
        (rowClicked)="onPatientClick($event)"
      />
    }
  `,
})
export class PatientListPage {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private patientService = inject(PatientService);
  private notification = inject(NotificationService);
  private apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'nhc', label: $localize`NHC`, sortable: true },
    { key: 'sex', label: $localize`Sex`, sortable: true },
    { key: 'birth_date', label: $localize`Birth Date`, sortable: true, type: 'date' },
  ];

  patientsResource = httpResource<Patient[]>(() => `${this.apiUrl}/patients`, {
    defaultValue: [],
  });

  onPatientClick(patient: Patient): void {
    this.router.navigate(['/patients', patient.nhc]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PatientFormComponent, {
      width: '500px',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.patientService.create(result).subscribe({
          next: () => {
            this.notification.success('Patient created successfully');
            this.patientsResource.reload();
          },
          error: (err) => {
            this.notification.error('Failed to create patient');
            console.error('Patient creation failed:', err);
          },
        });
      }
    });
  }
}
