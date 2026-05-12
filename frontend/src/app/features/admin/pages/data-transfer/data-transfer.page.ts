import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

interface EntityImportCounts {
  created: number;
  updated: number;
}

interface DatasetImportError {
  table: string;
  row_number: number;
  primary_key: string | null;
  message: string;
}

interface DatasetImportSummary {
  filename: string | null;
  format: string;
  tables_processed: number;
  rows_imported: number;
  rows_skipped: number;
  rows_failed: number;
  table_counts: Record<string, EntityImportCounts>;
  errors: DatasetImportError[];
}

interface TransferAction {
  label: string;
  description: string;
  icon: string;
  endpoint: string;
  defaultFileName: string;
}

@Component({
  selector: 'app-data-transfer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      i18n-title="@@dataTransferTitle"
      title="Dataset Transfer"
      i18n-subtitle="@@dataTransferSubtitle"
      subtitle="Download Excel templates, export the current database, and import completed Excel workbooks for all domain tables."
      [breadcrumbs]="breadcrumbs"
    >
      <div class="header-actions">
        <a mat-stroked-button routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          <ng-container i18n="@@backToDashboard">Back to Dashboard</ng-container>
        </a>
      </div>
    </app-page-header>

    @if (!auth.isAdmin()) {
      <mat-card appearance="outlined" class="state-card">
        <div class="state-card__content">
          <mat-icon aria-hidden="true">lock</mat-icon>
          <div>
            <h2 i18n="@@dataTransferAdminsOnlyTitle">Administrator access required</h2>
            <p i18n="@@dataTransferAdminsOnlyMessage">
              Only administrators can export or import dataset files.
            </p>
          </div>
        </div>
      </mat-card>
    } @else {
      <div class="transfer-grid">
        <mat-card appearance="outlined" class="action-card">
          <div class="section-copy">
            <h2 i18n="@@downloadAssetsHeading">Download assets</h2>
            <p i18n="@@downloadAssetsCopy">
              Use the empty templates for new data entry or export the current database to edit it offline.
            </p>
          </div>

          <div class="action-list">
            @for (action of transferActions; track action.endpoint) {
              <button
                mat-stroked-button
                type="button"
                class="download-button"
                [disabled]="downloadInFlight() === action.endpoint"
                (click)="download(action)"
              >
                <mat-icon>{{ action.icon }}</mat-icon>
                <span class="download-button__content">
                  <span>{{ action.label }}</span>
                  <small>{{ action.description }}</small>
                </span>
              </button>
            }
          </div>

          @if (downloadInFlight()) {
            <mat-progress-bar mode="indeterminate" />
          }
        </mat-card>

        <mat-card appearance="outlined" class="action-card">
          <div class="section-copy">
            <h2 i18n="@@importDatasetHeading">Import dataset package</h2>
            <p i18n="@@importDatasetCopy">
              Upload the completed Excel workbook. Existing primary keys are updated; new ones are created.
            </p>
          </div>

          <div class="picker-row">
            <label class="file-picker" for="datasetTransferUpload">
              <mat-icon aria-hidden="true">drive_folder_upload</mat-icon>
              <span i18n="@@chooseDatasetPackageBtn">Choose Excel file</span>
            </label>
            <input
              id="datasetTransferUpload"
              class="visually-hidden"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              (change)="onFileSelected($event)"
            />

            <div class="picker-status" [class.picker-status--empty]="!selectedFileName()">
              @if (selectedFileName()) {
                <span>{{ selectedFileName() }}</span>
              } @else {
                <span i18n="@@noDatasetPackageSelected">No Excel file selected</span>
              }
            </div>
          </div>

          <div class="format-hint" aria-live="polite">
            <mat-icon aria-hidden="true">info</mat-icon>
            <span>{{ importEndpointHint() }}</span>
          </div>

          <div class="action-row">
            <button mat-button type="button" (click)="clearSelection()" [disabled]="uploading()">
              <ng-container i18n="@@clearDatasetSelectionBtn">Clear</ng-container>
            </button>
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="submit()"
              [disabled]="uploading() || !selectedFile()"
            >
              <mat-icon>publish</mat-icon>
              <ng-container i18n="@@importDatasetPackageBtn">Import Excel file</ng-container>
            </button>
          </div>

          @if (uploading()) {
            <mat-progress-bar mode="indeterminate" />
          }

          @if (lastError()) {
            <p class="error-text">{{ lastError() }}</p>
          }
        </mat-card>
      </div>

      @if (result(); as importResult) {
        <mat-card appearance="outlined" class="results-card">
          <div class="results-card__header">
            <div>
              <h2 i18n="@@datasetImportSummaryHeading">Transfer summary</h2>
              <p>
                <span i18n="@@datasetImportSummaryFileLabel">File:</span>
                <strong>{{ importResult.filename || selectedFileName() }}</strong>
              </p>
              <p>
                <span i18n="@@datasetImportSummaryFormatLabel">Format:</span>
                <strong>{{ importResult.format }}</strong>
              </p>
            </div>
            <div class="summary-pill" [class.summary-pill--warning]="importResult.rows_failed > 0">
              <mat-icon aria-hidden="true">{{ importResult.rows_failed > 0 ? 'warning' : 'task_alt' }}</mat-icon>
              <span>{{ successLabel() }}</span>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@tablesProcessedLabel">Tables processed</span>
              <strong>{{ importResult.tables_processed }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@datasetRowsImportedLabel">Rows imported</span>
              <strong>{{ importResult.rows_imported }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@datasetRowsSkippedLabel">Rows skipped</span>
              <strong>{{ importResult.rows_skipped }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@datasetRowsFailedLabel">Rows failed</span>
              <strong>{{ importResult.rows_failed }}</strong>
            </div>
          </div>

          <div class="entity-grid">
            @for (entity of tableSummaries(); track entity.label) {
              <div class="entity-card">
                <span class="entity-card__title">{{ entity.label }}</span>
                <div class="entity-card__counts">
                  <span>
                    <strong>{{ entity.counts.created }}</strong>
                    <span i18n="@@datasetCreatedLabel">created</span>
                  </span>
                  <span>
                    <strong>{{ entity.counts.updated }}</strong>
                    <span i18n="@@datasetUpdatedLabel">updated</span>
                  </span>
                </div>
              </div>
            }
          </div>

          @if (importResult.errors.length) {
            <div class="error-panel" aria-live="polite">
              <div class="error-panel__header">
                <div>
                  <h3 i18n="@@datasetImportErrorsHeading">Rows with issues</h3>
                  <p class="error-panel__copy" i18n="@@datasetImportErrorsCopy">
                    Download the failed rows to share them or fix them offline.
                  </p>
                </div>
              </div>
              <ul>
                @for (
                  issue of importResult.errors;
                  track issue.table + '-' + issue.row_number + '-' + issue.message
                ) {
                  <li>
                    <strong>{{ issue.table }} / {{ issue.row_number }}</strong>
                    <span>{{ issue.message }}</span>
                    @if (issue.primary_key) {
                      <small>{{ issue.primary_key }}</small>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </mat-card>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .header-actions,
    .transfer-grid,
    .action-list,
    .action-row,
    .picker-row,
    .state-card__content,
    .results-card__header,
    .summary-grid,
    .entity-grid,
    .entity-card__counts,
    .format-hint {
      display: flex;
    }

    .header-actions,
    .action-row,
    .picker-row,
    .results-card__header,
    .summary-grid,
    .entity-grid {
      gap: 1rem;
      flex-wrap: wrap;
    }

    .transfer-grid {
      gap: 1rem;
      flex-wrap: wrap;
      align-items: stretch;
      margin-bottom: 1rem;
    }

    .action-card,
    .results-card,
    .state-card {
      margin-bottom: 1rem;
    }

    .action-card,
    .results-card {
      flex: 1 1 26rem;
      padding: 1rem;
    }

    .section-copy,
    .results-card__header > div:first-child {
      display: grid;
      gap: 0.35rem;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    .section-copy p,
    .results-card__header p,
    .state-card__content p,
    .format-hint {
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.5;
    }

    .action-list {
      flex-direction: column;
      gap: 0.75rem;
      margin: 1rem 0;
    }

    .download-button {
      width: 100%;
      min-height: 4.75rem;
      height: auto;
      display: inline-flex;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 0.875rem 1rem;
      text-align: left;
      white-space: normal;
      line-height: 1.35;
      gap: 0.25rem;
      box-sizing: border-box;
    }

    .download-button mat-icon {
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    .download-button__content {
      display: grid;
      gap: 0.125rem;
      justify-items: start;
      margin-left: 0.5rem;
      min-width: 0;
      flex: 1 1 auto;
    }

    .download-button__content > span,
    .download-button__content > small {
      white-space: normal;
    }

    .download-button__content small {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    .picker-row {
      align-items: center;
      margin: 1rem 0 0.75rem;
    }

    .file-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      border-radius: 999px;
      cursor: pointer;
      background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      font-weight: 600;
    }

    .picker-status {
      min-width: min(24rem, 100%);
      flex: 1 1 14rem;
      padding: 0.85rem 1rem;
      border-radius: 0.875rem;
      background: color-mix(in srgb, var(--mat-sys-surface-container-high) 72%, white 28%);
    }

    .picker-status--empty {
      color: var(--mat-sys-on-surface-variant);
    }

    .format-hint {
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .action-row {
      justify-content: flex-end;
      margin-bottom: 0.75rem;
    }

    .summary-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.9rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--mat-sys-primary) 14%, white 86%);
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      font-weight: 600;
      align-self: flex-start;
    }

    .summary-pill--warning {
      background: color-mix(in srgb, var(--mat-sys-error) 16%, white 84%);
      color: var(--mat-sys-error);
    }

    .summary-grid,
    .entity-grid {
      margin-top: 1rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }

    .summary-stat,
    .entity-card {
      border-radius: 1rem;
      padding: 0.9rem 1rem;
      background: color-mix(in srgb, var(--mat-sys-surface-container-high) 75%, white 25%);
    }

    .summary-stat {
      display: grid;
      gap: 0.35rem;
    }

    .summary-stat__label,
    .entity-card__title {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }

    .entity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }

    .entity-card {
      display: grid;
      gap: 0.55rem;
    }

    .entity-card__counts {
      justify-content: space-between;
      gap: 0.75rem;
    }

    .entity-card__counts span {
      display: inline-flex;
      gap: 0.3rem;
      align-items: baseline;
    }

    .error-panel {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 1rem;
      background: color-mix(in srgb, var(--mat-sys-error) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--mat-sys-error) 30%, transparent);
    }

    .error-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .error-panel__copy {
      margin-top: 0.35rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .error-panel ul {
      margin: 0.75rem 0 0;
      padding-left: 1.2rem;
      display: grid;
      gap: 0.6rem;
    }

    .error-panel li {
      display: grid;
      gap: 0.15rem;
    }

    .error-panel small,
    .error-text {
      color: var(--mat-sys-error);
    }

    .state-card {
      padding: 1rem;
    }

    .state-card__content {
      align-items: flex-start;
      gap: 1rem;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 720px) {
      .header-actions,
      .picker-row,
      .results-card__header,
      .action-row {
        flex-direction: column;
        align-items: stretch;
      }

      .action-row {
        justify-content: flex-start;
      }

      .summary-pill {
        align-self: stretch;
        justify-content: center;
      }
    }
  `,
})
export class DataTransferPage {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly apiUrl = inject<string>(API_URL);

  protected readonly breadcrumbs = [
    { label: $localize`:@@dashboardTitle:Dashboard`, route: '/dashboard' },
    { label: $localize`:@@dataTransferTitle:Dataset Transfer` },
  ];

  protected readonly transferActions: TransferAction[] = [
    {
      label: $localize`:@@downloadExcelTemplateLabel:Download Excel template`,
      description: $localize`:@@downloadExcelTemplateDescription:One sheet per domain table, ready for manual entry.`,
      icon: 'table_view',
      endpoint: '/imports/dataset-template.xlsx',
      defaultFileName: 'techconnect-dataset-template.xlsx',
    },
    {
      label: $localize`:@@downloadExcelExportLabel:Export current dataset as Excel`,
      description: $localize`:@@downloadExcelExportDescription:Round-trip the current domain records in workbook form.`,
      icon: 'download',
      endpoint: '/imports/dataset.xlsx',
      defaultFileName: 'techconnect-dataset.xlsx',
    },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = computed(() => this.selectedFile()?.name ?? '');
  protected readonly uploadEndpoint = computed(() => {
    const fileName = this.selectedFileName().toLowerCase();
    if (fileName.endsWith('.xlsx')) {
      return '/imports/dataset-workbook';
    }
    return null;
  });
  protected readonly importEndpointHint = computed(() => {
    if (this.uploadEndpoint() === '/imports/dataset-workbook') {
      return $localize`:@@datasetWorkbookHint:Workbook upload detected. This will import the Excel workbook template.`;
    }
    return $localize`:@@datasetUploadHint:Accepted format: .xlsx workbook.`;
  });
  protected readonly downloadInFlight = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly lastError = signal<string | null>(null);
  protected readonly result = signal<DatasetImportSummary | null>(null);
  protected readonly tableSummaries = computed(() => {
    const result = this.result();
    if (!result) {
      return [];
    }

    return Object.entries(result.table_counts)
      .filter(([, counts]) => counts.created > 0 || counts.updated > 0)
      .map(([tableName, counts]) => ({
        label: this.toTitleCase(tableName.replaceAll('_', ' ')),
        counts,
      }));
  });
  protected readonly successLabel = computed(() => {
    const result = this.result();
    if (!result) {
      return '';
    }

    if (result.rows_failed > 0) {
      return $localize`:@@datasetImportCompletedWithErrors:Completed with issues`;
    }

    return $localize`:@@datasetImportCompleted:Import completed`;
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [file] = input.files ?? [];
    this.selectedFile.set(file ?? null);
    this.lastError.set(null);
  }

  protected clearSelection(): void {
    this.selectedFile.set(null);
    this.lastError.set(null);
  }

  protected download(action: TransferAction): void {
    this.downloadInFlight.set(action.endpoint);
    this.lastError.set(null);

    this.http
      .get(`${this.apiUrl}${action.endpoint}`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(finalize(() => this.downloadInFlight.set(null)))
      .subscribe({
        next: (response) => {
          this.saveBlob(response, action.defaultFileName);
          this.notifications.success(
            $localize`:@@datasetDownloadSuccessMessage:Download started successfully.`,
          );
        },
        error: (error: HttpErrorResponse) => {
          const message = this.getErrorMessage(error);
          this.lastError.set(message);
          this.notifications.error(message);
        },
      });
  }

  protected submit(): void {
    const file = this.selectedFile();
    const endpoint = this.uploadEndpoint();
    if (!file || !endpoint) {
      const message = $localize`:@@datasetUnsupportedFileType:Select a .xlsx workbook before importing.`;
      this.lastError.set(message);
      this.notifications.error(message);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    this.uploading.set(true);
    this.lastError.set(null);
    this.result.set(null);

    this.http
      .post<DatasetImportSummary>(`${this.apiUrl}${endpoint}`, formData)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (response) => {
          this.result.set(response);
          this.notifications.success(
            $localize`:@@datasetImportSuccessMessage:${response.rows_imported}:rowCount: rows imported successfully.`,
          );
        },
        error: (error: HttpErrorResponse) => {
          const message = this.getErrorMessage(error);
          this.lastError.set(message);
          this.notifications.error(message);
        },
      });
  }

  private saveBlob(response: HttpResponse<Blob>, defaultFileName: string): void {
    const blob = response.body;
    if (!blob) {
      throw new Error('Missing download body.');
    }

    this.saveGeneratedBlob(blob, this.getFileName(response, defaultFileName));
  }

  private saveGeneratedBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private getFileName(response: HttpResponse<Blob>, defaultFileName: string): string {
    const contentDisposition = response.headers.get('content-disposition');
    const match = contentDisposition?.match(/filename="([^"]+)"/i);
    return match?.[1] ?? defaultFileName;
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }
    return error.message || $localize`:@@datasetTransferGenericError:Something went wrong while processing the dataset request.`;
  }

  private toTitleCase(value: string): string {
    return value.replaceAll(/\b\w/g, (character) => character.toUpperCase());
  }
}