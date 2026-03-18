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
        <mat-icon>edit</mat-icon> Edit
      </button>
      <button mat-stroked-button color="warn" (click)="confirmDelete()">
        <mat-icon>delete</mat-icon> Delete
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
              <span class="detail-label">ID</span
              ><span class="detail-value">{{ trialResource.value()!.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Success</span
              ><span class="detail-value">{{
                trialResource.value()!.success === true
                  ? 'Yes'
                  : trialResource.value()!.success === false
                    ? 'No'
                    : '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Created</span
              ><span class="detail-value">{{ trialResource.value()!.creation_date || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Biobank Shipment</span
              ><span class="detail-value">{{
                trialResource.value()!.biobank_shipment === true
                  ? 'Yes'
                  : trialResource.value()!.biobank_shipment === false
                    ? 'No'
                    : '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Arrival Date</span
              ><span class="detail-value">{{
                trialResource.value()!.biobank_arrival_date || '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Passage</span
              ><span class="detail-value">{{ trialResource.value()!.passage_id }}</span>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label">Description</span
              ><span class="detail-value">{{ trialResource.value()!.description || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- PDX Trial Section -->
      @if (currentPdxTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title>PDX Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">FFPE</span
                ><span class="detail-value">{{
                  currentPdxTrial()!.ffpe === true
                    ? 'Yes'
                    : currentPdxTrial()!.ffpe === false
                      ? 'No'
                      : '—'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">HE Slide</span
                ><span class="detail-value">{{
                  currentPdxTrial()!.he_slide === true
                    ? 'Yes'
                    : currentPdxTrial()!.he_slide === false
                      ? 'No'
                      : '—'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">IHQ Data</span
                ><span class="detail-value">{{ currentPdxTrial()!.ihq_data || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Latency (weeks)</span
                ><span class="detail-value">{{ currentPdxTrial()!.latency_weeks ?? '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- PDO Trial Section -->
      @if (currentPdoTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title>PDO Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Drop Count</span
                ><span class="detail-value">{{ currentPdoTrial()!.drop_count ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Organoid Count</span
                ><span class="detail-value">{{ currentPdoTrial()!.organoid_count ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Frozen Organoids</span
                ><span class="detail-value">{{
                  currentPdoTrial()!.frozen_organoid_count ?? '—'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Plate Type</span
                ><span class="detail-value">{{ currentPdoTrial()!.plate_type || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Assessment</span
                ><span class="detail-value">{{ currentPdoTrial()!.assessment || '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- LC Trial Section -->
      @if (currentLcTrial()) {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header><mat-card-title>LC Trial Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Confluence</span
                ><span class="detail-value">{{ currentLcTrial()!.confluence ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Spheroids</span
                ><span class="detail-value">{{
                  currentLcTrial()!.spheroids === true
                    ? 'Yes'
                    : currentLcTrial()!.spheroids === false
                      ? 'No'
                      : '—'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Digestion Date</span
                ><span class="detail-value">{{ currentLcTrial()!.digestion_date || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Plate Type</span
                ><span class="detail-value">{{ currentLcTrial()!.plate_type || '—' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab label="Implants">
          <div class="tab-content">
            @if (implantsResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (implantsResource.error()) {
              <app-loading-state
                status="error"
                errorMessage="Failed to load implants"
                (retry)="implantsResource.reload()"
              />
            } @else if (filteredImplants().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="build"
                emptyTitle="No implants"
                emptyMessage="No implants linked to this trial."
              />
            } @else {
              <app-data-table [columns]="implantColumns" [data]="filteredImplants()" />
            }
          </div>
        </mat-tab>
        <mat-tab label="Mouse">
          <div class="tab-content">
            @if (mouseResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (mouseResource.error()) {
              <app-loading-state
                status="error"
                errorMessage="Failed to load mice"
                (retry)="mouseResource.reload()"
              />
            } @else if (filteredMice().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="pets"
                emptyTitle="No mice"
                emptyMessage="No mice linked to this trial."
              />
            } @else {
              <app-data-table [columns]="mouseColumns" [data]="filteredMice()" />
            }
          </div>
        </mat-tab>
        <mat-tab label="Usage Records">
          <div class="tab-content">
            @if (usageResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (usageResource.error()) {
              <app-loading-state
                status="error"
                errorMessage="Failed to load usage records"
                (retry)="usageResource.reload()"
              />
            } @else if (filteredUsage().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="receipt"
                emptyTitle="No usage records"
                emptyMessage="No usage records for this trial."
              />
            } @else {
              <app-data-table [columns]="usageColumns" [data]="filteredUsage()" />
            }
          </div>
        </mat-tab>
        <mat-tab label="Images">
          <div class="tab-content">
            @if (imagesResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (imagesResource.error()) {
              <app-loading-state
                status="error"
                errorMessage="Failed to load images"
                (retry)="imagesResource.reload()"
              />
            } @else if (filteredImages().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="image"
                emptyTitle="No images"
                emptyMessage="No images for this trial."
              />
            } @else {
              <app-data-table [columns]="imageColumns" [data]="filteredImages()" />
            }
          </div>
        </mat-tab>
        <mat-tab label="Cryopreservation">
          <div class="tab-content">
            @if (cryoResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (cryoResource.error()) {
              <app-loading-state
                status="error"
                errorMessage="Failed to load cryopreservations"
                (retry)="cryoResource.reload()"
              />
            } @else if (filteredCryo().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="ac_unit"
                emptyTitle="No cryopreservations"
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
    { label: 'Trials', route: '/trials' },
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
    { key: 'id', label: 'ID' },
    { key: 'implant_location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'size_limit', label: 'Size Limit', type: 'number' },
  ];

  mouseColumns: ColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'strain', label: 'Strain' },
    { key: 'sex', label: 'Sex' },
    { key: 'birth_date', label: 'Birth Date', type: 'date' },
    { key: 'death_date', label: 'Death Date', type: 'date' },
    { key: 'death_cause', label: 'Death Cause' },
  ];

  usageColumns: ColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'usage_type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'record_date', label: 'Date', type: 'date' },
  ];

  imageColumns: ColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'type', label: 'Type' },
    { key: 'image_date', label: 'Date', type: 'date' },
    { key: 'ap_review', label: 'AP Review' },
  ];

  cryoColumns: ColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'location', label: 'Location' },
    { key: 'cryo_date', label: 'Date', type: 'date' },
    { key: 'vial_count', label: 'Vials', type: 'number' },
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
        title: 'Delete Trial',
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
