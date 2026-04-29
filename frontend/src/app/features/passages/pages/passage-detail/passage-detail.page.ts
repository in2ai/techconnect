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
  Passage,
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
import { PassageFormComponent } from '../../components/passage-form/passage-form.component';
import { PassageService } from '../../services/passage.service';

@Component({
  selector: 'app-passage-detail',
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
    <app-page-header i18n-title="@@passageTitleLbl" title="Passage" [breadcrumbs]="breadcrumbs()">
      @if (auth.isAdmin()) {
        <button
          mat-stroked-button
          (click)="openEditDialog()"
          [disabled]="!passageResource.hasValue()"
        >
          <mat-icon>edit</mat-icon> <ng-container i18n="@@editBtn">Edit</ng-container>
        </button>
        <button mat-stroked-button color="warn" (click)="confirmDelete()">
          <mat-icon>delete</mat-icon> <ng-container i18n="@@deleteBtn">Delete</ng-container>
        </button>
      }
    </app-page-header>

    @if (passageResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (passageResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadPassage"
        errorMessage="Failed to load passage"
        (retry)="passageResource.reload()"
      />
    } @else if (passageResource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@passageIdLbl">ID</span
              ><span class="detail-value">{{ passageResource.value()!.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@passageBiomodelLbl">Biomodel</span
              ><span class="detail-value">{{ passageResource.value()!.biomodel_id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@typeLbl">Type</span
              ><span class="detail-value">{{ currentBiomodel()?.type || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialSuccessLbl">Success</span
              ><span class="detail-value">
                @if (passageResource.value()!.success === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (passageResource.value()!.success === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialCreatedLbl">Created</span
              ><span class="detail-value">{{ passageResource.value()!.creation_date || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialBiobankShipmentLbl">Biobank Shipment</span
              ><span class="detail-value">
                @if (passageResource.value()!.biobank_shipment === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (passageResource.value()!.biobank_shipment === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@trialArrivalDateLbl">Arrival Date</span
              ><span class="detail-value">{{
                passageResource.value()!.biobank_arrival_date || '—'
              }}</span>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label" i18n="@@passageDescLbl">Description</span
              ><span class="detail-value">{{ passageResource.value()!.description || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

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
                ><span class="detail-value">{{ yesNo(currentPdxTrial()!.ffpe) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label" i18n="@@pdxHeSlideLbl">HE Slide</span
                ><span class="detail-value">{{ yesNo(currentPdxTrial()!.he_slide) }}</span>
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
                ><span class="detail-value">{{ yesNo(currentLcTrial()!.spheroids) }}</span>
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
                <app-data-table
                  [columns]="mouseColumns"
                  [data]="filteredMice()"
                  (rowClicked)="openMouseForm($event)"
                />
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
                <app-data-table
                  [columns]="implantColumns"
                  [data]="filteredImplants()"
                  (rowClicked)="openImplantForm($event)"
                />
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
                <app-data-table
                  [columns]="measureColumns"
                  [data]="filteredMeasures()"
                  (rowClicked)="openMeasureForm($event)"
                />
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
                <app-data-table
                  [columns]="facsColumns"
                  [data]="filteredFACS()"
                  (rowClicked)="openFacsForm($event)"
                />
              </div>
            </div>
          </mat-tab>
        }

        <mat-tab i18n-label="@@usageRecordsTabLbl" label="Usage Records">
          <div class="tab-content">
            <div class="section-header">
              <h3 i18n="@@usageRecordsTitle">Usage Records</h3>
              @if (auth.isAdmin()) {
                <button mat-flat-button color="primary" (click)="openUsageForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addUsageBtn">Add</ng-container>
                </button>
              }
            </div>
            <app-data-table
              [columns]="usageColumns"
              [data]="filteredUsage()"
              (rowClicked)="openUsageForm($event)"
            />
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@imagesTabLbl" label="Images">
          <div class="tab-content">
            <div class="section-header">
              <h3 i18n="@@imagesTitle">Images</h3>
              @if (auth.isAdmin()) {
                <button mat-flat-button color="primary" (click)="openImageForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addImageBtn">Add</ng-container>
                </button>
              }
            </div>
            <app-data-table
              [columns]="imageColumns"
              [data]="filteredImages()"
              (rowClicked)="openImageForm($event)"
            />
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@cryoTabLbl" label="Cryopreservation">
          <div class="tab-content">
            <div class="section-header">
              <h3 i18n="@@cryoTitle">Cryopreservation</h3>
              @if (auth.isAdmin()) {
                <button mat-flat-button color="primary" (click)="openCryoForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addCryoBtn">Add</ng-container>
                </button>
              }
            </div>
            <app-data-table
              [columns]="cryoColumns"
              [data]="filteredCryo()"
              (rowClicked)="openCryoForm($event)"
            />
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@biomodelsTabLbl" label="Biomodels">
          <div class="tab-content">
            <div class="section-header">
              <h3 i18n="@@biomodelsTitle">Biomodels</h3>
              @if (auth.isAdmin()) {
                <button mat-flat-button color="primary" (click)="openBiomodelForm()">
                  <mat-icon>add</mat-icon>
                  <ng-container i18n="@@addBiomodelBtn">Add</ng-container>
                </button>
              }
            </div>
            <app-data-table
              [columns]="biomodelColumns"
              [data]="filteredBiomodels()"
              (rowClicked)="openBiomodelForm($event)"
            />
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@genomicTabLbl" label="Genomic Sequencing">
          <div class="tab-content">
            <h3 i18n="@@genomicsTitle">Genomic Sequencing</h3>
            <app-data-table
              [columns]="genomicColumns"
              [data]="filteredGenomic()"
              (rowClicked)="openGenomicForm($event)"
            />
          </div>
        </mat-tab>
        <mat-tab i18n-label="@@molecularTabLbl" label="Molecular Data">
          <div class="tab-content">
            <h3 i18n="@@molecularTitle">Molecular Data</h3>
            <app-data-table
              [columns]="molecularColumns"
              [data]="filteredMolecular()"
              (rowClicked)="openMolecularForm($event)"
            />
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [
    `
      .in-vivo-content,
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
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
        gap: 16px;
      }
      .section-header h3,
      .tab-content h3 {
        margin: 0;
      }
    `,
  ],
})
export class PassageDetailPage {
  id = input.required<string>();

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly passageService = inject(PassageService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Passages`, route: '/passages' },
    { label: this.id() },
  ]);

  passageResource = httpResource<Passage>(() => `${this.apiUrl}/passages/${this.id()}`);
  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, {
    defaultValue: [],
  });
  pdxTrialsResource = httpResource<PDXTrial[]>(() => `${this.apiUrl}/pdx-trials`, {
    defaultValue: [],
  });
  pdoTrialsResource = httpResource<PDOTrial[]>(() => `${this.apiUrl}/pdo-trials`, {
    defaultValue: [],
  });
  lcTrialsResource = httpResource<LCTrial[]>(() => `${this.apiUrl}/lc-trials`, {
    defaultValue: [],
  });
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
    { defaultValue: [] },
  );
  molecularResource = httpResource<TrialMolecularData[]>(
    () => `${this.apiUrl}/trial-molecular-data`,
    { defaultValue: [] },
  );

  currentBiomodel = computed(
    () =>
      this.biomodelsResource
        .value()
        ?.find((biomodel) => biomodel.id === this.passageResource.value()?.biomodel_id) ??
      undefined,
  );
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
    return (
      this.implantsResource
        .value()
        ?.filter((i) => miceIds.has(i.mouse_id))
        .map((i) => ({
          ...i,
          pdx_trial_id: this.id(),
        })) ?? []
    );
  });
  filteredUsage = computed(
    () => this.usageResource.value()?.filter((u) => u.passage_id === this.id()) ?? [],
  );
  filteredImages = computed(
    () => this.imagesResource.value()?.filter((img) => img.passage_id === this.id()) ?? [],
  );
  filteredCryo = computed(
    () => this.cryoResource.value()?.filter((c) => c.passage_id === this.id()) ?? [],
  );
  filteredMeasures = computed(() => {
    const implantIds = new Set(this.filteredImplants().map((i) => i.id));
    return this.measuresResource.value()?.filter((m) => implantIds.has(m.implant_id)) ?? [];
  });
  filteredFACS = computed(
    () => this.facsResource.value()?.filter((f) => f.lc_trial_id === this.id()) ?? [],
  );
  filteredGenomic = computed(
    () => this.genomicResource.value()?.filter((g) => g.passage_id === this.id()) ?? [],
  );
  filteredMolecular = computed(
    () => this.molecularResource.value()?.filter((m) => m.passage_id === this.id()) ?? [],
  );
  filteredBiomodels = computed(
    () => this.biomodelsResource.value()?.filter((b) => b.parent_passage_id === this.id()) ?? [],
  );

  implantColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'pdx_trial_id', label: $localize`Passage ID` },
    { key: 'mouse_id', label: $localize`Mouse ID` },
    { key: 'implant_location', label: $localize`Location` },
    { key: 'type', label: $localize`Type` },
  ];
  mouseColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'pdx_trial_id', label: $localize`Passage ID` },
    { key: 'strain', label: $localize`Strain` },
    { key: 'sex', label: $localize`:@@sexLbl:Sex` },
    { key: 'birth_date', label: $localize`:@@birthDateLbl:Birth Date`, type: 'date' },
    { key: 'death_date', label: $localize`Death Date`, type: 'date' },
    { key: 'death_cause', label: $localize`Death Cause` },
  ];
  usageColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'record_type', label: $localize`Type` },
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
    { key: 'success', label: $localize`:@@biomodelSuccessLbl:Success`, type: 'boolean' },
    { key: 'creation_date', label: $localize`Created`, type: 'date' },
  ];

  yesNo(value: boolean | null): string {
    if (value === true) return $localize`:@@yesOpt:Yes`;
    if (value === false) return $localize`:@@noOpt:No`;
    return '—';
  }

  openEntityForm(
    title: string,
    endpoint: string,
    fields: EntityField[],
    resource: { reload: () => void },
    entity: unknown = null,
    defaultValues: Record<string, unknown> = {},
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
      $localize`:@@mouseFormDialogTitle:Mouse`,
      '/mice',
      [
        { name: 'strain', label: $localize`Strain`, type: 'text' },
        { name: 'sex', label: $localize`:@@sexLbl:Sex`, type: 'text' },
        { name: 'birth_date', label: $localize`:@@birthDateLbl:Birth Date`, type: 'date' },
        { name: 'death_date', label: $localize`Death Date`, type: 'date' },
        { name: 'death_cause', label: $localize`Death Cause`, type: 'text' },
        {
          name: 'animal_facility',
          label: $localize`:@@mouseFieldAnimalFacility:Animal Facility`,
          type: 'text',
        },
        { name: 'proex', label: $localize`:@@mouseFieldProex:Proex`, type: 'text' },
      ],
      this.mouseResource,
      entity,
      { pdx_trial_id: this.id() },
    );
  }

  openImplantForm(entity: Implant | null = null) {
    const miceOpts = this.filteredMice().map((m) => ({ value: m.id, label: m.id }));
    this.openEntityForm(
      $localize`:@@implantFormDialogTitle:Implant`,
      '/implants',
      [
        {
          name: 'mouse_id',
          label: $localize`Mouse ID`,
          type: 'select',
          options: miceOpts,
          required: true,
        },
        { name: 'implant_location', label: $localize`Location`, type: 'text' },
        { name: 'type', label: $localize`Type`, type: 'text' },
      ],
      this.implantsResource,
      entity,
    );
  }

  openMeasureForm(entity: Measure | null = null) {
    const implantOpts = this.filteredImplants().map((i) => ({ value: i.id, label: i.id }));
    this.openEntityForm(
      $localize`:@@measureFormDialogTitle:Measure`,
      '/measures',
      [
        {
          name: 'implant_id',
          label: $localize`Implant ID`,
          type: 'select',
          options: implantOpts,
          required: true,
        },
        { name: 'measure_date', label: $localize`Date`, type: 'date' },
        { name: 'measure_value', label: $localize`Value`, type: 'number' },
      ],
      this.measuresResource,
      entity,
    );
  }

  openFacsForm(entity: FACS | null = null) {
    this.openEntityForm(
      $localize`:@@facsTabLbl:FACS`,
      '/facs',
      [
        { name: 'measure', label: $localize`Measure`, type: 'text' },
        { name: 'measure_value', label: $localize`Value`, type: 'number' },
      ],
      this.facsResource,
      entity,
      { lc_trial_id: this.id() },
    );
  }

  openUsageForm(entity: UsageRecord | null = null) {
    this.openEntityForm(
      $localize`:@@usageRecordFormDialogTitle:Usage Record`,
      '/usage-records',
      [
        {
          name: 'record_type',
          label: $localize`:@@usageRecordTypeField:Record Type`,
          type: 'text',
        },
        { name: 'description', label: $localize`Description`, type: 'text' },
        { name: 'record_date', label: $localize`Date`, type: 'date' },
      ],
      this.usageResource,
      entity,
      { passage_id: this.id() },
    );
  }

  openImageForm(entity: TrialImage | null = null) {
    this.openEntityForm(
      $localize`:@@imageFormDialogTitle:Image`,
      '/images',
      [
        { name: 'image_date', label: $localize`Date`, type: 'date' },
        {
          name: 'scanner_magnification',
          label: $localize`:@@trialImageMagnification:Magnification`,
          type: 'number',
          integerOnly: true,
        },
        { name: 'type', label: $localize`Type`, type: 'text' },
        { name: 'ap_review', label: $localize`AP Review`, type: 'boolean' },
      ],
      this.imagesResource,
      entity,
      { passage_id: this.id() },
    );
  }

  openCryoForm(entity: Cryopreservation | null = null) {
    this.openEntityForm(
      $localize`:@@cryoTitle:Cryopreservation`,
      '/cryopreservations',
      [
        { name: 'location', label: $localize`Location`, type: 'text' },
        { name: 'cryo_date', label: $localize`Date`, type: 'date' },
        {
          name: 'vial_count',
          label: $localize`:@@cryoVialCountField:Vial Count`,
          type: 'number',
          integerOnly: true,
        },
      ],
      this.cryoResource,
      entity,
      { passage_id: this.id() },
    );
  }

  openGenomicForm(entity: TrialGenomicSequencing | null = null) {
    this.openEntityForm(
      $localize`:@@genomicSequenceFormTitle:Genomic Sequence`,
      '/trial-genomic-sequencings',
      [{ name: 'annotations', label: $localize`Annotations`, type: 'text' }],
      this.genomicResource,
      entity,
      { passage_id: this.id() },
    );
  }

  openMolecularForm(entity: TrialMolecularData | null = null) {
    this.openEntityForm(
      $localize`:@@molecularTitle:Molecular Data`,
      '/trial-molecular-data',
      [{ name: 'annotations', label: $localize`Annotations`, type: 'text' }],
      this.molecularResource,
      entity,
      { passage_id: this.id() },
    );
  }

  openBiomodelForm(entity: Biomodel | null = null) {
    this.openEntityForm(
      $localize`:@@biomodelFormDialogTitle:Biomodel`,
      '/biomodels',
      [
        { name: 'id', label: $localize`ID`, type: 'text', required: true },
        {
          name: 'type',
          label: $localize`Type`,
          type: 'select',
          options: [
            { value: 'PDX', label: 'PDX' },
            { value: 'PDO', label: 'PDO' },
            { value: 'LC', label: 'LC' },
          ],
        },
        { name: 'description', label: $localize`Description`, type: 'text' },
        {
          name: 'status',
          label: $localize`Status`,
          type: 'select',
          options: [
            { value: 'active', label: $localize`:@@activeStatusOpt:Active` },
            { value: 'inactive', label: $localize`:@@inactiveStatusOpt:Inactive` },
          ],
        },
        { name: 'success', label: $localize`:@@biomodelSuccessLbl:Success`, type: 'boolean' },
      ],
      this.biomodelsResource,
      entity,
      { parent_passage_id: this.id() },
    );
  }

  openEditDialog(): void {
    const passage = this.passageResource.value();
    if (!passage) return;

    const dialogRef = this.dialog.open(PassageFormComponent, {
      width: '600px',
      data: { mode: 'edit', passage },
    });

    dialogRef.afterClosed().subscribe((result: Partial<Passage> | undefined) => {
      if (!result) return;
      this.passageService.update(passage.id, result).subscribe({
        next: () => {
          this.notification.success($localize`:@@passageUpdatedToast:Passage updated`);
          this.passageResource.reload();
        },
        error: () => {
          this.notification.error($localize`:@@passageUpdateFailedToast:Failed to update passage`);
        },
      });
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Passage`,
        message: 'Delete this passage and all related data? This cannot be undone.',
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.passageService.delete(this.id()).subscribe({
          next: () => {
            this.notification.success($localize`:@@passageDeletedToast:Passage deleted`);
            this.router.navigate(['/passages']);
          },
          error: () => {
            this.notification.error(
              $localize`:@@passageDeleteFailedToast:Failed to delete passage`,
            );
          },
        });
      }
    });
  }
}
