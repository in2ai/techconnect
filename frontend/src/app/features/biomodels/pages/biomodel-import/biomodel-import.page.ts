import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { API_URL } from '@core/tokens/api-url.token';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

interface EntityImportCounts {
  created: number;
  updated: number;
}

interface ImportRowError {
  sheet: string;
  row_number: number;
  biomodel_id: string | null;
  tumor_biobank_code: string | null;
  patient_nhc: string | null;
  message: string;
}

interface PdxWorkbookImportSummary {
  filename: string | null;
  sheets_processed: number;
  rows_imported: number;
  rows_skipped: number;
  rows_failed: number;
  patients: EntityImportCounts;
  tumors: EntityImportCounts;
  biomodels: EntityImportCounts;
  errors: ImportRowError[];
}

@Component({
  selector: 'app-biomodel-import-page',
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
      i18n-title="@@biomodelImportTitle"
      title="Import PDX Workbook"
      i18n-subtitle="@@biomodelImportSubtitle"
      subtitle="Upload the legacy XLSX workbook to create or update patients, tumors, and PDX biomodels."
      [breadcrumbs]="breadcrumbs"
    >
      <a mat-stroked-button routerLink="/biomodels">
        <mat-icon>arrow_back</mat-icon>
        <ng-container i18n="@@backToBiomodels">Back to Biomodels</ng-container>
      </a>
    </app-page-header>

    @if (!auth.isAdmin()) {
      <mat-card appearance="outlined" class="state-card">
        <div class="state-card__content">
          <mat-icon aria-hidden="true">lock</mat-icon>
          <div>
            <h2 i18n="@@importAdminsOnlyTitle">Administrator access required</h2>
            <p i18n="@@importAdminsOnlyMessage">
              Only administrators can import workbook data into the platform.
            </p>
          </div>
        </div>
      </mat-card>
    } @else {
      <mat-card appearance="outlined" class="upload-card">
        <div class="upload-card__header">
          <div>
            <h2 i18n="@@uploadWorkbookHeading">Upload workbook</h2>
            <p i18n="@@uploadWorkbookCopy">
              The importer reads the PDX template columns embedded in the workbook and processes
              every matching sheet.
            </p>
          </div>
          <div class="upload-card__meta">
            <span i18n="@@supportedFormatLabel">Supported format:</span>
            <strong>.xlsx</strong>
          </div>
        </div>

        <div class="picker-row">
          <label class="file-picker" for="pdxWorkbookUpload">
            <mat-icon aria-hidden="true">upload_file</mat-icon>
            <span i18n="@@chooseWorkbookBtn">Choose workbook</span>
          </label>
          <input
            id="pdxWorkbookUpload"
            class="visually-hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            (change)="onFileSelected($event)"
          />

          <div class="picker-status" [class.picker-status--empty]="!selectedFileName()">
            @if (selectedFileName()) {
              <span>{{ selectedFileName() }}</span>
            } @else {
              <span i18n="@@noWorkbookSelected">No workbook selected</span>
            }
          </div>
        </div>

        <div class="action-row">
          <button mat-button type="button" (click)="clearSelection()" [disabled]="submitting()">
            <ng-container i18n="@@clearSelectionBtn">Clear</ng-container>
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="submit()"
            [disabled]="submitting() || !selectedFile()"
          >
            <mat-icon>publish</mat-icon>
            <ng-container i18n="@@importWorkbookBtn">Import workbook</ng-container>
          </button>
        </div>

        @if (submitting()) {
          <mat-progress-bar mode="indeterminate" />
        }

        @if (lastError()) {
          <p class="error-text">{{ lastError() }}</p>
        }
      </mat-card>

      @if (result(); as importResult) {
        <mat-card appearance="outlined" class="results-card">
          <div class="results-card__header">
            <div>
              <h2 i18n="@@importSummaryHeading">Import summary</h2>
              <p>
                <span i18n="@@importSummaryFileLabel">File:</span>
                <strong>{{ importResult.filename || selectedFileName() }}</strong>
              </p>
            </div>
            <div class="summary-pill" [class.summary-pill--warning]="importResult.rows_failed > 0">
              <mat-icon aria-hidden="true">{{
                importResult.rows_failed > 0 ? 'warning' : 'task_alt'
              }}</mat-icon>
              <span>{{ successLabel() }}</span>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@sheetsProcessedLabel"
                >Sheets processed</span
              >
              <strong>{{ importResult.sheets_processed }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@rowsImportedLabel">Rows imported</span>
              <strong>{{ importResult.rows_imported }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@rowsSkippedLabel">Rows skipped</span>
              <strong>{{ importResult.rows_skipped }}</strong>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__label" i18n="@@rowsFailedLabel">Rows failed</span>
              <strong>{{ importResult.rows_failed }}</strong>
            </div>
          </div>

          <div class="entity-grid">
            @for (entity of entitySummaries(); track entity.label) {
              <div class="entity-card">
                <span class="entity-card__title">{{ entity.label }}</span>
                <div class="entity-card__counts">
                  <span>
                    <strong>{{ entity.counts.created }}</strong>
                    <span i18n="@@createdLabel">created</span>
                  </span>
                  <span>
                    <strong>{{ entity.counts.updated }}</strong>
                    <span i18n="@@updatedLabel">updated</span>
                  </span>
                </div>
              </div>
            }
          </div>

          @if (importResult.errors.length) {
            <div class="error-panel" aria-live="polite">
              <h3 i18n="@@importErrorsHeading">Rows with issues</h3>
              <ul>
                @for (
                  issue of importResult.errors;
                  track issue.sheet + '-' + issue.row_number + '-' + issue.message
                ) {
                  <li>
                    <strong>{{ issue.sheet }} / {{ issue.row_number }}</strong>
                    <span>{{ issue.message }}</span>
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

    .upload-card,
    .results-card,
    .state-card {
      margin-bottom: 1rem;
    }

    .upload-card,
    .results-card {
      padding: 1rem;
    }

    .upload-card__header,
    .results-card__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    .upload-card__header p,
    .results-card__header p,
    .state-card__content p {
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.5;
      margin-top: 0.375rem;
    }

    .upload-card__meta {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }

    .picker-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .file-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      border: 1px solid var(--mat-sys-outline);
      cursor: pointer;
      background: var(--mat-sys-surface-container-low);
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    }

    .file-picker:hover,
    .file-picker:focus-within {
      background: var(--mat-sys-surface-container);
      border-color: var(--mat-sys-primary);
    }

    .picker-status {
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      padding: 0 0.875rem;
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
    }

    .picker-status--empty {
      color: var(--mat-sys-on-surface-variant);
    }

    .action-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .summary-grid,
    .entity-grid {
      display: grid;
      gap: 0.75rem;
    }

    .summary-grid {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      margin-bottom: 1rem;
    }

    .entity-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .summary-stat,
    .entity-card {
      border-radius: 16px;
      padding: 0.875rem 1rem;
      background: var(--mat-sys-surface-container-low);
    }

    .summary-stat__label,
    .entity-card__title {
      display: block;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 0.375rem;
      font: var(--mat-sys-label-medium);
    }

    .summary-stat strong,
    .entity-card strong {
      font: var(--mat-sys-headline-small);
    }

    .entity-card__counts {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .summary-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      font-weight: 600;
    }

    .summary-pill--warning {
      background: color-mix(in srgb, var(--mat-sys-error) 12%, transparent);
      color: var(--mat-sys-error);
    }

    .error-panel {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 16px;
      background: color-mix(in srgb, var(--mat-sys-error) 7%, transparent);
    }

    .error-panel ul {
      margin: 0.75rem 0 0;
      padding-left: 1.25rem;
    }

    .error-panel li + li {
      margin-top: 0.5rem;
    }

    .error-text {
      margin-top: 0.75rem;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-medium);
    }

    .state-card__content {
      display: flex;
      gap: 0.875rem;
      align-items: flex-start;
      padding: 1rem;
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

    @media (max-width: 640px) {
      .picker-row {
        align-items: stretch;
      }

      .file-picker,
      .picker-status,
      .summary-pill {
        width: 100%;
        justify-content: center;
      }

      .action-row {
        justify-content: stretch;
      }

      .action-row button {
        flex: 1 1 100%;
      }
    }
  `,
})
export class BiomodelImportPage {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject<string>(API_URL);
  private readonly notification = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly breadcrumbs = [
    { label: $localize`:@@navBiomodels:Biomodels`, route: '/biomodels' },
    { label: $localize`:@@biomodelImportTitle:Import PDX Workbook` },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly submitting = signal(false);
  protected readonly result = signal<PdxWorkbookImportSummary | null>(null);
  protected readonly lastError = signal<string | null>(null);
  protected readonly selectedFileName = computed(() => this.selectedFile()?.name ?? null);
  protected readonly entitySummaries = computed(() => {
    const current = this.result();
    if (!current) {
      return [];
    }

    return [
      { label: $localize`:@@navPatients:Patients`, counts: current.patients },
      { label: $localize`:@@navTumors:Tumors`, counts: current.tumors },
      { label: $localize`:@@navBiomodels:Biomodels`, counts: current.biomodels },
    ];
  });
  protected readonly successLabel = computed(() => {
    const current = this.result();
    if (!current) {
      return '';
    }

    if (current.rows_failed > 0) {
      return $localize`:@@importCompletedWithIssues:Completed with issues`;
    }

    return $localize`:@@importCompleted:Import completed`;
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.selectedFile.set(file);
    this.lastError.set(null);
  }

  protected clearSelection(): void {
    this.selectedFile.set(null);
    this.lastError.set(null);
  }

  protected submit(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file, file.name);

    this.submitting.set(true);
    this.lastError.set(null);

    this.http
      .post<PdxWorkbookImportSummary>(`${this.apiUrl}/imports/pdx-workbook`, formData)
      .subscribe({
        next: (response) => {
          this.result.set(response);
          this.submitting.set(false);

          if (response.rows_failed > 0) {
            this.notification.info(
              $localize`:@@importPartialSuccess:${response.rows_imported}:rowCount: rows imported with ${response.rows_failed}:errorCount: issues.`,
            );
            return;
          }

          this.notification.success(
            $localize`:@@importSuccessMessage:${response.rows_imported}:rowCount: rows imported successfully.`,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.lastError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }
    return $localize`:@@importRequestFailed:Import request failed. Please review the workbook and try again.`;
  }
}
