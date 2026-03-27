import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { httpResource } from '@angular/common/http';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { Passage } from '../../../../generated/models';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { DataTableComponent, ColumnDef } from '../../../../shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-passage-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DataTableComponent, LoadingStateComponent],
  template: `
    <app-page-header i18n-title="@@passagesTitle" title="Passages" i18n-subtitle="@@passagesSubtitle" subtitle="Track biomodel passages, viability, and growth indices" />

    @if (passagesResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (passagesResource.error()) {
      <app-loading-state status="error" i18n-errorMessage="@@failedToLoadPassages" errorMessage="Failed to load passages" (retry)="passagesResource.reload()" />
    } @else if (passagesResource.hasValue() && passagesResource.value()!.length === 0) {
      <app-loading-state status="empty" emptyIcon="swap_horiz" i18n-emptyTitle="@@noPassagesYet" emptyTitle="No passages yet" i18n-emptyMessage="@@createFirstPassage" emptyMessage="Passages are created from biomodel detail pages." />
    } @else if (passagesResource.hasValue()) {
      <app-data-table [columns]="columns" [data]="passagesResource.value()!" (rowClicked)="onPassageClick($event)" />
    }
  `,
})
export class PassageListPage {
  private router = inject(Router);
  private apiUrl = inject(API_URL);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'number', label: $localize`Number`, sortable: true, type: 'number' },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'viability', label: $localize`Viability`, sortable: true, type: 'number' },
    { key: 's_index', label: $localize`S-Index`, sortable: true, type: 'number' },
    { key: 'biomodel_id', label: $localize`Biomodel`, sortable: true },
  ];

  passagesResource = httpResource<Passage[]>(() => `${this.apiUrl}/passages`, { defaultValue: [] });

  onPassageClick(passage: Passage): void {
    this.router.navigate(['/passages', passage.id]);
  }
}
