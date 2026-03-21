import { Component, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { httpResource } from '@angular/common/http';
import { filter, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { NotificationService } from '../../../../core/services/notification.service';
import { TumorService } from '../../services/tumor.service';
import { Tumor } from '../../models/tumor.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { TumorFormComponent } from '../../components/tumor-form/tumor-form.component';

@Component({
  selector: 'app-tumor-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DataTableComponent, LoadingStateComponent],
  template: `
    <app-page-header i18n-title="@@tumorsTitle" title="Tumors" i18n-subtitle="@@tumorsSubtitle" subtitle="Track tumor samples, classifications, and biobank codes">
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addTumor">Add Tumor</ng-container>
      </button>
    </app-page-header>

    @if (tumorsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (tumorsResource.error()) {
      <app-loading-state status="error" errorMessage="Failed to load tumors" (retry)="tumorsResource.reload()" />
    } @else if (tumorsResource.hasValue() && tumorsResource.value()!.length === 0) {
      <app-loading-state status="empty" emptyIcon="coronavirus" emptyTitle="No tumors yet" emptyMessage="Add your first tumor sample." />
    } @else if (tumorsResource.hasValue()) {
      <app-data-table [columns]="columns" [data]="tumorsResource.value()!" (rowClicked)="onTumorClick($event)" />
    }
  `,
})
export class TumorListPage {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private tumorService = inject(TumorService);
  private notification = inject(NotificationService);
  private apiUrl = inject(API_URL);
  private destroyRef = inject(DestroyRef);

  columns: ColumnDef[] = [
    { key: 'biobank_code', label: $localize`Biobank Code`, sortable: true },
    { key: 'lab_code', label: $localize`Lab Code`, sortable: true },
    { key: 'classification', label: $localize`Classification`, sortable: true },
    { key: 'organ', label: $localize`Organ`, sortable: true },
    { key: 'grade', label: $localize`Grade`, sortable: true },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'patient_nhc', label: $localize`Patient NHC`, sortable: true },
  ];

  tumorsResource = httpResource<Tumor[]>(() => `${this.apiUrl}/tumors`, { defaultValue: [] });

  onTumorClick(tumor: Tumor): void {
    this.router.navigate(['/tumors', tumor.biobank_code]);
  }

  openCreateDialog(): void {
    this.dialog
      .open(TumorFormComponent, { width: '600px', data: { mode: 'create' } })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((result): result is Tumor => !!result),
        switchMap((result) => this.tumorService.create(result)),
        tap(() => {
          this.notification.success('Tumor created successfully');
          this.tumorsResource.reload();
        }),
        catchError(() => {
          this.notification.error('Failed to create tumor');
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
