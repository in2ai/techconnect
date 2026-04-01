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
import { Biomodel, Passage } from '@generated/models';
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
import { BiomodelFormComponent } from '../../components/biomodel-form/biomodel-form.component';
import { BiomodelService } from '../../services/biomodel.service';

@Component({
  selector: 'app-biomodel-detail',
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
    <app-page-header
      i18n-title="@@biomodelTitle"
      [title]="'Biomodel ' + id()"
      [breadcrumbs]="breadcrumbs()"
    >
      @if (auth.isAdmin()) {
        <button mat-stroked-button (click)="openEditDialog()">
          <mat-icon>edit</mat-icon> <ng-container i18n="@@editBtn">Edit</ng-container>
        </button>
        <button mat-stroked-button color="warn" (click)="confirmDelete()">
          <mat-icon>delete</mat-icon> <ng-container i18n="@@deleteBtn">Delete</ng-container>
        </button>
      }
    </app-page-header>

    @if (biomodelResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (biomodelResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadBiomodel"
        errorMessage="Failed to load biomodel"
        (retry)="biomodelResource.reload()"
      />
    } @else if (biomodelResource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelIdLbl">ID</span
              ><span class="detail-value">{{ biomodelResource.value()!.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelTypeLbl">Type</span
              ><span class="detail-value">{{ biomodelResource.value()!.type }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelStatusLbl">Status</span
              ><span class="detail-value">{{ biomodelResource.value()!.status }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelViabilityLbl">Viability</span
              ><span class="detail-value">{{ biomodelResource.value()!.viability ?? '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelProgressesLbl">Progresses</span
              ><span class="detail-value">
                @if (biomodelResource.value()!.progresses === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (biomodelResource.value()!.progresses === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item full-width">
              <span class="detail-label" i18n="@@biomodelDescriptionLbl">Description</span
              ><span class="detail-value">{{ biomodelResource.value()!.description || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelCreatedLbl">Created</span
              ><span class="detail-value">{{
                biomodelResource.value()!.creation_date || '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@biomodelTumorLbl">Tumor</span
              ><span class="detail-value">{{ biomodelResource.value()!.tumor_biobank_code }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="detail-tabs" animationDuration="200ms">
        <mat-tab i18n-label="@@passagesTabLbl" label="Passages">
          <div class="tab-content">
            @if (passagesResource.isLoading()) {
              <app-loading-state status="loading" />
            } @else if (passagesResource.error()) {
              <app-loading-state
                status="error"
                i18n-errorMessage="@@failedToLoadPassages"
                errorMessage="Failed to load passages"
                (retry)="passagesResource.reload()"
              />
            } @else if (filteredPassages().length === 0) {
              <app-loading-state
                status="empty"
                emptyIcon="swap_horiz"
                i18n-emptyTitle="@@noPassagesEmptyLbl"
                emptyTitle="No passages"
                i18n-emptyMessage="@@noPassagesMsgLbl"
                emptyMessage="No passages linked to this biomodel."
              />
            } @else {
              <app-data-table
                [columns]="passageColumns"
                [data]="filteredPassages()"
                (rowClicked)="onPassageClick($event)"
              />
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [],
})
export class BiomodelDetailPage {
  id = input.required<string>();

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly biomodelService = inject(BiomodelService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Biomodels`, route: '/biomodels' },
    { label: this.id() },
  ]);

  biomodelResource = httpResource<Biomodel>(() => `${this.apiUrl}/biomodels/${this.id()}`);
  passagesResource = httpResource<Passage[]>(() => `${this.apiUrl}/passages`, { defaultValue: [] });

  filteredPassages = computed(
    () => this.passagesResource.value()?.filter((p) => p.biomodel_id === this.id()) ?? [],
  );

  passageColumns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'number', label: $localize`Number`, sortable: true, type: 'number' },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'viability', label: $localize`Viability`, sortable: true, type: 'number' },
    { key: 's_index', label: $localize`S-Index`, sortable: true, type: 'number' },
  ];

  onPassageClick(passage: Passage): void {
    this.router.navigate(['/passages', passage.id]);
  }

  openEditDialog(): void {
    const biomodel = this.biomodelResource.value();
    if (!biomodel) return;
    const dialogRef = this.dialog.open(BiomodelFormComponent, {
      width: '600px',
      data: { mode: 'edit', biomodel },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.biomodelService.update(biomodel.id, result).subscribe({
          next: () => {
            this.notification.success('Biomodel updated');
            this.biomodelResource.reload();
          },
          error: () => {
            this.notification.error('Failed to update biomodel');
          },
        });
      }
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Biomodel`,
        message: 'Delete this biomodel? This cannot be undone.',
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.biomodelService.delete(this.id()).subscribe({
          next: () => {
            this.notification.success('Biomodel deleted');
            this.router.navigate(['/biomodels']);
          },
          error: () => {
            this.notification.error('Failed to delete biomodel');
          },
        });
      }
    });
  }
}
