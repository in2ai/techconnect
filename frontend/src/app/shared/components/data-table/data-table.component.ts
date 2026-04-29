import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  Injectable,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = $localize`:@@itemsPerPage:Items per page:`;
  override nextPageLabel = $localize`:@@nextPage:Next page`;
  override previousPageLabel = $localize`:@@previousPage:Previous page`;
  override firstPageLabel = $localize`:@@firstPage:First page`;
  override lastPageLabel = $localize`:@@lastPage:Last page`;

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return $localize`:@@pageOfEmpty:0 of ${length}:length:`;
    }
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex =
      startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
    return $localize`:@@pageOf:${startIndex + 1}:start: - ${endIndex}:end: of ${length}:length:`;
  };
}

export interface TableFilter {
  key: string;
  label: string;
  options: { label: string; value: any }[];
}

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'number';
  suffix?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }],
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatMenuModule,
  ],
  template: `
    <div class="table-wrapper">
      <div class="table-toolbar">
        <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            i18n-placeholder="@@filterRecordsPlaceholder"
            placeholder="Filter records…"
            [value]="filterValue()"
            (input)="applyFilter($any($event.target).value)"
            aria-label="Search table"
          />
          @if (filterValue()) {
            <button matSuffix mat-icon-button (click)="applyFilter('')" aria-label="Clear filter">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <div class="filter-controls">
          @for (filter of filters(); track filter.key) {
            <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
              <mat-label>{{ filter.label }}</mat-label>
              <mat-select
                [value]="activeFilters()[filter.key]"
                (selectionChange)="updateFilter(filter.key, $event.value)"
              >
                <mat-option [value]="undefined" i18n="@@anyFilterLabel">Any</mat-option>
                @for (opt of filter.options; track opt.value) {
                  <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }

          @if (hasActiveFilters()) {
            <button mat-stroked-button color="warn" (click)="clearAllFilters()" class="clear-all">
              <mat-icon>filter_alt_off</mat-icon>
              <span i18n="@@clearFiltersBtn">Clear Filters</span>
            </button>
          }
        </div>

        <span class="table-count" i18n="@@tableRecordCount"> {{ dataSource().filteredData.length }} records </span>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="dataSource()" matSort class="data-table">
          @for (col of columns(); track col.key) {
            <ng-container [matColumnDef]="col.key">
              <th
                mat-header-cell
                *matHeaderCellDef
                [mat-sort-header]="col.key"
                [disabled]="col.sortable === false"
              >
                {{ col.label }}
              </th>
              <td mat-cell *matCellDef="let row">
                @switch (col.type) {
                  @case ('boolean') {
                    @if (row[col.key] === true) {
                      <mat-icon class="bool-icon yes">check_circle</mat-icon>
                    } @else if (row[col.key] === false) {
                      <mat-icon class="bool-icon no">cancel</mat-icon>
                    } @else {
                      <span class="null-value">—</span>
                    }
                  }
                  @case ('date') {
                    {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : '—' }}
                  }
                  @case ('number') {
                    {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] + (col.suffix || '') : '—' }}
                  }
                  @default {
                    {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] + (col.suffix || '') : '—' }}
                  }
                }
              </td>
            </ng-container>
          }

          <tr mat-header-row *matHeaderRowDef="columnKeys()"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: columnKeys()"
            class="clickable-row"
            [class.selected]="row === selectedRow()"
            (click)="onRowClick(row)"
            (keydown.enter)="onRowClick(row)"
            (keydown.space)="onRowClick(row); $event.preventDefault()"
            tabindex="0"
            role="button"
          ></tr>
          <tr class="mat-row empty-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="columnKeys().length">
              <div class="no-data-msg">
                <mat-icon>search_off</mat-icon>
                <span i18n="@@noMatchingRecords">No records matching the filters.</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50, 100]"
        showFirstLastButtons
        aria-label="Select page"
      ></mat-paginator>
    </div>
  `,
  styles: `
    .table-wrapper {
      animation: tableEnter 0.35s ease-out;
    }

    .table-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .search-field {
      flex: 1;
      min-width: 240px;
      max-width: 360px;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-field {
      width: 180px;
    }

    .clear-all {
      height: 40px;
      border-radius: 8px;
    }

    .table-count {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-outline);
      white-space: nowrap;
      margin-left: auto;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 14px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }

    .data-table {
      width: 100%;
    }

    th[mat-header-cell] {
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container-low);
    }

    .clickable-row {
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -2px;
      }

      &.selected {
        background-color: var(--mat-sys-secondary-container);
      }
    }

    tr.mat-mdc-row:nth-child(even) {
      background-color: color-mix(in srgb, var(--mat-sys-surface-variant) 15%, transparent);
    }

    tr.mat-mdc-row:nth-child(even):hover {
      background-color: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
    }

    .bool-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;

      &.yes {
        color: var(--mat-sys-primary);
      }
      &.no {
        color: var(--mat-sys-outline);
      }
    }

    .null-value {
      color: var(--mat-sys-outline);
    }

    .no-data-msg {
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--mat-sys-outline);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
    }

    mat-paginator {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    @keyframes tableEnter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class DataTableComponent<T> {
  columns = input.required<ColumnDef[]>();
  data = input.required<T[]>();
  filters = input<TableFilter[]>([]);
  pageSize = input(25);

  rowClicked = output<T>();

  filterValue = signal('');
  activeFilters = signal<Record<string, any>>({});
  selectedRow = signal<T | null>(null);

  columnKeys = computed(() => this.columns().map((c) => c.key));
  hasActiveFilters = computed(() => Object.keys(this.activeFilters()).length > 0);

  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  dataSource = computed(() => {
    const ds = new MatTableDataSource<T>(this.data());

    // Configure filter predicate to handle both global search and specific filters
    ds.filterPredicate = (dataRow: any, filterStr: string) => {
      const filtersObj = JSON.parse(filterStr);

      // Global search
      if (filtersObj.global) {
        const globalStr = filtersObj.global.toLowerCase();
        const dataStr = Object.values(dataRow).join(' ').toLowerCase();
        if (!dataStr.includes(globalStr)) return false;
      }

      // Specific filters
      for (const [key, value] of Object.entries(filtersObj.specific)) {
        if (value !== undefined && value !== null && value !== '') {
          const rowValue = dataRow[key];
          if (rowValue !== value) return false;
        }
      }

      return true;
    };

    const sort = this.sort();
    const paginator = this.paginator();
    if (sort) ds.sort = sort;
    if (paginator) ds.paginator = paginator;

    // Trigger filter with combined state
    ds.filter = JSON.stringify({
      global: this.filterValue().trim(),
      specific: this.activeFilters(),
    });

    return ds;
  });

  constructor() {
    effect(() => {
      const sort = this.sort();
      const paginator = this.paginator();
      const ds = this.dataSource();
      if (sort) ds.sort = sort;
      if (paginator) ds.paginator = paginator;
    });
  }

  applyFilter(value: string): void {
    this.filterValue.set(value);
  }

  updateFilter(key: string, value: any): void {
    this.activeFilters.update((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  clearAllFilters(): void {
    this.activeFilters.set({});
    this.filterValue.set('');
  }

  onRowClick(row: T): void {
    this.selectedRow.set(row);
    this.rowClicked.emit(row);
  }
}
