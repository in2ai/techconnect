import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { API_URL } from '../../../../core/tokens/api-url.token';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  ColumnDef,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import {
  Breadcrumb,
  PageHeaderComponent,
} from '../../../../shared/components/page-header/page-header.component';
import { Biomodel } from '../../../biomodels/models/biomodel.model';
import { Sample } from '../../../samples/models/sample.model';
import { TumorFormComponent } from '../../components/tumor-form/tumor-form.component';
import { Tumor } from '../../models/tumor.model';
import { TumorService } from '../../services/tumor.service';

@Component({
  selector: 'app-tumor-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    DataTableComponent,
    LoadingStateComponent,
  ],
  template: `
    <app-page-header [title]="pageTitle()" [breadcrumbs]="breadcrumbs()">
      <button mat-stroked-button (click)="openEditDialog()">
        <mat-icon>edit</mat-icon>
        <ng-container i18n="@@editBtn">Edit</ng-container>
      </button>
      <button mat-stroked-button color="warn" (click)="confirmDelete()">
        <mat-icon>delete</mat-icon>
        <ng-container i18n="@@deleteBtn">Delete</ng-container>
      </button>
    </app-page-header>

    @if (tumorResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (tumorResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadTumor"
        errorMessage="Failed to load tumor"
        (retry)="tumorResource.reload()"
      />
    } @else if (tumorResource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorBiobankCodeLbl">Biobank Code</span
              ><span class="detail-value">{{ tumorResource.value()!.biobank_code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorLabCodeLbl">Lab Code</span
              ><span class="detail-value">{{ tumorResource.value()!.lab_code || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorClassificationLbl">Classification</span
              ><span class="detail-value">{{ tumorResource.value()!.classification || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorGradeLbl">Grade</span
              ><span class="detail-value">{{ tumorResource.value()!.grade || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorOrganLbl">Organ</span
              ><span class="detail-value">{{ tumorResource.value()!.organ || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorStatusLbl">Status</span
              ><span class="detail-value">{{ tumorResource.value()!.status || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorTnmLbl">TNM</span
              ><span class="detail-value">{{ tumorResource.value()!.tnm || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorPatientNhcLbl">Patient NHC</span
              ><span class="detail-value">{{ tumorResource.value()!.patient_nhc }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorRegistrationDateLbl">Registration Date</span
              ><span class="detail-value">{{
                tumorResource.value()!.registration_date || '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorOperationDateLbl">Operation Date</span
              ><span class="detail-value">{{ tumorResource.value()!.operation_date || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorApObservationLbl">AP Observation</span
              ><span class="detail-value">{{ tumorResource.value()!.ap_observation || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab i18n-label="@@biomodelsTab" label="Biomodels">
          <div class="tab-content">
            @if (biomodelsResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (biomodelsResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadBiomodels"
                errorMessage="Failed to load biomodels"
                (retry)="biomodelsResource.reload()"
              />
            } @else if (filteredBiomodels().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="science"
                i18n-emptyTitle="@@noBiomodelsEmpty"
                emptyTitle="No biomodels"
                i18n-emptyMessage="@@noBiomodelsMsg"
                emptyMessage="No biomodels linked to this tumor."
              />
            } @else {
              <app-data-table
                [columns]="biomodelColumns"
                [data]="filteredBiomodels()"
                (rowClicked)="onBiomodelClick($event)"
              />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@samplesTab" label="Samples">
          <div class="tab-content">
            @if (samplesResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (samplesResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadSamples"
                errorMessage="Failed to load samples"
                (retry)="samplesResource.reload()"
              />
            } @else if (filteredSamples().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="water_drop"
                i18n-emptyTitle="@@noSamplesEmpty"
                emptyTitle="No samples"
                i18n-emptyMessage="@@noSamplesMsg"
                emptyMessage="No samples linked to this tumor."
              />
            } @else {
              <app-data-table
                [columns]="lbColumns"
                [data]="filteredSamples()"
                (rowClicked)="onSampleClick($event)"
              />
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [],
})
export class TumorDetailPage {
  biobank_code = input.required<string>();
  pageTitle = computed(() => $localize`:@@tumorDetailTitle:Tumor ${this.biobank_code()}:code:`);

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly tumorService = inject(TumorService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Tumors`, route: '/tumors' },
    { label: this.biobank_code() },
  ]);

  tumorResource = httpResource<Tumor>(() => `${this.apiUrl}/tumors/${this.biobank_code()}`);
  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, {
    defaultValue: [],
  });
  samplesResource = httpResource<Sample[]>(() => `${this.apiUrl}/samples`, { defaultValue: [] });

  filteredBiomodels = computed(
    () =>
      this.biomodelsResource.value()?.filter((b) => b.tumor_biobank_code === this.biobank_code()) ??
      [],
  );

  filteredSamples = computed(
    () =>
      this.samplesResource.value()?.filter((lb) => lb.tumor_biobank_code === this.biobank_code()) ??
      [],
  );

  biomodelColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'type', label: $localize`Type`, sortable: true },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'viability', label: $localize`Viability`, sortable: true, type: 'number' },
    { key: 'creation_date', label: $localize`Created`, sortable: true, type: 'date' },
  ];

  lbColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'has_serum', label: $localize`Serum`, type: 'boolean' },
    { key: 'has_buffy', label: $localize`Buffy Coat`, type: 'boolean' },
    { key: 'has_plasma', label: $localize`Plasma`, type: 'boolean' },
    { key: 'obtain_date', label: $localize`Date`, sortable: true, type: 'date' },
  ];

  onBiomodelClick(biomodel: Biomodel): void {
    this.router.navigate(['/biomodels', biomodel.id]);
  }

  onSampleClick(sample: Sample): void {
    this.router.navigate(['/samples', sample.id]);
  }

  openEditDialog(): void {
    const tumor = this.tumorResource.value();
    if (!tumor) return;
    const dialogRef = this.dialog.open(TumorFormComponent, {
      width: '600px',
      data: { mode: 'edit', tumor },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.tumorService.update(tumor.biobank_code, result).subscribe({
          next: () => {
            this.notification.success('Tumor updated');
            this.tumorResource.reload();
          },
          error: () => {
            this.notification.error('Failed to update tumor');
          },
        });
      }
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Tumor`,
        message: `Delete tumor ${this.biobank_code()}? This cannot be undone.`,
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.tumorService.delete(this.biobank_code()).subscribe({
          next: () => {
            this.notification.success('Tumor deleted');
            this.router.navigate(['/tumors']);
          },
          error: () => this.notification.error('Failed to delete tumor'),
        });
      }
    });
  }
}
