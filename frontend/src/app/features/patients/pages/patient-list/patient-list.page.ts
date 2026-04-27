import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Patient } from '@generated/models';
import {
  ColumnDef,
  DataTableComponent,
  TableFilter,
} from '@shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PatientFormComponent } from '../../components/patient-form/patient-form.component';
import { PatientService } from '../../services/patient.service';

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
    <app-page-header
      i18n-title="@@patientsTitle"
      title="Patients"
      i18n-subtitle="@@patientsSubtitle"
      subtitle="Manage patient records and demographics"
    >
      @if (auth.isAdmin()) {
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <ng-container i18n="@@addPatient">Add Patient</ng-container>
        </button>
      }
    </app-page-header>

    @if (patientsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (patientsResource.error()) {
      <app-loading-state
        status="error"
        errorMessage="Failed to load patients"
        (retry)="patientsResource.reload()"
      />
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
        [filters]="tableFilters()"
        (rowClicked)="onPatientClick($event)"
      />
    }
  `,
})
export class PatientListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly patientService = inject(PatientService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  columns: ColumnDef[] = [
    { key: 'nhc', label: $localize`:@@nhcLbl:NHC`, sortable: true },
    { key: 'sex', label: $localize`:@@sexLbl:Sex`, sortable: true },
    { key: 'age', label: $localize`:@@ageLbl:Age`, sortable: true, type: 'number' },
  ];

  patientsResource = httpResource<Patient[]>(() => `${this.apiUrl}/patients`, {
    defaultValue: [],
  });

  tableFilters = computed<TableFilter[]>(() => {
    const data = this.patientsResource.value() || [];
    const sexes = Array.from(new Set(data.map((p) => p.sex).filter((s): s is string => !!s))).sort(
      (a, b) => a.localeCompare(b),
    );

    return [
      {
        key: 'sex',
        label: $localize`:@@sexLbl:Sex`,
        options: sexes.map((s) => ({ label: s, value: s })),
      },
    ];
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
