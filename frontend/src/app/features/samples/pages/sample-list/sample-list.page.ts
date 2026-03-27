import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, EMPTY, filter, switchMap, take, tap } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import { API_URL } from '../../../../core/tokens/api-url.token';
import {
  ColumnDef,
  DataTableComponent,
  TableFilter,
} from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SampleFormComponent } from '../../components/sample-form/sample-form.component';
import { Sample } from '../../models/sample.model';
import { SampleService } from '../../services/sample.service';

@Component({
  selector: 'app-sample-list',
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
      i18n-title="@@samplesTitle"
      title="Samples"
      i18n-subtitle="@@samplesSubtitle"
      subtitle="Serum, buffy coat, and plasma samples from tumors"
    >
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        <ng-container i18n="@@addSample">Add Sample</ng-container>
      </button>
    </app-page-header>

    @if (resource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (resource.error()) {
      <app-loading-state
        status="error"
        errorMessage="Failed to load samples"
        (retry)="resource.reload()"
      />
    } @else if (resource.hasValue() && resource.value()!.length === 0) {
      <app-loading-state
        status="empty"
        emptyIcon="bloodtype"
        emptyTitle="No samples yet"
        emptyMessage="Create your first sample record."
      />
    } @else if (resource.hasValue()) {
      <app-data-table
        [columns]="columns"
        [data]="resource.value()!"
        [filters]="tableFilters()"
        (rowClicked)="onRowClick($event)"
      />
    }
  `,
})
export class SampleListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly service = inject(SampleService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'has_serum', label: $localize`Serum`, type: 'boolean' },
    { key: 'has_buffy', label: $localize`Buffy Coat`, type: 'boolean' },
    { key: 'has_plasma', label: $localize`Plasma`, type: 'boolean' },
    { key: 'obtain_date', label: $localize`Date`, sortable: true, type: 'date' },
    { key: 'tumor_biobank_code', label: $localize`Tumor`, sortable: true },
  ];

  resource = httpResource<Sample[]>(() => `${this.apiUrl}/samples`, { defaultValue: [] });

  tableFilters = computed<TableFilter[]>(() => {
    return [
      {
        key: 'has_serum',
        label: $localize`Serum`,
        options: [
          { label: $localize`Yes`, value: true },
          { label: $localize`No`, value: false },
        ],
      },
      {
        key: 'has_buffy',
        label: $localize`Buffy Coat`,
        options: [
          { label: $localize`Yes`, value: true },
          { label: $localize`No`, value: false },
        ],
      },
      {
        key: 'has_plasma',
        label: $localize`Plasma`,
        options: [
          { label: $localize`Yes`, value: true },
          { label: $localize`No`, value: false },
        ],
      },
    ];
  });

  onRowClick(biopsy: Sample): void {
    this.router.navigate(['/samples', biopsy.id]);
  }

  openCreateDialog(): void {
    this.dialog
      .open(SampleFormComponent, { width: '500px', data: { mode: 'create' } })
      .afterClosed()
      .pipe(
        take(1),
        filter((result): result is Sample => !!result),
        switchMap((result) => this.service.create(result)),
        tap(() => {
          this.notification.success('Sample created');
          this.resource.reload();
        }),
        catchError(() => {
          this.notification.error('Failed to create sample');
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
