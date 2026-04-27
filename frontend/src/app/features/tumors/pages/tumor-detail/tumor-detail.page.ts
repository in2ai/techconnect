import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import {
  Biomodel,
  Sample,
  Tumor,
  TumorGenomicSequencing,
  TumorMolecularData,
} from '@generated/models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ColumnDef, DataTableComponent } from '@shared/components/data-table/data-table.component';
import {
  EntityField,
  GenericEntityDialogData,
  GenericEntityFormComponent,
} from '@shared/components/generic-entity-form/generic-entity-form.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import {
  Breadcrumb,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { BiomodelFormComponent } from '../../../biomodels/components/biomodel-form/biomodel-form.component';
import { BiomodelService } from '../../../biomodels/services/biomodel.service';
import { SampleFormComponent } from '../../../samples/components/sample-form/sample-form.component';
import { SampleService } from '../../../samples/services/sample.service';
import { TumorFormComponent } from '../../components/tumor-form/tumor-form.component';
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
              <span class="detail-label" i18n="@@tubeCodeLbl">Tube Code</span
              ><span class="detail-value">{{ tumorResource.value()!.tube_code || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@classificationLbl">Classification</span
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
              <span class="detail-label" i18n="@@tumorStageLbl">Stage</span
              ><span class="detail-value">{{ tumorResource.value()!.stage || '—' }}</span>
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
              <span class="detail-label" i18n="@@interventionDateLbl">Intervention Date</span
              ><span class="detail-value">{{
                tumorResource.value()!.intervention_date || '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@tumorApDiagnosisLbl">AP Diagnosis</span
              ><span class="detail-value">{{ tumorResource.value()!.ap_diagnosis || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab i18n-label="@@biomodelsTab" label="Biomodels">
          <div class="tab-content">
            <div
              class="tab-toolbar"
              style="display: flex; justify-content: flex-end; margin-bottom: 16px;"
            >
              @if (auth.isAdmin()) {
                <button mat-button color="primary" (click)="openCreateBiomodelDialog()">
                  <mat-icon>add</mat-icon>
                  <ng-container i18n="@@addBiomodelFullBtn">Add Biomodel</ng-container>
                </button>
              }
            </div>
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
            <div
              class="tab-toolbar"
              style="display: flex; justify-content: flex-end; margin-bottom: 16px;"
            >
              @if (auth.isAdmin()) {
                <button mat-button color="primary" (click)="openCreateSampleDialog()">
                  <mat-icon>add</mat-icon>
                  <ng-container i18n="@@addSampleBtn">Add Sample</ng-container>
                </button>
              }
            </div>
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
        <mat-tab i18n-label="@@genomicTabLbl" label="Genomic Sequencing">
          <div class="tab-content">
            @if (genomicResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (genomicResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadGenomicData"
                errorMessage="Failed to load genomic data"
                (retry)="genomicResource.reload()"
              />
            } @else if (filteredGenomic().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="science"
                i18n-emptyTitle="@@noGenomicDataTitle"
                emptyTitle="No genomic data"
                i18n-emptyMessage="@@noTumorGenomicDataMsg"
                emptyMessage="No genomic sequencing data linked to this tumor."
              />
            } @else {
              <app-data-table
                [columns]="genomicColumns"
                [data]="filteredGenomic()"
                (rowClicked)="openGenomicForm($event)"
              />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@molecularTabLbl" label="Molecular Data">
          <div class="tab-content">
            @if (molecularResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (molecularResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadMolecularData"
                errorMessage="Failed to load molecular data"
                (retry)="molecularResource.reload()"
              />
            } @else if (filteredMolecular().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="biotech"
                i18n-emptyTitle="@@noMolecularDataTitle"
                emptyTitle="No molecular data"
                i18n-emptyMessage="@@noTumorMolecularDataMsg"
                emptyMessage="No molecular data linked to this tumor."
              />
            } @else {
              <app-data-table
                [columns]="molecularColumns"
                [data]="filteredMolecular()"
                (rowClicked)="openMolecularForm($event)"
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
  private readonly biomodelService = inject(BiomodelService);
  private readonly sampleService = inject(SampleService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Tumors`, route: '/tumors' },
    { label: this.biobank_code() },
  ]);

  tumorResource = httpResource<Tumor>(() => `${this.apiUrl}/tumors/${this.biobank_code()}`);
  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, {
    defaultValue: [],
  });
  samplesResource = httpResource<Sample[]>(() => `${this.apiUrl}/samples`, { defaultValue: [] });
  genomicResource = httpResource<TumorGenomicSequencing[]>(
    () => `${this.apiUrl}/tumor-genomic-sequencings`,
    { defaultValue: [] },
  );
  molecularResource = httpResource<TumorMolecularData[]>(
    () => `${this.apiUrl}/tumor-molecular-data`,
    { defaultValue: [] },
  );

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
  filteredGenomic = computed(
    () =>
      this.genomicResource
        .value()
        ?.filter((item) => item.tumor_biobank_code === this.biobank_code()) ?? [],
  );
  filteredMolecular = computed(
    () =>
      this.molecularResource
        .value()
        ?.filter((item) => item.tumor_biobank_code === this.biobank_code()) ?? [],
  );

  biomodelColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'type', label: $localize`Type`, sortable: true },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'success', label: $localize`:@@biomodelSuccessLbl:Success`, type: 'boolean' },
    { key: 'creation_date', label: $localize`Created`, sortable: true, type: 'date' },
  ];

  lbColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'has_serum', label: $localize`Serum`, type: 'boolean' },
    { key: 'has_buffy', label: $localize`Buffy Coat`, type: 'boolean' },
    { key: 'has_plasma', label: $localize`Plasma`, type: 'boolean' },
    {
      key: 'has_tumor_tissue_oct',
      label: $localize`:@@tumorTissueOctLbl:Tumor Tissue OCT`,
      type: 'boolean',
    },
    {
      key: 'has_non_tumor_tissue_oct',
      label: $localize`:@@nonTumorTissueOctLbl:Non-Tumor Tissue OCT`,
      type: 'boolean',
    },
    { key: 'obtain_date', label: $localize`Date`, sortable: true, type: 'date' },
  ];

  genomicColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'has_data', label: $localize`:@@hasDataLbl:Has Data`, type: 'boolean' },
    { key: 'data', label: $localize`:@@dataLbl:Data` },
  ];

  molecularColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'has_data', label: $localize`:@@hasDataLbl:Has Data`, type: 'boolean' },
    { key: 'data', label: $localize`:@@dataLbl:Data` },
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

  openCreateBiomodelDialog(): void {
    const dialogRef = this.dialog.open(BiomodelFormComponent, {
      width: '600px',
      data: {
        mode: 'create',
        biomodel: { tumor_biobank_code: this.biobank_code() } as Partial<Biomodel>,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.biomodelService.create(result).subscribe({
          next: () => {
            this.notification.success('Biomodel created');
            this.biomodelsResource.reload();
          },
          error: () => this.notification.error('Failed to create biomodel'),
        });
      }
    });
  }

  openCreateSampleDialog(): void {
    const dialogRef = this.dialog.open(SampleFormComponent, {
      width: '600px',
      data: {
        mode: 'create',
        biopsy: { tumor_biobank_code: this.biobank_code() } as Partial<Sample>,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sampleService.create(result).subscribe({
          next: () => {
            this.notification.success('Sample created');
            this.samplesResource.reload();
          },
          error: () => this.notification.error('Failed to create sample'),
        });
      }
    });
  }

  openEntityForm(
    title: string,
    endpoint: string,
    fields: EntityField[],
    resource: { reload: () => void },
    entity: { id: string } | null = null,
    defaultValues: Record<string, unknown> = {},
  ): void {
    const dialogRef = this.dialog.open(GenericEntityFormComponent, {
      width: '500px',
      data: { title, endpoint, fields, entity, defaultValues } as GenericEntityDialogData,
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) resource.reload();
    });
  }

  openGenomicForm(entity: TumorGenomicSequencing): void {
    this.openEntityForm(
      $localize`:@@genomicSequenceFormTitle:Genomic Sequence`,
      '/tumor-genomic-sequencings',
      [
        { name: 'has_data', label: $localize`:@@hasDataLbl:Has Data`, type: 'boolean' },
        { name: 'data', label: $localize`:@@dataLbl:Data`, type: 'text' },
      ],
      this.genomicResource,
      entity,
    );
  }

  openMolecularForm(entity: TumorMolecularData): void {
    this.openEntityForm(
      $localize`:@@molecularTitle:Molecular Data`,
      '/tumor-molecular-data',
      [
        { name: 'has_data', label: $localize`:@@hasDataLbl:Has Data`, type: 'boolean' },
        { name: 'data', label: $localize`:@@dataLbl:Data`, type: 'text' },
      ],
      this.molecularResource,
      entity,
    );
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
