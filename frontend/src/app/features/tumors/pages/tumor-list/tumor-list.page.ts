import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Tumor } from '@generated/models';
import {
  ColumnDef,
  DataTableComponent,
  TableFilter,
} from '@shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { catchError, EMPTY, filter, switchMap, tap } from 'rxjs';
import { TumorFormComponent } from '../../components/tumor-form/tumor-form.component';
import { TumorService } from '../../services/tumor.service';

@Component({
  selector: 'app-tumor-list',
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
      i18n-title="@@tumorsTitle"
      title="Tumors"
      i18n-subtitle="@@tumorsSubtitle"
      subtitle="Track tumor samples, classifications, and biobank codes"
    >
      @if (auth.isAdmin()) {
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <ng-container i18n="@@addTumor">Add Tumor</ng-container>
        </button>
      }
    </app-page-header>

    @if (tumorsResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (tumorsResource.error()) {
      <app-loading-state
        status="error"
        errorMessage="Failed to load tumors"
        (retry)="tumorsResource.reload()"
      />
    } @else if (tumorsResource.hasValue() && tumorsResource.value()!.length === 0) {
      <app-loading-state
        status="empty"
        emptyIcon="coronavirus"
        emptyTitle="No tumors yet"
        emptyMessage="Add your first tumor sample."
      />
    } @else if (tumorsResource.hasValue()) {
      <app-data-table
        [columns]="columns"
        [data]="tumorsResource.value()!"
        [filters]="tableFilters()"
        (rowClicked)="onTumorClick($event)"
      />
    }
  `,
})
export class TumorListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly tumorService = inject(TumorService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

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

  tableFilters = computed<TableFilter[]>(() => {
    const data = this.tumorsResource.value() || [];
    const organs = Array.from(
      new Set(data.map((t) => t.organ).filter((o): o is string => !!o)),
    ).sort((a, b) => a.localeCompare(b));
    const classifications = Array.from(
      new Set(data.map((t) => t.classification).filter((c): c is string => !!c)),
    ).sort((a, b) => a.localeCompare(b));

    return [
      {
        key: 'organ',
        label: $localize`Organ`,
        options: organs.map((o) => ({ label: o, value: o })),
      },
      {
        key: 'classification',
        label: $localize`Classification`,
        options: classifications.map((c) => ({ label: c, value: c })),
      },
    ];
  });

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
