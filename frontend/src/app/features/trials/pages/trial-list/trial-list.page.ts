import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { httpResource } from '@angular/common/http';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { NotificationService } from '../../../../core/services/notification.service';
import { TrialService } from '../../services/trial.service';
import { Trial } from '../../models/trial.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';

@Component({
  selector: 'app-trial-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DataTableComponent, LoadingStateComponent],
  template: `
    <app-page-header i18n-title="@@trialsTitle" title="Trials" i18n-subtitle="@@trialsSubtitle" subtitle="PDX, PDO, and LC trial data with detailed outcomes">
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addTrialBtn">Add Trial</ng-container>
      </button>
    </app-page-header>

    @if (trialsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (trialsResource.error()) {
      <app-loading-state status="error" i18n-errorMessage="@@failedToLoadTrials" errorMessage="Failed to load trials" (retry)="trialsResource.reload()" />
    } @else if (trialsResource.hasValue() && trialsResource.value()!.length === 0) {
      <app-loading-state status="empty" emptyIcon="assignment" i18n-emptyTitle="@@noTrialsYet" emptyTitle="No trials yet" i18n-emptyMessage="@@createFirstTrial" emptyMessage="Create your first trial." />
    } @else if (trialsResource.hasValue()) {
      <app-data-table [columns]="columns" [data]="trialsResource.value()!" (rowClicked)="onTrialClick($event)" />
    }
  `,
})
export class TrialListPage {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private trialService = inject(TrialService);
  private notification = inject(NotificationService);
  private apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'success', label: $localize`Success`, type: 'boolean' },
    { key: 'creation_date', label: $localize`Created`, sortable: true, type: 'date' },
    { key: 'biobank_shipment', label: $localize`Shipment`, type: 'boolean' },
    { key: 'passage_id', label: $localize`Passage`, sortable: true },
  ];

  trialsResource = httpResource<Trial[]>(() => `${this.apiUrl}/trials`, { defaultValue: [] });

  onTrialClick(trial: Trial): void {
    this.router.navigate(['/trials', trial.id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TrialFormComponent, { width: '600px', data: { mode: 'create' } });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.trialService.create(result).subscribe({
          next: () => { this.notification.success('Trial created'); this.trialsResource.reload(); },
          error: () => { this.notification.error('Failed to create trial'); },
        });
      }
    });
  }
}
