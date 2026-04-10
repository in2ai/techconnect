import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Patient, Tumor } from '@generated/models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ColumnDef, DataTableComponent } from '@shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import {
  Breadcrumb,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { TumorFormComponent } from '../../../tumors/components/tumor-form/tumor-form.component';
import { TumorService } from '../../../tumors/services/tumor.service';
import { PatientFormComponent } from '../../components/patient-form/patient-form.component';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    PageHeaderComponent,
    DataTableComponent,
    LoadingStateComponent,
  ],
  template: `
    <app-page-header [title]="pageTitle()" [breadcrumbs]="breadcrumbs()">
      @if (auth.isAdmin()) {
        <button mat-stroked-button (click)="openEditDialog()">
          <mat-icon>edit</mat-icon>
          <ng-container i18n="@@editBtn">Edit</ng-container>
        </button>
        <button mat-stroked-button color="warn" (click)="confirmDelete()">
          <mat-icon>delete</mat-icon>
          <ng-container i18n="@@deleteBtn">Delete</ng-container>
        </button>
      }
    </app-page-header>

    @if (patientResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (patientResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadPatient"
        errorMessage="Failed to load patient"
        (retry)="patientResource.reload()"
      />
    } @else if (patientResource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@nhcLbl">NHC</span>
              <span class="detail-value">{{ patientResource.value()!.nhc }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sexLbl">Sex</span>
              <span class="detail-value">{{ patientResource.value()!.sex || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@birthDateLbl">Birth Date</span>
              <span class="detail-value">{{ patientResource.value()!.birth_date || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab i18n-label="@@tumorsTab" label="Tumors">
          <div class="tab-content">
            <div class="tab-toolbar" style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
              @if (auth.isAdmin()) {
                <button mat-button color="primary" (click)="openCreateTumorDialog()">
                  <mat-icon>add</mat-icon>
                  <ng-container i18n="@@addTumorBtn">Add Tumor</ng-container>
                </button>
              }
            </div>
            @if (tumorsResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (tumorsResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadTumors"
                errorMessage="Failed to load tumors"
                (retry)="tumorsResource.reload()"
              />
            } @else if (tumorsResource.hasValue() && filteredTumors().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="coronavirus"
                i18n-emptyTitle="@@noTumorsEmpty"
                emptyTitle="No tumors"
                i18n-emptyMessage="@@noTumorsMsg"
                emptyMessage="No tumor samples linked to this patient."
              />
            } @else if (tumorsResource.hasValue()) {
              <app-data-table
                [columns]="tumorColumns"
                [data]="filteredTumors()"
                (rowClicked)="onTumorClick($event)"
              />
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [],
})
export class PatientDetailPage {
  nhc = input.required<string>();
  pageTitle = computed(() => $localize`:@@patientDetailTitle:Patient ${this.nhc()}:nhc:`);

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly patientService = inject(PatientService);
  private readonly tumorService = inject(TumorService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Patients`, route: '/patients' },
    { label: this.nhc() },
  ]);

  patientResource = httpResource<Patient>(() => `${this.apiUrl}/patients/${this.nhc()}`);

  tumorsResource = httpResource<Tumor[]>(() => `${this.apiUrl}/tumors`, {
    defaultValue: [],
  });

  filteredTumors = computed(
    () => this.tumorsResource.value()?.filter((t) => t.patient_nhc === this.nhc()) ?? [],
  );

  tumorColumns: ColumnDef[] = [
    { key: 'biobank_code', label: $localize`:@@biobankCodeLbl:Biobank Code`, sortable: true },
    { key: 'lab_code', label: $localize`:@@labCodeLbl:Lab Code`, sortable: true },
    { key: 'classification', label: $localize`:@@classificationLbl:Classification`, sortable: true },
    { key: 'organ', label: $localize`:@@organLbl:Organ`, sortable: true },
    { key: 'status', label: $localize`:@@tumorStatusLbl:Status`, sortable: true },
    {
      key: 'registration_date',
      label: $localize`:@@tumorRegistrationDateLbl:Registration Date`,
      sortable: true,
      type: 'date',
    },
  ];

  onTumorClick(tumor: Tumor): void {
    this.router.navigate(['/tumors', tumor.biobank_code]);
  }

  openEditDialog(): void {
    const patient = this.patientResource.value();
    if (!patient) return;
    const dialogRef = this.dialog.open(PatientFormComponent, {
      width: '500px',
      data: { mode: 'edit', patient },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.patientService.update(patient.nhc, result).subscribe({
          next: () => {
            this.notification.success('Patient updated successfully');
            this.patientResource.reload();
          },
          error: () => {
            this.notification.error('Failed to update patient');
          },
        });
      }
    });
  }

  openCreateTumorDialog(): void {
    const dialogRef = this.dialog.open(TumorFormComponent, {
      width: '600px',
      data: { mode: 'create', tumor: { patient_nhc: this.nhc() } as Partial<Tumor> },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.tumorService.create(result).subscribe({
          next: () => {
            this.notification.success('Tumor created successfully');
            this.tumorsResource.reload();
          },
          error: () => {
            this.notification.error('Failed to create tumor');
          },
        });
      }
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Patient`,
        message: `Are you sure you want to delete patient ${this.nhc()}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.patientService.delete(this.nhc()).subscribe({
          next: () => {
            this.notification.success('Patient deleted');
            this.router.navigate(['/patients']);
          },
          error: () => {
            this.notification.error('Failed to delete patient');
          },
        });
      }
    });
  }
}
