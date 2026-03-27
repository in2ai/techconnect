import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import {
  ColumnDef,
  DataTableComponent,
  TableFilter,
} from '@shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';
import { LCTrial, PDOTrial, PDXTrial, Trial } from '@generated/models';
import { TrialService } from '../../services/trial.service';

@Component({
  selector: 'app-trial-list',
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
      i18n-title="@@trialsTitle"
      title="Trials"
      i18n-subtitle="@@trialsSubtitle"
      subtitle="PDX, PDO, and LC trial data with detailed outcomes"
    >
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addTrialBtn">Add Trial</ng-container>
      </button>
    </app-page-header>

    @if (
      trialsResource.isLoading() ||
      pdxTrialsResource.isLoading() ||
      pdoTrialsResource.isLoading() ||
      lcTrialsResource.isLoading()
    ) {
      <app-loading-state status="loading" />
    } @else if (trialsResource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadTrials"
        errorMessage="Failed to load trials"
        (retry)="trialsResource.reload()"
      />
    } @else if (trialsResource.hasValue() && trialsResource.value()!.length === 0) {
      <app-loading-state
        status="empty"
        emptyIcon="assignment"
        i18n-emptyTitle="@@noTrialsYet"
        emptyTitle="No trials yet"
        i18n-emptyMessage="@@createFirstTrial"
        emptyMessage="Create your first trial."
      />
    } @else if (trialsResource.hasValue()) {
      <app-data-table
        [columns]="columns"
        [data]="trialsWithType()"
        [filters]="tableFilters()"
        (rowClicked)="onTrialClick($event)"
      />
    }
  `,
})
export class TrialListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly trialService = inject(TrialService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'type', label: $localize`Type`, sortable: true },
    { key: 'success', label: $localize`Success`, type: 'boolean' },
    { key: 'creation_date', label: $localize`Created`, sortable: true, type: 'date' },
    { key: 'biobank_shipment', label: $localize`Shipment`, type: 'boolean' },
    { key: 'passage_id', label: $localize`Passage`, sortable: true },
  ];

  trialsResource = httpResource<Trial[]>(() => `${this.apiUrl}/trials`, { defaultValue: [] });
  pdxTrialsResource = httpResource<PDXTrial[]>(() => `${this.apiUrl}/pdx-trials`, {
    defaultValue: [],
  });
  pdoTrialsResource = httpResource<PDOTrial[]>(() => `${this.apiUrl}/pdo-trials`, {
    defaultValue: [],
  });
  lcTrialsResource = httpResource<LCTrial[]>(() => `${this.apiUrl}/lc-trials`, {
    defaultValue: [],
  });

  trialsWithType = computed(() => {
    const trials = this.trialsResource.value() ?? [];
    const pdx = new Set(this.pdxTrialsResource.value()?.map((t) => t.id) ?? []);
    const pdo = new Set(this.pdoTrialsResource.value()?.map((t) => t.id) ?? []);
    const lc = new Set(this.lcTrialsResource.value()?.map((t) => t.id) ?? []);

    return trials.map((t) => ({
      ...t,
      type: pdx.has(t.id) ? 'PDX' : pdo.has(t.id) ? 'PDO' : lc.has(t.id) ? 'LC' : 'Unknown',
    }));
  });

  tableFilters = computed<TableFilter[]>(() => {
    return [
      {
        key: 'type',
        label: $localize`Trial Type`,
        options: [
          { label: 'PDX', value: 'PDX' },
          { label: 'PDO', value: 'PDO' },
          { label: 'LC', value: 'LC' },
        ],
      },
      {
        key: 'success',
        label: $localize`Success`,
        options: [
          { label: $localize`Yes`, value: true },
          { label: $localize`No`, value: false },
        ],
      },
    ];
  });
  onTrialClick(trial: Trial): void {
    this.router.navigate(['/trials', trial.id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TrialFormComponent, {
      width: '600px',
      data: { mode: 'create' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.trialService.create(result).subscribe({
          next: () => {
            this.notification.success('Trial created');
            this.trialsResource.reload();
          },
          error: () => {
            this.notification.error('Failed to create trial');
          },
        });
      }
    });
  }
}
