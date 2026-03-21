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
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';
import {
  Cryopreservation,
  Implant,
  Mouse,
  TrialImage,
  UsageRecord,
} from '../../models/trial-related.model';
import { LCTrial, PDOTrial, PDXTrial, Trial } from '../../models/trial.model';
import { TrialService } from '../../services/trial.service';

@Component({
  selector: 'app-trial-detail',
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
    <app-page-header title="Trial" [breadcrumbs]="breadcrumbs()">
      <button mat-stroked-button (click)="openEditDialog()" [disabled]="!trialResource.hasValue()">
        <mat-icon>edit</mat-icon> <ng-container i18n="@@editBtn">Edit</ng-container>
      </button>
      <button mat-stroked-button color="warn" (click)="confirmDelete()">
        <mat-icon>delete</mat-icon> <ng-container i18n="@@deleteBtn">Delete</ng-container>
      </button>
    </app-page-header>

    @if (trialResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (trialResource.error()) {
      <app-loading-state
        status="error"
        errorMessage="Failed to load trial"
        (retry)="trialResource.reload()"
      />
    } @else if (trialResource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialIdLbl">ID</span
              ><span class="detail-value">{{ trialResource.value()!.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialSuccessLbl">Success</span
              ><span class="detail-value">
                @if (trialResource.value()!.success === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (trialResource.value()!.success === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialCreatedLbl">Created</span
              ><span class="detail-value">{{ trialResource.value()!.creation_date || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialBiobankShipmentLbl">Biobank Shipment</span
              ><span class="detail-value">
                @if (trialResource.value()!.biobank_shipment === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (trialResource.value()!.biobank_shipment === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialArrivalDateLbl">Arrival Date</span
              ><span class="detail-value">{{
                trialResource.value()!.biobank_arrival_date || '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialPassageLbl">Passage</span
              ><span class="detail-value">{{ trialResource.value()!.passage_id }}</span>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label" i18n="@@trialDescLbl">Description</span
              ><span class="detail-value">{{ trialResource.value()!.description || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- PDX Trial Section -->
      @if (currentPdxTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title i18n="@@pdxTrialDetailsTitle">PDX Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdxFfpeLbl">FFPE</span
                ><span class="detail-value">
                  @if (currentPdxTrial()!.ffpe === true) {
                    <ng-container i18n="@@yesOpt">Yes</ng-container>
                  } @else if (currentPdxTrial()!.ffpe === false) {
                    <ng-container i18n="@@noOpt">No</ng-container>
                  } @else {
                    —
                  }
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdxHeSlideLbl">HE Slide</span
                ><span class="detail-value">
                  @if (currentPdxTrial()!.he_slide === true) {
                    <ng-container i18n="@@yesOpt">Yes</ng-container>
                  } @else if (currentPdxTrial()!.he_slide === false) {
                    <ng-container i18n="@@noOpt">No</ng-container>
                  } @else {
                    —
                  }
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdxIhqDataLbl">IHQ Data</span
                ><span class="detail-value">{{ currentPdxTrial()!.ihq_data || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdxLatencyLbl">Latency (weeks)</span
                ><span class="detail-value">{{ currentPdxTrial()!.latency_weeks ?? '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- PDO Trial Section -->
      @if (currentPdoTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title i18n="@@pdoTrialDetailsTitle">PDO Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdoDropCountLbl">Drop Count</span
                ><span class="detail-value">{{ currentPdoTrial()!.drop_count ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdoOrganoidCountLbl">Organoid Count</span
                ><span class="detail-value">{{ currentPdoTrial()!.organoid_count ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdoFrozenOrganoidsLbl">Frozen Organoids</span
                ><span class="detail-value">{{
                  currentPdoTrial()!.frozen_organoid_count ?? '—'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdoPlateTypeLbl">Plate Type</span
                ><span class="detail-value">{{ currentPdoTrial()!.plate_type || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdoAssessmentLbl">Assessment</span
                ><span class="detail-value">{{ currentPdoTrial()!.assessment || '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- LC Trial Section -->
      @if (currentLcTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title i18n="@@lcTrialDetailsTitle">LC Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label" i18n="@@lcConfluenceLbl">Confluence</span
                ><span class="detail-value">{{ currentLcTrial()!.confluence ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@lcSpheroidsLbl">Spheroids</span
                ><span class="detail-value">
                  @if (currentLcTrial()!.spheroids === true) {
                    <ng-container i18n="@@yesOpt">Yes</ng-container>
                  } @else if (currentLcTrial()!.spheroids === false) {
                    <ng-container i18n="@@noOpt">No</ng-container>
                  } @else {
                    —
                  }
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@lcDigestionDateLbl">Digestion Date</span
                ><span class="detail-value">{{ currentLcTrial()!.digestion_date || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@lcPlateTypeLbl">Plate Type</span
                ><span class="detail-value">{{ currentLcTrial()!.plate_type || '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab i18n-label="@@implantsTabLbl" label="Implants">
          <div class="tab-content">
            @if (implantsResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (implantsResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadImplants"
                errorMessage="Failed to load implants"
                (retry)="implantsResource.reload()"
              />
            } @else if (filteredImplants().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="build"
                i18n-emptyTitle="@@noImplantsTitle"
                emptyTitle="No implants"
                i18n-emptyMessage="@@noImplantsMsg"
                emptyMessage="No implants linked to this trial."
              />
            } @else {
              <app-data-table [columns]="implantColumns" [data]="filteredImplants()" />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@mouseTabLbl" label="Mouse">
          <div class="tab-content">
            @if (mouseResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (mouseResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadMice"
                errorMessage="Failed to load mice"
                (retry)="mouseResource.reload()"
              />
            } @else if (filteredMice().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="pets"
                i18n-emptyTitle="@@noMiceTitle"
                emptyTitle="No mice"
                i18n-emptyMessage="@@noMiceMsg"
                emptyMessage="No mice linked to this trial."
              />
            } @else {
              <app-data-table [columns]="mouseColumns" [data]="filteredMice()" />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@usageRecordsTabLbl" label="Usage Records">
          <div class="tab-content">
            @if (usageResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (usageResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadUsage"
                errorMessage="Failed to load usage records"
                (retry)="usageResource.reload()"
              />
            } @else if (filteredUsage().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="receipt"
                i18n-emptyTitle="@@noUsageTitle"
                emptyTitle="No usage records"
                i18n-emptyMessage="@@noUsageMsg"
                emptyMessage="No usage records for this trial."
              />
            } @else {
              <app-data-table [columns]="usageColumns" [data]="filteredUsage()" />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@imagesTabLbl" label="Images">
          <div class="tab-content">
            @if (imagesResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (imagesResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadImages"
                errorMessage="Failed to load images"
                (retry)="imagesResource.reload()"
              />
            } @else if (filteredImages().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="image"
                i18n-emptyTitle="@@noImagesTitle"
                emptyTitle="No images"
                i18n-emptyMessage="@@noImagesMsg"
                emptyMessage="No images for this trial."
              />
            } @else {
              <app-data-table [columns]="imageColumns" [data]="filteredImages()" />
            }
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@cryoTabLbl" label="Cryopreservation">
          <div class="tab-content">
            @if (cryoResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (cryoResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadCryo"
                errorMessage="Failed to load cryopreservations"
                (retry)="cryoResource.reload()"
              />
            } @else if (filteredCryo().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="ac_unit"
                i18n-emptyTitle="@@noCryoTitle"
                emptyTitle="No cryopreservations"
                i18n-emptyMessage="@@noCryoMsg"
                emptyMessage="No cryopreservation records for this trial."
              />
            } @else {
              <app-data-table [columns]="cryoColumns" [data]="filteredCryo()" />
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [],
})
export class TrialDetailPage {
  id = input.required<string>();

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly trialService = inject(TrialService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Trials`, route: '/trials' },
    { label: this.id() },
  ]);

  trialResource = httpResource<Trial>(() => `${this.apiUrl}/trials/${this.id()}`);

  // Load subtype collections and select by id locally to avoid noisy 404s.
  pdxTrialsResource = httpResource<PDXTrial[]>(() => `${this.apiUrl}/pdx-trials`, {
    defaultValue: [],
  });
  pdoTrialsResource = httpResource<PDOTrial[]>(() => `${this.apiUrl}/pdo-trials`, {
    defaultValue: [],
  });
  lcTrialsResource = httpResource<LCTrial[]>(() => `${this.apiUrl}/lc-trials`, {
    defaultValue: [],
  });

  // Child entity resources
  implantsResource = httpResource<Implant[]>(() => `${this.apiUrl}/implants`, { defaultValue: [] });
  mouseResource = httpResource<Mouse[]>(() => `${this.apiUrl}/mice`, { defaultValue: [] });
  usageResource = httpResource<UsageRecord[]>(() => `${this.apiUrl}/usage-records`, {
    defaultValue: [],
  });
  imagesResource = httpResource<TrialImage[]>(() => `${this.apiUrl}/images`, { defaultValue: [] });
  cryoResource = httpResource<Cryopreservation[]>(() => `${this.apiUrl}/cryopreservations`, {
    defaultValue: [],
  });

  currentPdxTrial = computed(
    () => this.pdxTrialsResource.value()?.find((trial) => trial.id === this.id()) ?? undefined,
  );
  currentPdoTrial = computed(
    () => this.pdoTrialsResource.value()?.find((trial) => trial.id === this.id()) ?? undefined,
  );
  currentLcTrial = computed(
    () => this.lcTrialsResource.value()?.find((trial) => trial.id === this.id()) ?? undefined,
  );

  filteredMice = computed(
    () => this.mouseResource.value()?.filter((m) => m.pdx_trial_id === this.id()) ?? [],
  );
  filteredImplants = computed(() => {
    const miceIds = new Set(this.filteredMice().map((m) => m.id));
    return this.implantsResource.value()?.filter((i) => miceIds.has(i.mouse_id)) ?? [];
  });
  filteredUsage = computed(
    () => this.usageResource.value()?.filter((u) => u.trial_id === this.id()) ?? [],
  );
  filteredImages = computed(
    () => this.imagesResource.value()?.filter((img) => img.trial_id === this.id()) ?? [],
  );
  filteredCryo = computed(
    () => this.cryoResource.value()?.filter((c) => c.trial_id === this.id()) ?? [],
  );

  implantColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'implant_location', label: $localize`Location` },
    { key: 'type', label: $localize`Type` },
    { key: 'size_limit', label: $localize`Size Limit`, type: 'number' },
  ];

  mouseColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'strain', label: $localize`Strain` },
    { key: 'sex', label: $localize`Sex` },
    { key: 'birth_date', label: $localize`Birth Date`, type: 'date' },
    { key: 'death_date', label: $localize`Death Date`, type: 'date' },
    { key: 'death_cause', label: $localize`Death Cause` },
  ];

  usageColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'usage_type', label: $localize`Type` },
    { key: 'description', label: $localize`Description` },
    { key: 'record_date', label: $localize`Date`, type: 'date' },
  ];

  imageColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'type', label: $localize`Type` },
    { key: 'image_date', label: $localize`Date`, type: 'date' },
    { key: 'ap_review', label: $localize`AP Review` },
  ];

  cryoColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'location', label: $localize`Location` },
    { key: 'cryo_date', label: $localize`Date`, type: 'date' },
    { key: 'vial_count', label: $localize`Vials`, type: 'number' },
  ];

  openEditDialog(): void {
    const trial = this.trialResource.value();
    if (!trial) return;

    const dialogRef = this.dialog.open(TrialFormComponent, {
      width: '600px',
      data: { mode: 'edit', trial },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.trialService.update(trial.id, result).subscribe({
          next: () => {
            this.notification.success('Trial updated');
            this.trialResource.reload();
          },
          error: () => {
            this.notification.error('Failed to update trial');
          },
        });
      }
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Trial`,
        message: 'Delete this trial and all related data? This cannot be undone.',
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.trialService.delete(this.id()).subscribe({
          next: () => {
            this.notification.success('Trial deleted');
            this.router.navigate(['/trials']);
          },
          error: () => {
            this.notification.error('Failed to delete trial');
          },
        });
      }
    });
  }
}
