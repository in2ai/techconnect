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
  Cryopreservation,
  FACS,
  Implant,
  LCTrial,
  Measure,
  Mouse,
  PDOTrial,
  PDXTrial,
  Trial,
  TrialGenomicSequencing,
  TrialImage,
  TrialMolecularData,
  UsageRecord,
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
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';
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
    <app-page-header i18n-title="@@trialTitle" title="Trial" [breadcrumbs]="breadcrumbs()">
      @if (auth.isAdmin()) {
        <button
          mat-stroked-button
          (click)="openEditDialog()"
          [disabled]="!trialResource.hasValue()"
        >
          <mat-icon>edit</mat-icon> <ng-container i18n="@@editBtn">Edit</ng-container>
        </button>
        <button mat-stroked-button color="warn" (click)="confirmDelete()">
          <mat-icon>delete</mat-icon> <ng-container i18n="@@deleteBtn">Delete</ng-container>
        </button>
      }
    </app-page-header>

    @if (trialResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (trialResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadTrial"
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
          <mat-card-header
            ><mat-card-title i18n="@@pdxTrialDetailsTitle"
              >PDX Trial Details</mat-card-title
            ></mat-card-header
          >
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
          <mat-card-header
            ><mat-card-title i18n="@@pdoTrialDetailsTitle"
              >PDO Trial Details</mat-card-title
            ></mat-card-header
          >
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
          <mat-card-header
            ><mat-card-title i18n="@@lcTrialDetailsTitle"
              >LC Trial Details</mat-card-title
            ></mat-card-header
          >
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
        @if (currentPdxTrial()) {
          <mat-tab i18n-label="@@inVivoDataTabLbl" label="In Vivo Data">
            <div class="tab-content in-vivo-content">
              <div class="section-container">
                <div class="section-header">
                  <h3 i18n="@@mouseSectionTitle">Mouse Details</h3>
                  @if (auth.isAdmin()) {
                    <button mat-flat-button color="primary" (click)="openMouseForm()">
                      <mat-icon>add</mat-icon> <ng-container i18n="@@addMouseBtn">Add</ng-container>
                    </button>
                  }
                </div>
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
                  <app-data-table
                    [columns]="mouseColumns"
                    [data]="filteredMice()"
                    (rowClicked)="openMouseForm($event)"
                  />
                }
              </div>

              <div class="section-container">
                <div class="section-header">
                  <h3 i18n="@@implantsSectionTitle">Implants</h3>
                  @if (auth.isAdmin()) {
                    <button mat-flat-button color="primary" (click)="openImplantForm()">
                      <mat-icon>add</mat-icon>
                      <ng-container i18n="@@addImplantBtn">Add</ng-container>
                    </button>
                  }
                </div>
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
                  <app-data-table
                    [columns]="implantColumns"
                    [data]="filteredImplants()"
                    (rowClicked)="openImplantForm($event)"
                  />
                }
              </div>

              <div class="section-container">
                <div class="section-header">
                  <h3 i18n="@@measuresSectionTitle">Measures</h3>
                  @if (auth.isAdmin()) {
                    <button mat-flat-button color="primary" (click)="openMeasureForm()">
                      <mat-icon>add</mat-icon>
                      <ng-container i18n="@@addMeasureBtn">Add</ng-container>
                    </button>
                  }
                </div>
                @if (measuresResource.isLoading()) {
                  <app-loading-state status="loading" />
                } @else if (measuresResource.error()) {
                  <app-loading-state
                    status="error"
                    errorMessage="Failed to load measures"
                    (retry)="measuresResource.reload()"
                  />
                } @else if (filteredMeasures().length === 0) {
                  <app-loading-state
                    status="empty"
                    emptyIcon="straighten"
                    emptyTitle="No measures"
                    emptyMessage="No measures linked to this trial's implants."
                  />
                } @else {
                  <app-data-table
                    [columns]="measureColumns"
                    [data]="filteredMeasures()"
                    (rowClicked)="openMeasureForm($event)"
                  />
                }
              </div>
            </div>
          </mat-tab>
        }

        @if (currentLcTrial()) {
          <mat-tab i18n-label="@@facsTabLbl" label="FACS">
            <div class="tab-content in-vivo-content">
              <div class="section-container">
                <div class="section-header">
                  <h3 i18n="@@facsSectionTitle">FACS Data</h3>
                  @if (auth.isAdmin()) {
                    <button mat-flat-button color="primary" (click)="openFacsForm()">
                      <mat-icon>add</mat-icon> <ng-container i18n="@@addFacsBtn">Add</ng-container>
                    </button>
                  }
                </div>
                @if (facsResource.isLoading()) {
                  <app-loading-state status="loading" />
                } @else if (facsResource.error()) {
                  <app-loading-state
                    status="error"
                    errorMessage="Failed to load FACS"
                    (retry)="facsResource.reload()"
                  />
                } @else if (filteredFACS().length === 0) {
                  <app-loading-state
                    status="empty"
                    emptyIcon="biotech"
                    emptyTitle="No FACS data"
                    emptyMessage="No FACS data linked to this trial."
                  />
                } @else {
                  <app-data-table
                    [columns]="facsColumns"
                    [data]="filteredFACS()"
                    (rowClicked)="openFacsForm($event)"
                  />
                }
              </div>
            </div>
          </mat-tab>
        }

        <mat-tab i18n-label="@@usageRecordsTabLbl" label="Usage Records">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@usageRecordsTitle">Usage Records</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openUsageForm()">
                    <mat-icon>add</mat-icon> <ng-container i18n="@@addUsageBtn">Add</ng-container>
                  </button>
                }
              </div>
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
                <app-data-table
                  [columns]="usageColumns"
                  [data]="filteredUsage()"
                  (rowClicked)="openUsageForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@imagesTabLbl" label="Images">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@imagesTitle">Images</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openImageForm()">
                    <mat-icon>add</mat-icon> <ng-container i18n="@@addImageBtn">Add</ng-container>
                  </button>
                }
              </div>
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
                <app-data-table
                  [columns]="imageColumns"
                  [data]="filteredImages()"
                  (rowClicked)="openImageForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@cryoTabLbl" label="Cryopreservation">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@cryoTitle">Cryopreservation</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openCryoForm()">
                    <mat-icon>add</mat-icon> <ng-container i18n="@@addCryoBtn">Add</ng-container>
                  </button>
                }
              </div>
              @if (cryoResource.isLoading()) {
                <app-loading-state status="loading" />
              } @else if (cryoResource.error()) {
                <app-loading-state
                  status="error"
                  i18n-errorMessage="@@failedToLoadCryo"
                  errorMessage="Failed to load cryo"
                  (retry)="cryoResource.reload()"
                />
              } @else if (filteredCryo().length === 0) {
                <app-loading-state
                  status="empty"
                  emptyIcon="ac_unit"
                  i18n-emptyTitle="@@noCryoTitle"
                  emptyTitle="No cryopreservations"
                  i18n-emptyMessage="@@noCryoMsg"
                  emptyMessage="No cryo records for this trial."
                />
              } @else {
                <app-data-table
                  [columns]="cryoColumns"
                  [data]="filteredCryo()"
                  (rowClicked)="openCryoForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@biomodelsTabLbl" label="Biomodels">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@biomodelsTitle">Biomodels</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openBiomodelForm()">
                    <mat-icon>add</mat-icon>
                    <ng-container i18n="@@addBiomodelBtn">Add</ng-container>
                  </button>
                }
              </div>
              @if (biomodelsResource.isLoading()) {
                <app-loading-state status="loading" />
              } @else if (biomodelsResource.error()) {
                <app-loading-state
                  status="error"
                  errorMessage="Failed to load biomodels"
                  (retry)="biomodelsResource.reload()"
                />
              } @else if (filteredBiomodels().length === 0) {
                <app-loading-state
                  status="empty"
                  emptyIcon="science"
                  emptyTitle="No biomodels"
                  emptyMessage="No biomodels generated by this trial."
                />
              } @else {
                <app-data-table
                  [columns]="biomodelColumns"
                  [data]="filteredBiomodels()"
                  (rowClicked)="openBiomodelForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@genomicTabLbl" label="Genomic Sequencing">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@genomicsTitle">Genomic Sequencing</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openGenomicForm()">
                    <mat-icon>add</mat-icon>
                    <ng-container i18n="@@addGenomicsBtn">Add</ng-container>
                  </button>
                }
              </div>
              @if (genomicResource.isLoading()) {
                <app-loading-state status="loading" />
              } @else if (genomicResource.error()) {
                <app-loading-state
                  status="error"
                  errorMessage="Failed to load genomic data"
                  (retry)="genomicResource.reload()"
                />
              } @else if (filteredGenomic().length === 0) {
                <app-loading-state
                  status="empty"
                  emptyIcon="science"
                  emptyTitle="No genomic data"
                  emptyMessage="No genomic sequencing data for this trial."
                />
              } @else {
                <app-data-table
                  [columns]="genomicColumns"
                  [data]="filteredGenomic()"
                  (rowClicked)="openGenomicForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@molecularTabLbl" label="Molecular Data">
          <div class="tab-content in-vivo-content">
            <div class="section-container">
              <div class="section-header">
                <h3 i18n="@@molecularTitle">Molecular Data</h3>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" (click)="openMolecularForm()">
                    <mat-icon>add</mat-icon>
                    <ng-container i18n="@@addMolecularBtn">Add</ng-container>
                  </button>
                }
              </div>
              @if (molecularResource.isLoading()) {
                <app-loading-state status="loading" />
              } @else if (molecularResource.error()) {
                <app-loading-state
                  status="error"
                  errorMessage="Failed to load molecular data"
                  (retry)="molecularResource.reload()"
                />
              } @else if (filteredMolecular().length === 0) {
                <app-loading-state
                  status="empty"
                  emptyIcon="biotech"
                  emptyTitle="No molecular data"
                  emptyMessage="No molecular data for this trial."
                />
              } @else {
                <app-data-table
                  [columns]="molecularColumns"
                  [data]="filteredMolecular()"
                  (rowClicked)="openMolecularForm($event)"
                />
              }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [
    `
      .in-vivo-content {
        display: flex;
        flex-direction: column;
        gap: 32px;
        padding-top: 16px;
      }
      .section-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .section-header h3 {
        margin: 0;
      }
    `,
  ],
})
export class TrialDetailPage {
  id = input.required<string>();

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly trialService = inject(TrialService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

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
  measuresResource = httpResource<Measure[]>(() => `${this.apiUrl}/measures`, { defaultValue: [] });
  facsResource = httpResource<FACS[]>(() => `${this.apiUrl}/facs`, { defaultValue: [] });
  genomicResource = httpResource<TrialGenomicSequencing[]>(
    () => `${this.apiUrl}/trial-genomic-sequencings`,
    {
      defaultValue: [],
    },
  );
  molecularResource = httpResource<TrialMolecularData[]>(
    () => `${this.apiUrl}/trial-molecular-data`,
    {
      defaultValue: [],
    },
  );
  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, {
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
  filteredMeasures = computed(() => {
    const implantIds = new Set(this.filteredImplants().map((i) => i.id));
    return this.measuresResource.value()?.filter((m) => implantIds.has(m.implant_id)) ?? [];
  });
  filteredFACS = computed(
    () => this.facsResource.value()?.filter((f) => f.lc_trial_id === this.id()) ?? [],
  );
  filteredGenomic = computed(
    () => this.genomicResource.value()?.filter((g) => g.trial_id === this.id()) ?? [],
  );
  filteredMolecular = computed(
    () => this.molecularResource.value()?.filter((m) => m.trial_id === this.id()) ?? [],
  );
  filteredBiomodels = computed(
    () => this.biomodelsResource.value()?.filter((b) => b.parent_trial_id === this.id()) ?? [],
  );
  implantColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'mouse_id', label: $localize`Mouse ID` },
    { key: 'implant_location', label: $localize`Location` },
    { key: 'type', label: $localize`Type` },
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

  measureColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'implant_id', label: $localize`Implant ID` },
    { key: 'measure_date', label: $localize`Date`, type: 'date' },
    { key: 'measure_value', label: $localize`Value`, type: 'number' },
  ];

  facsColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'measure', label: $localize`Measure` },
    { key: 'measure_value', label: $localize`Value`, type: 'number' },
  ];

  genomicColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'annotations', label: $localize`Annotations` },
  ];

  molecularColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'annotations', label: $localize`Annotations` },
  ];

  biomodelColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'type', label: $localize`Type` },
    { key: 'status', label: $localize`Status` },
    { key: 'viability', label: $localize`Viability`, type: 'number' },
    { key: 'creation_date', label: $localize`Created`, type: 'date' },
  ];

  openEntityForm(
    title: string,
    endpoint: string,
    fields: EntityField[],
    resource: any,
    entity: any = null,
    defaultValues: any = {},
  ) {
    const dialogRef = this.dialog.open(GenericEntityFormComponent, {
      width: '500px',
      data: { title, endpoint, fields, entity, defaultValues } as GenericEntityDialogData,
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) resource.reload();
    });
  }

  openMouseForm(entity: Mouse | null = null) {
    this.openEntityForm(
      'Mouse',
      '/mice',
      [
        { name: 'strain', label: 'Strain', type: 'text' },
        { name: 'sex', label: 'Sex', type: 'text' },
        { name: 'birth_date', label: 'Birth Date', type: 'date' },
        { name: 'death_date', label: 'Death Date', type: 'date' },
        { name: 'death_cause', label: 'Death Cause', type: 'text' },
        { name: 'animal_facility', label: 'Animal Facility', type: 'text' },
        { name: 'proex', label: 'Proex', type: 'text' },
      ],
      this.mouseResource,
      entity,
      { pdx_trial_id: this.id() },
    );
  }

  openImplantForm(entity: Implant | null = null) {
    const miceOpts = this.filteredMice().map((m) => ({ value: m.id, label: m.id }));
    this.openEntityForm(
      'Implant',
      '/implants',
      [
        { name: 'mouse_id', label: 'Mouse ID', type: 'select', options: miceOpts, required: true },
        { name: 'implant_location', label: 'Location', type: 'text' },
        { name: 'type', label: 'Type', type: 'text' },
      ],
      this.implantsResource,
      entity,
      {},
    );
  }

  openMeasureForm(entity: Measure | null = null) {
    const implantOpts = this.filteredImplants().map((i) => ({ value: i.id, label: i.id }));
    this.openEntityForm(
      'Measure',
      '/measures',
      [
        {
          name: 'implant_id',
          label: 'Implant ID',
          type: 'select',
          options: implantOpts,
          required: true,
        },
        { name: 'measure_date', label: 'Date', type: 'date' },
        { name: 'measure_value', label: 'Value', type: 'number' },
      ],
      this.measuresResource,
      entity,
      {},
    );
  }

  openFacsForm(entity: FACS | null = null) {
    this.openEntityForm(
      'FACS',
      '/facs',
      [
        { name: 'measure', label: 'Measure', type: 'text' },
        { name: 'measure_value', label: 'Value', type: 'number' },
      ],
      this.facsResource,
      entity,
      { lc_trial_id: this.id() },
    );
  }

  openUsageForm(entity: UsageRecord | null = null) {
    this.openEntityForm(
      'Usage Record',
      '/usage-records',
      [
        { name: 'record_type', label: 'Record Type', type: 'text' },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'record_date', label: 'Date', type: 'date' },
      ],
      this.usageResource,
      entity,
      { trial_id: this.id() },
    );
  }

  openImageForm(entity: TrialImage | null = null) {
    this.openEntityForm(
      'Image',
      '/images',
      [
        { name: 'image_date', label: 'Date', type: 'date' },
        { name: 'scanner_magnification', label: 'Magnification', type: 'number' },
        { name: 'type', label: 'Type', type: 'text' },
        { name: 'ap_review', label: 'AP Review', type: 'boolean' },
      ],
      this.imagesResource,
      entity,
      { trial_id: this.id() },
    );
  }

  openCryoForm(entity: Cryopreservation | null = null) {
    this.openEntityForm(
      'Cryopreservation',
      '/cryopreservations',
      [
        { name: 'location', label: 'Location', type: 'text' },
        { name: 'cryo_date', label: 'Date', type: 'date' },
        { name: 'vial_count', label: 'Vial Count', type: 'number' },
      ],
      this.cryoResource,
      entity,
      { trial_id: this.id() },
    );
  }

  openGenomicForm(entity: TrialGenomicSequencing | null = null) {
    this.openEntityForm(
      'Genomic Sequence',
      '/trial-genomic-sequencings',
      [{ name: 'annotations', label: 'Annotations', type: 'text' }],
      this.genomicResource,
      entity,
      { trial_id: this.id() },
    );
  }

  openMolecularForm(entity: TrialMolecularData | null = null) {
    this.openEntityForm(
      'Molecular Data',
      '/trial-molecular-data',
      [{ name: 'annotations', label: 'Annotations', type: 'text' }],
      this.molecularResource,
      entity,
      { trial_id: this.id() },
    );
  }

  openBiomodelForm(entity: Biomodel | null = null) {
    this.openEntityForm(
      'Biomodel',
      '/biomodels',
      [
        { name: 'type', label: 'Type', type: 'text' },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'status', label: 'Status', type: 'text' },
        { name: 'progresses', label: 'Progresses', type: 'boolean' },
        { name: 'viability', label: 'Viability', type: 'number' },
      ],
      this.biomodelsResource,
      entity,
      { parent_trial_id: this.id() },
    );
  }

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
