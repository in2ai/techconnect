import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { Passage } from '@generated/models';
import { DataTableComponent, ColumnDef } from '@shared/components/data-table/data-table.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PassageFormComponent } from '../../components/passage-form/passage-form.component';
import { PassageService } from '../../services/passage.service';

@Component({
  selector: 'app-passage-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DataTableComponent, LoadingStateComponent],
  template: `
    <app-page-header
      i18n-title="@@passagesTitle"
      title="Passages"
      i18n-subtitle="@@passagesSubtitle"
      subtitle="Track biomodel passages, viability, and growth indices"
    >
      @if (auth.isAdmin()) {
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <ng-container i18n="@@addPassageBtn">Add Passage</ng-container>
        </button>
      }
    </app-page-header>

    @if (passagesResource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (passagesResource.error()) {
      <app-loading-state status="error" i18n-errorMessage="@@failedToLoadPassages" errorMessage="Failed to load passages" (retry)="passagesResource.reload()" />
    } @else if (passagesResource.hasValue() && passagesResource.value()!.length === 0) {
      <app-loading-state
        status="empty"
        emptyIcon="swap_horiz"
        i18n-emptyTitle="@@noPassagesYet"
        emptyTitle="No passages yet"
        i18n-emptyMessage="@@createFirstPassage"
        emptyMessage="Use Add Passage above or create one from a biomodel detail page."
      />
    } @else if (passagesResource.hasValue()) {
      <app-data-table [columns]="columns" [data]="passagesResource.value()!" (rowClicked)="onPassageClick($event)" />
    }
  `,
})
export class PassageListPage {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly passageService = inject(PassageService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);
  protected readonly auth = inject(AuthService);

  columns: ColumnDef[] = [
    { key: 'id', label: $localize`ID`, sortable: true },
    { key: 'number', label: $localize`Number`, sortable: true, type: 'number' },
    { key: 'status', label: $localize`Status`, sortable: true },
    { key: 'viability', label: $localize`Viability`, sortable: true, type: 'number' },
    { key: 's_index', label: $localize`S-Index`, sortable: true, type: 'number' },
    { key: 'biomodel_id', label: $localize`:@@passageBiomodelLbl:Biomodel`, sortable: true },
  ];

  passagesResource = httpResource<Passage[]>(() => `${this.apiUrl}/passages`, { defaultValue: [] });

  onPassageClick(passage: Passage): void {
    this.router.navigate(['/passages', passage.id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PassageFormComponent, {
      width: '500px',
      data: { mode: 'create' },
    });
    dialogRef.afterClosed().subscribe((result: Partial<Passage> | undefined) => {
      if (!result) return;
      this.passageService.create(result).subscribe({
        next: () => {
          this.notification.success($localize`:@@passageCreatedToast:Passage created`);
          this.passagesResource.reload();
        },
        error: () =>
          this.notification.error($localize`:@@passageCreateFailedToast:Failed to create passage`),
      });
    });
  }
}
