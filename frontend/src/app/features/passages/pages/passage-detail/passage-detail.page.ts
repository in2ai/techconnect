import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
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

interface ImplantWithMeasures {
  implant: Implant;
  measures: Measure[];
}

interface MouseInVivoNode {
  mouse: Mouse;
  implants: ImplantWithMeasures[];
}

@Component({
  selector: 'app-passage-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
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

      @if (currentPdxTrial() || currentBiomodel()?.type === 'PDX') {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header class="section-header">
            <mat-card-title i18n="@@pdxTrialDetailsTitle">PDX Trial Details</mat-card-title>
            @if (auth.isAdmin()) {
              @if (currentPdxTrial()) {
                <button mat-icon-button (click)="openPdxTrialForm(currentPdxTrial()!)">
                  <mat-icon>edit</mat-icon>
                </button>
              } @else {
                <button mat-flat-button color="primary" (click)="openPdxTrialForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addPdxTrialBtn">Add</ng-container>
                </button>
              }
            }
          </mat-card-header>
          <mat-card-content>
            @if (currentPdxTrial()) {
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
            } @else {
              <div i18n="@@noDataMsg">No data</div>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (currentPdoTrial() || currentBiomodel()?.type === 'PDO') {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header class="section-header">
            <mat-card-title i18n="@@pdoTrialDetailsTitle">PDO Trial Details</mat-card-title>
            @if (auth.isAdmin()) {
              @if (currentPdoTrial()) {
                <button mat-icon-button (click)="openPdoTrialForm(currentPdoTrial()!)">
                  <mat-icon>edit</mat-icon>
                </button>
              } @else {
                <button mat-flat-button color="primary" (click)="openPdoTrialForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addPdoTrialBtn">Add</ng-container>
                </button>
              }
            }
          </mat-card-header>
          <mat-card-content>
            @if (currentPdoTrial()) {
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
            } @else {
              <div i18n="@@noDataMsg">No data</div>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (currentLcTrial() || currentBiomodel()?.type === 'LC') {
        <mat-card appearance="outlined" class="section-card">
          <mat-card-header class="section-header">
            <mat-card-title i18n="@@lcTrialDetailsTitle">LC Trial Details</mat-card-title>
            @if (auth.isAdmin()) {
              @if (currentLcTrial()) {
                <button mat-icon-button (click)="openLcTrialForm(currentLcTrial()!)">
                  <mat-icon>edit</mat-icon>
                </button>
              } @else {
                <button mat-flat-button color="primary" (click)="openLcTrialForm()">
                  <mat-icon>add</mat-icon> <ng-container i18n="@@addLcTrialBtn">Add</ng-container>
                </button>
              }
            }
          </mat-card-header>
          <mat-card-content>
            @if (currentLcTrial()) {
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
            } @else {
              <div i18n="@@noDataMsg">No data</div>
            }
          </mat-card-content>
        </mat-card>
      }

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        @if (currentPdxTrial()) {
          <mat-tab i18n-label="@@inVivoDataTabLbl" label="In Vivo Data">
            <div class="tab-content in-vivo-content">
              <div class="in-vivo-intro">
                <mat-icon class="in-vivo-intro-icon" aria-hidden="true">account_tree</mat-icon>
                <p class="in-vivo-intro-text" i18n="@@inVivoHierarchyHint">
                  Each passage links mice to implants and tumor measurements. Expand a mouse to see
                  its implants; measures are listed under the implant they belong to.
                </p>
              </div>

              <div class="in-vivo-toolbar">
                <mat-form-field
                  appearance="outline"
                  class="in-vivo-search"
                  subscriptSizing="dynamic"
                >
                  <mat-icon matPrefix aria-hidden="true">search</mat-icon>
                  <input
                    id="in-vivo-filter"
                    matInput
                    type="search"
                    i18n-placeholder="@@inVivoFilterPlaceholder"
                    i18n-aria-label="@@inVivoFilterLabel"
                    placeholder="Filter mice, implants, or measures…"
                    [value]="inVivoFilterQuery()"
                    (input)="inVivoFilterQuery.set($any($event.target).value)"
                  />
                  @if (inVivoFilterQuery()) {
                    <button
                      matSuffix
                      mat-icon-button
                      type="button"
                      (click)="inVivoFilterQuery.set('')"
                      i18n-aria-label="@@clearFilterAria"
                    >
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </mat-form-field>
                @if (auth.isAdmin()) {
                  <button mat-flat-button color="primary" type="button" (click)="openMouseForm()">
                    <mat-icon>add</mat-icon>
                    <ng-container i18n="@@addMouseBtn">Add Mouse</ng-container>
                  </button>
                }
              </div>

              @if (inVivoHierarchy().length === 0) {
                <div class="in-vivo-empty" role="status">
                  <mat-icon aria-hidden="true">pets</mat-icon>
                  <p i18n="@@inVivoNoMice">No mice recorded for this passage yet.</p>
                  @if (auth.isAdmin()) {
                    <button
                      mat-stroked-button
                      color="primary"
                      type="button"
                      (click)="openMouseForm()"
                    >
                      <mat-icon>add</mat-icon>
                      <ng-container i18n="@@addFirstMouseBtn">Add the first mouse</ng-container>
                    </button>
                  }
                </div>
              } @else if (inVivoHierarchyFiltered().length === 0) {
                <div class="in-vivo-empty" role="status">
                  <mat-icon aria-hidden="true">search_off</mat-icon>
                  <p i18n="@@inVivoNoMatches">No mice or related records match your filter.</p>
                  <button mat-stroked-button type="button" (click)="inVivoFilterQuery.set('')">
                    <ng-container i18n="@@clearFilterBtn">Clear filter</ng-container>
                  </button>
                </div>
              } @else {
                <mat-accordion class="in-vivo-accordion" multi displayMode="flat">
                  @for (node of inVivoHierarchyFiltered(); track node.mouse.id; let mi = $index) {
                    <mat-expansion-panel class="mouse-panel" [expanded]="true">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <span class="mouse-panel-title">
                            <span i18n="@@mouseOrdinalPrefix">Mouse</span>
                            {{ mi + 1 }}
                            @if (node.mouse.strain || node.mouse.sex) {
                              <span class="mouse-panel-subtitle">
                                @if (node.mouse.strain) {
                                  <span>{{ node.mouse.strain }}</span>
                                }
                                @if (node.mouse.strain && node.mouse.sex) {
                                  <span aria-hidden="true"> · </span>
                                }
                                @if (node.mouse.sex) {
                                  <span>{{ node.mouse.sex }}</span>
                                }
                              </span>
                            }
                          </span>
                        </mat-panel-title>
                        <mat-panel-description class="mouse-panel-desc">
                          {{ node.implants.length }}
                          @if (node.implants.length === 1) {
                            <ng-container i18n="@@implantCountSingular">implant</ng-container>
                          } @else {
                            <ng-container i18n="@@implantCountPlural">implants</ng-container>
                          }
                          @if (node.mouse.birth_date) {
                            <span class="mouse-birth">
                              ·
                              <ng-container i18n="@@birthShortLbl">b.</ng-container>
                              {{ node.mouse.birth_date }}
                            </span>
                          }
                        </mat-panel-description>
                      </mat-expansion-panel-header>

                      <div class="mouse-detail-grid">
                        <div class="mouse-detail-item">
                          <span class="detail-label" i18n="@@mouseShortIdLbl">Reference</span>
                          <code
                            class="id-chip"
                            [matTooltip]="node.mouse.id"
                            matTooltipShowDelay="200"
                            >{{ formatShortId(node.mouse.id) }}</code
                          >
                        </div>
                        <div class="mouse-detail-item">
                          <span class="detail-label" i18n="@@deathDateLbl">Death Date</span>
                          <span>{{ node.mouse.death_date || '—' }}</span>
                        </div>
                        <div class="mouse-detail-item">
                          <span class="detail-label" i18n="@@deathCauseLbl">Death Cause</span>
                          <span>{{ node.mouse.death_cause || '—' }}</span>
                        </div>
                        <div class="mouse-detail-item">
                          <span class="detail-label" i18n="@@mouseFieldAnimalFacility"
                            >Animal Facility</span
                          >
                          <span>{{ node.mouse.animal_facility || '—' }}</span>
                        </div>
                      </div>

                      <div class="mouse-actions">
                        <button mat-button type="button" (click)="openMouseForm(node.mouse)">
                          <mat-icon>edit</mat-icon>
                          <ng-container i18n="@@editMouseBtn">Edit mouse</ng-container>
                        </button>
                        @if (auth.isAdmin()) {
                          <button
                            mat-flat-button
                            color="primary"
                            type="button"
                            (click)="openImplantForm(null, { mouse_id: node.mouse.id })"
                          >
                            <mat-icon>add</mat-icon>
                            <ng-container i18n="@@addImplantForMouseBtn">Add implant</ng-container>
                          </button>
                        }
                      </div>

                      @if (node.implants.length === 0) {
                        <p class="implant-empty" i18n="@@noImplantsForMouse">
                          No implants for this mouse yet.
                        </p>
                      } @else {
                        @for (
                          iw of node.implants;
                          track iw.implant.id;
                          let ii = $index;
                          let lastImplant = $last
                        ) {
                          <div class="implant-card">
                            <div class="implant-card-header">
                              <div class="implant-card-title-block">
                                <h4 class="implant-heading">
                                  <span i18n="@@implantOrdinalPrefix">Implant</span>
                                  {{ ii + 1 }}
                                  <code
                                    class="id-chip"
                                    [matTooltip]="iw.implant.id"
                                    matTooltipShowDelay="200"
                                    >{{ formatShortId(iw.implant.id) }}</code
                                  >
                                </h4>
                                <p class="implant-meta">
                                  @if (iw.implant.implant_location) {
                                    <span>{{ iw.implant.implant_location }}</span>
                                  }
                                  @if (iw.implant.implant_location && iw.implant.type) {
                                    <span aria-hidden="true"> · </span>
                                  }
                                  @if (iw.implant.type) {
                                    <span>{{ iw.implant.type }}</span>
                                  }
                                  @if (!iw.implant.implant_location && !iw.implant.type) {
                                    <span class="muted" i18n="@@implantNoLocationType"
                                      >No location or type</span
                                    >
                                  }
                                </p>
                              </div>
                              <div class="implant-card-actions">
                                <button
                                  mat-button
                                  type="button"
                                  (click)="openImplantForm(iw.implant)"
                                >
                                  <mat-icon>edit</mat-icon>
                                  <ng-container i18n="@@editImplantBtn">Edit</ng-container>
                                </button>
                                @if (auth.isAdmin()) {
                                  <button
                                    mat-stroked-button
                                    color="primary"
                                    type="button"
                                    (click)="openMeasureForm(null, { implant_id: iw.implant.id })"
                                  >
                                    <mat-icon>add</mat-icon>
                                    <ng-container i18n="@@addMeasureForImplantBtn"
                                      >Measure</ng-container
                                    >
                                  </button>
                                }
                              </div>
                            </div>

                            @if (iw.measures.length === 0) {
                              <p class="measures-empty" i18n="@@noMeasuresForImplant">
                                No measures for this implant yet.
                              </p>
                            } @else {
                              <div
                                class="measures-table-wrap"
                                role="region"
                                [attr.aria-label]="measuresRegionLabel(mi + 1, ii + 1)"
                              >
                                <table class="measures-table">
                                  <thead>
                                    <tr>
                                      <th scope="col" i18n="@@measureDateCol">Date</th>
                                      <th scope="col" i18n="@@measureValueCol">Value</th>
                                      <th
                                        scope="col"
                                        class="measures-col-ref"
                                        i18n="@@measureRefCol"
                                      >
                                        Reference
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    @for (mv of iw.measures; track mv.id) {
                                      <tr
                                        class="measure-row"
                                        tabindex="0"
                                        role="button"
                                        (click)="openMeasureForm(mv)"
                                        (keydown.enter)="openMeasureForm(mv)"
                                        (keydown.space)="
                                          openMeasureForm(mv); $event.preventDefault()
                                        "
                                      >
                                        <td>{{ mv.measure_date || '—' }}</td>
                                        <td>
                                          {{
                                            mv.measure_value !== null &&
                                            mv.measure_value !== undefined
                                              ? mv.measure_value
                                              : '—'
                                          }}
                                        </td>
                                        <td class="measures-col-ref">
                                          <code
                                            class="id-chip id-chip-sm"
                                            [matTooltip]="mv.id"
                                            matTooltipShowDelay="200"
                                            >{{ formatShortId(mv.id) }}</code
                                          >
                                        </td>
                                      </tr>
                                    }
                                  </tbody>
                                </table>
                              </div>
                            }
                            @if (!lastImplant) {
                              <mat-divider />
                            }
                          </div>
                        }
                      }
                    </mat-expansion-panel>
                  }
                </mat-accordion>
              }
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

      .in-vivo-intro {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 12px 14px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
        border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
      }

      .in-vivo-intro-icon {
        flex-shrink: 0;
        margin-top: 2px;
        color: var(--mat-sys-primary);
      }

      .in-vivo-intro-text {
        margin: 0;
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-on-surface-variant);
      }

      .in-vivo-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }

      .in-vivo-search {
        flex: 1 1 280px;
        min-width: 220px;
      }

      .in-vivo-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 32px 16px;
        text-align: center;
        color: var(--mat-sys-on-surface-variant);
      }

      .in-vivo-empty mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        opacity: 0.55;
      }

      .in-vivo-accordion {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .mouse-panel {
        border-radius: 12px !important;
        border: 1px solid var(--mat-sys-outline-variant);
      }

      .mouse-panel-title {
        font: var(--mat-sys-title-medium);
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 6px;
      }

      .mouse-panel-subtitle {
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-on-surface-variant);
        font-weight: 400;
      }

      .mouse-panel-desc {
        justify-content: flex-end;
        color: var(--mat-sys-on-surface-variant);
      }

      .mouse-birth {
        white-space: nowrap;
      }

      .mouse-detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px 20px;
        margin-bottom: 8px;
      }

      .mouse-detail-item .detail-label {
        display: block;
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 4px;
      }

      .mouse-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }

      .id-chip {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 6px;
        background: var(--mat-sys-surface-container-high);
        border: 1px solid var(--mat-sys-outline-variant);
        cursor: help;
      }

      .id-chip-sm {
        font-size: 11px;
      }

      .implant-card {
        margin-left: 8px;
        padding-left: 16px;
        border-left: 3px solid var(--mat-sys-primary);
      }

      .implant-card-header {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: space-between;
        align-items: flex-start;
      }

      .implant-heading {
        margin: 0 0 4px;
        font: var(--mat-sys-title-small);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .implant-meta {
        margin: 0;
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-on-surface-variant);
      }

      .implant-meta .muted {
        font-style: italic;
      }

      .implant-card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: flex-end;
      }

      .implant-empty,
      .measures-empty {
        margin: 8px 0 12px 8px;
        padding-left: 16px;
        border-left: 3px solid var(--mat-sys-outline-variant);
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-outline);
      }

      .measures-table-wrap {
        overflow-x: auto;
        margin: 8px 0 12px;
        border-radius: 8px;
        border: 1px solid var(--mat-sys-outline-variant);
      }

      .measures-table {
        width: 100%;
        border-collapse: collapse;
        font: var(--mat-sys-body-medium);
      }

      .measures-table th {
        text-align: left;
        padding: 10px 12px;
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
        background: var(--mat-sys-surface-container-low);
      }

      .measures-table td {
        padding: 10px 12px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }

      .measures-col-ref {
        width: 1%;
        white-space: nowrap;
      }

      .measure-row {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }

      .measure-row:hover {
        background-color: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
      }

      .measure-row:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -2px;
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
    return this.implantsResource.value()?.filter((i) => miceIds.has(i.mouse_id)) ?? [];
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

  /** Single filter box for the nested In Vivo view (persists while on this tab). */
  inVivoFilterQuery = signal('');

  inVivoHierarchy = computed<MouseInVivoNode[]>(() => {
    const mice = [...this.filteredMice()].sort((a, b) => {
      const da = a.birth_date ?? '';
      const db = b.birth_date ?? '';
      if (da !== db) return da.localeCompare(db);
      return a.id.localeCompare(b.id);
    });
    const implantsByMouse = new Map<string, Implant[]>();
    for (const imp of this.filteredImplants()) {
      const list = implantsByMouse.get(imp.mouse_id) ?? [];
      list.push(imp);
      implantsByMouse.set(imp.mouse_id, list);
    }
    for (const list of implantsByMouse.values()) {
      list.sort((a, b) => a.id.localeCompare(b.id));
    }
    const measuresByImplant = new Map<string, Measure[]>();
    for (const m of this.filteredMeasures()) {
      const list = measuresByImplant.get(m.implant_id) ?? [];
      list.push(m);
      measuresByImplant.set(m.implant_id, list);
    }
    for (const list of measuresByImplant.values()) {
      list.sort((a, b) => {
        const da = a.measure_date ?? '';
        const db = b.measure_date ?? '';
        if (da !== db) return da.localeCompare(db);
        return a.id.localeCompare(b.id);
      });
    }

    return mice.map((mouse) => ({
      mouse,
      implants: (implantsByMouse.get(mouse.id) ?? []).map((implant) => ({
        implant,
        measures: [...(measuresByImplant.get(implant.id) ?? [])],
      })),
    }));
  });

  inVivoHierarchyFiltered = computed(() => {
    const q = this.inVivoFilterQuery().trim().toLowerCase();
    const tree = this.inVivoHierarchy();
    if (!q) return tree;

    const matches = (obj: object) =>
      Object.values(obj).some((v) => v != null && String(v).toLowerCase().includes(q));

    return tree.filter((node) => {
      if (matches(node.mouse)) return true;
      return node.implants.some((iw) => {
        if (matches(iw.implant)) return true;
        return iw.measures.some((m) => matches(m));
      });
    });
  });

  usageColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID` },
    { key: 'record_type', label: $localize`Type` },
    {
      key: 'description',
      label: $localize`:@@usageRecordDescriptionField:Preclinical project/trial title`,
    },
    { key: 'record_date', label: $localize`Date`, type: 'date' },
  ];
  imageColumns: ColumnDef[] = [
    {
      key: 'scanner_magnification',
      label: $localize`:@@trialImageEnlargement:Enlargement`,
      suffix: 'x',
    },
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

  yesNo(value: boolean | null): string {
    if (value === true) return $localize`:@@yesOpt:Yes`;
    if (value === false) return $localize`:@@noOpt:No`;
    return '—';
  }

  /** Short suffix of a UUID for scanning; full value available via tooltip. */
  formatShortId(id: string): string {
    if (!id) return '—';
    return id.length <= 10 ? id : `\u2026${id.slice(-8)}`;
  }

  measuresRegionLabel(mouseOrdinal: number, implantOrdinal: number): string {
    return $localize`:@@measuresAriaLabel:Measures for mouse ${mouseOrdinal}:mouseOrd: and implant ${implantOrdinal}:implOrd:`;
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

  openPdxTrialForm(entity: PDXTrial | null = null) {
    this.openEntityForm(
      $localize`:@@pdxTrialDetailsTitle:PDX Trial Details`,
      '/pdx-trials',
      [
        { name: 'ffpe', label: $localize`:@@pdxFfpeLbl:FFPE`, type: 'boolean' },
        { name: 'he_slide', label: $localize`:@@pdxHeSlideLbl:HE Slide`, type: 'boolean' },
        { name: 'ihq_data', label: $localize`:@@pdxIhqDataLbl:IHQ Data`, type: 'text' },
        {
          name: 'latency_weeks',
          label: $localize`:@@pdxLatencyLbl:Latency (weeks)`,
          type: 'number',
        },
      ],
      this.pdxTrialsResource,
      entity,
      { id: this.id() },
    );
  }

  openPdoTrialForm(entity: PDOTrial | null = null) {
    this.openEntityForm(
      $localize`:@@pdoTrialDetailsTitle:PDO Trial Details`,
      '/pdo-trials',
      [
        {
          name: 'drop_count',
          label: $localize`:@@pdoDropCountLbl:Drop Count`,
          type: 'number',
          integerOnly: true,
        },
        {
          name: 'organoid_count',
          label: $localize`:@@pdoOrganoidCountLbl:Organoid Count`,
          type: 'number',
          integerOnly: true,
        },
        {
          name: 'frozen_organoid_count',
          label: $localize`:@@pdoFrozenOrganoidsLbl:Frozen Organoids`,
          type: 'number',
          integerOnly: true,
        },
        { name: 'plate_type', label: $localize`:@@pdoPlateTypeLbl:Plate Type`, type: 'text' },
        { name: 'assessment', label: $localize`:@@pdoAssessmentLbl:Assessment`, type: 'text' },
      ],
      this.pdoTrialsResource,
      entity,
      { id: this.id() },
    );
  }

  openLcTrialForm(entity: LCTrial | null = null) {
    this.openEntityForm(
      $localize`:@@lcTrialDetailsTitle:LC Trial Details`,
      '/lc-trials',
      [
        { name: 'confluence', label: $localize`:@@lcConfluenceLbl:Confluence`, type: 'number' },
        { name: 'spheroids', label: $localize`:@@lcSpheroidsLbl:Spheroids`, type: 'boolean' },
        {
          name: 'digestion_date',
          label: $localize`:@@lcDigestionDateLbl:Digestion Date`,
          type: 'date',
        },
        { name: 'plate_type', label: $localize`:@@lcPlateTypeLbl:Plate Type`, type: 'text' },
      ],
      this.lcTrialsResource,
      entity,
      { id: this.id() },
    );
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

  openImplantForm(entity: Implant | null = null, presetDefaults: Record<string, unknown> = {}) {
    const miceOpts = this.filteredMice().map((m) => ({
      value: m.id,
      label: `${this.formatShortId(m.id)} · ${m.strain ?? '—'} · ${m.sex ?? '—'}`,
    }));
    const lockMouse = !entity && presetDefaults['mouse_id'] != null;
    this.openEntityForm(
      $localize`:@@implantFormDialogTitle:Implant`,
      '/implants',
      [
        {
          name: 'mouse_id',
          label: $localize`:@@mouseOrdinalPrefix:Mouse`,
          type: 'select',
          options: miceOpts,
          required: true,
          disabled: lockMouse,
        },
        { name: 'implant_location', label: $localize`Location`, type: 'text' },
        { name: 'type', label: $localize`Type`, type: 'text' },
      ],
      this.implantsResource,
      entity,
      entity ? {} : presetDefaults,
    );
  }

  openMeasureForm(entity: Measure | null = null, presetDefaults: Record<string, unknown> = {}) {
    const implantOpts = this.filteredImplants().map((i) => {
      const mouse = this.filteredMice().find((m) => m.id === i.mouse_id);
      const mouseBit = mouse
        ? `${mouse.strain ?? '—'} · ${mouse.sex ?? '—'}`
        : this.formatShortId(i.mouse_id);
      return {
        value: i.id,
        label: `${this.formatShortId(i.id)} · ${i.implant_location ?? '—'} · ${i.type ?? '—'} (${mouseBit})`,
      };
    });
    const lockImplant = !entity && presetDefaults['implant_id'] != null;
    this.openEntityForm(
      $localize`:@@measureFormDialogTitle:Measure`,
      '/measures',
      [
        {
          name: 'implant_id',
          label: $localize`:@@implantOrdinalPrefix:Implant`,
          type: 'select',
          options: implantOpts,
          required: true,
          disabled: lockImplant,
        },
        { name: 'measure_date', label: $localize`:@@measureDateCol:Date`, type: 'date' },
        { name: 'measure_value', label: $localize`:@@measureValueCol:Value`, type: 'number' },
      ],
      this.measuresResource,
      entity,
      entity ? {} : presetDefaults,
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
          label: $localize`:@@usageRecordTypeField:Type`,
          type: 'text',
        },
        {
          name: 'description',
          label: $localize`:@@usageRecordDescriptionField:Preclinical project/trial title`,
          type: 'text',
        },
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
          label: $localize`:@@trialImageEnlargement:Enlargement`,
          type: 'number',
          integerOnly: true,
          min: 2,
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
