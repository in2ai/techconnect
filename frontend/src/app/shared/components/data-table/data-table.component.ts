import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  viewChild,
  effect,
  Injectable,
} from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = $localize`:@@itemsPerPage:Items per page:`;
  override nextPageLabel     = $localize`:@@nextPage:Next page`;
  override previousPageLabel = $localize`:@@previousPage:Previous page`;
  override firstPageLabel    = $localize`:@@firstPage:First page`;
  override lastPageLabel     = $localize`:@@lastPage:Last page`;

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return $localize`:@@pageOfEmpty:0 of ${length}:length:`;
    }
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
    return $localize`:@@pageOf:${startIndex + 1}:start: - ${endIndex}:end: of ${length}:length:`;
  };
}

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'number';
}

@Component({
  selector: 'app-data-table',
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

        <span class="table-count" i18n> {{ dataSource().filteredData.length }} records </span>
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
                    {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : '—' }}
                  }
                  @default {
                    {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : '—' }}
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
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .search-field {
      flex: 1;
      max-width: 360px;
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

    /* Subtle alternating row tint */
    tr.mat-mdc-row:nth-child(even) {
      background-color: color-mix(in srgb, var(--mat-sys-surface-variant) 25%, transparent);
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

    mat-paginator {
      border-top: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0 0 14px 14px;
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
  pageSize = input(25);

  rowClicked = output<T>();

  filterValue = signal('');
  selectedRow = signal<T | null>(null);

  columnKeys = computed(() => this.columns().map((c) => c.key));

  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  dataSource = computed(() => {
    const ds = new MatTableDataSource<T>(this.data());
    const sort = this.sort();
    const paginator = this.paginator();
    if (sort) ds.sort = sort;
    if (paginator) ds.paginator = paginator;
    ds.filter = this.filterValue().trim().toLowerCase();
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

  onRowClick(row: T): void {
    this.selectedRow.set(row);
    this.rowClicked.emit(row);
  }
}
