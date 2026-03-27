import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { httpResource } from '@angular/common/http';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { NotificationService } from '../../../../core/services/notification.service';
import { BiomodelService } from '../../services/biomodel.service';
import { Biomodel } from '../../models/biomodel.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { BiomodelFormComponent } from '../../components/biomodel-form/biomodel-form.component';

@Component({
  selector: 'app-biomodel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DataTableComponent, LoadingStateComponent],
  template: `
    <app-page-header i18n-title="@@biomodelsTitle" title="Biomodels" i18n-subtitle="@@biomodelsSubtitle" subtitle="Preclinical biomodels derived from tumor samples">
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addBiomodel">Add Biomodel</ng-container>
      </button>
    </app-page-header>

    @if (biomodelsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (biomodelsResource.error()) {
      <app-loading-state status="error" i18n-errorMessage="@@failedToLoadBiomodels" errorMessage="Failed to load biomodels" (retry)="biomodelsResource.reload()" />
    } @else if (biomodelsResource.hasValue() && biomodelsResource.value()!.length === 0) {
      <app-loading-state status="empty" emptyIcon="science" i18n-emptyTitle="@@noBiomodelsYet" emptyTitle="No biomodels yet" i18n-emptyMessage="@@createFirstBiomodel" emptyMessage="Create your first biomodel." />
    } @else if (biomodelsResource.hasValue()) {
      <app-data-table [columns]="columns" [data]="biomodelsResource.value()!" (rowClicked)="onBiomodelClick($event)" />
    }
  `,
})
export class BiomodelListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly biomodelService = inject(BiomodelService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'type', label: $localize`Type`, sortable: true },
    { key: 'tumor_organ', label: $localize`Organ`, sortable: true },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'viability', label: $localize`Viability`, sortable: true, type: 'number' },
    { key: 'progresses', label: $localize`Progresses`, type: 'boolean' },
    { key: 'creation_date', label: $localize`Created`, sortable: true, type: 'date' },
    { key: 'tumor_biobank_code', label: $localize`Tumor`, sortable: true },
  ];

  biomodelsResource = httpResource<Biomodel[]>(() => `${this.apiUrl}/biomodels`, { defaultValue: [] });

  onBiomodelClick(biomodel: Biomodel): void {
    this.router.navigate(['/biomodels', biomodel.id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(BiomodelFormComponent, { width: '600px', data: { mode: 'create' } });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.biomodelService.create(result).subscribe({
          next: () => { this.notification.success('Biomodel created'); this.biomodelsResource.reload(); },
          error: () => { this.notification.error('Failed to create biomodel'); },
        });
      }
    });
  }
}
