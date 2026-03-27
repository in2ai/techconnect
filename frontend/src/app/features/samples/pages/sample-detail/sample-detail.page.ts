import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { API_URL } from '../../../../core/tokens/api-url.token';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import {
  Breadcrumb,
  PageHeaderComponent,
} from '../../../../shared/components/page-header/page-header.component';
import { SampleFormComponent } from '../../components/sample-form/sample-form.component';
import { Sample } from '../../../../generated/models';
import { SampleService } from '../../services/sample.service';

@Component({
  selector: 'app-sample-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    LoadingStateComponent,
  ],
  template: `
    <app-page-header i18n-title="@@sampleTitle" title="Sample" [breadcrumbs]="breadcrumbs()">
      <button mat-stroked-button (click)="openEditDialog()" [disabled]="!resource.hasValue()">
        <mat-icon>edit</mat-icon> <ng-container i18n="@@editBtn">Edit</ng-container>
      </button>
      <button
        mat-stroked-button
        color="warn"
        (click)="confirmDelete()"
        [disabled]="!resource.hasValue()"
      >
        <mat-icon>delete</mat-icon> <ng-container i18n="@@deleteBtn">Delete</ng-container>
      </button>
    </app-page-header>

    @if (resource.isLoading()) {
      <app-loading-state status="loading" />
    } @else if (resource.error()) {
      <app-loading-state
        status="error"
        i18n-errorMessage="@@failedToLoadSample"
        errorMessage="Failed to load sample"
        (retry)="resource.reload()"
      />
    } @else if (resource.hasValue()) {
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleIdLbl">ID</span
              ><span class="detail-value">{{ resource.value()!.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleObtainDateLbl">Obtain Date</span
              ><span class="detail-value">{{ resource.value()!.obtain_date || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleOrganLbl">Organ</span
              ><span class="detail-value">{{ resource.value()!.organ || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleTumorLbl">Tumor</span
              ><span class="detail-value">{{ resource.value()!.tumor_biobank_code || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleHasSerumLbl">Has Serum</span
              ><span class="detail-value">
                @if (resource.value()!.has_serum === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.has_serum === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleHasBuffyCoatLbl">Has Buffy Coat</span
              ><span class="detail-value">
                @if (resource.value()!.has_buffy === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.has_buffy === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleHasPlasmaLbl">Has Plasma</span
              ><span class="detail-value">
                @if (resource.value()!.has_plasma === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.has_plasma === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleHasTumorTissueLbl">Has Tumor Tissue</span
              ><span class="detail-value">
                @if (resource.value()!.has_tumor_tissue === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.has_tumor_tissue === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleHasNonTumorTissueLbl"
                >Has Non-Tumor Tissue</span
              ><span class="detail-value">
                @if (resource.value()!.has_non_tumor_tissue === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.has_non_tumor_tissue === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label" i18n="@@sampleIsMetastasisLbl">Is Metastasis</span
              ><span class="detail-value">
                @if (resource.value()!.is_metastasis === true) {
                  <ng-container i18n="@@yesOpt">Yes</ng-container>
                } @else if (resource.value()!.is_metastasis === false) {
                  <ng-container i18n="@@noOpt">No</ng-container>
                } @else {
                  —
                }
              </span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [],
})
export class SampleDetailPage {
  id = input.required<string>();

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly service = inject(SampleService);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = inject(API_URL);

  breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: $localize`Samples`, route: '/samples' },
    { label: this.id() },
  ]);

  resource = httpResource<Sample>(() => `${this.apiUrl}/samples/${this.id()}`);

  openEditDialog(): void {
    const sample = this.resource.value();
    if (!sample) return;

    const dialogRef = this.dialog.open(SampleFormComponent, {
      width: '500px',
      data: { mode: 'edit', biopsy: sample },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.service.update(sample.id, result).subscribe({
          next: () => {
            this.notification.success('Sample updated');
            this.resource.reload();
          },
          error: () => {
            this.notification.error('Failed to update sample');
          },
        });
      }
    });
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: $localize`Delete Sample`,
        message: 'Delete this sample? This cannot be undone.',
        confirmLabel: 'Delete',
        confirmColor: 'warn',
      } satisfies ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.delete(this.id()).subscribe({
          next: () => {
            this.notification.success('Sample deleted');
            this.router.navigate(['/samples']);
          },
          error: () => {
            this.notification.error('Failed to delete sample');
          },
        });
      }
    });
  }
}
