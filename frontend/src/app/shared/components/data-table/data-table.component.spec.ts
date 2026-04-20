import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ColumnDef, CustomPaginatorIntl, DataTableComponent } from './data-table.component';

interface Row {
  id: string;
  name: string;
  active: boolean | null;
}

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const rows: Row[] = [
  { id: 'R-1', name: 'Alpha', active: true },
  { id: 'R-2', name: 'Beta', active: false },
  { id: 'R-3', name: 'Gamma', active: null },
];

function createTable(data: Row[] = rows) {
  const fixture = TestBed.createComponent(DataTableComponent<Row>);
  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  return fixture;
}

describe('DataTableComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [provideAnimationsAsync('noop')],
    }).compileComponents(),
  );

  it('renders a row per data item', () => {
    const fixture = createTable();
    const bodyRows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(bodyRows.length).toBe(rows.length);
  });

  it('emits rowClicked with the correct row on click', () => {
    const fixture = createTable();
    let emitted: Row | null = null;
    fixture.componentInstance.rowClicked.subscribe((r) => (emitted = r));
    const firstRow = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
    firstRow.click();
    expect(emitted).toEqual(rows[0]);
    expect(fixture.componentInstance.selectedRow()).toEqual(rows[0]);
  });

  it('filters rows from the search field via applyFilter', () => {
    const fixture = createTable();
    fixture.componentInstance.applyFilter('alpha');
    fixture.detectChanges();
    expect(fixture.componentInstance.dataSource().filteredData).toEqual([rows[0]]);
  });

  it('applies and clears specific filters', () => {
    const fixture = createTable();
    fixture.componentInstance.updateFilter('active', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasActiveFilters()).toBe(true);
    expect(fixture.componentInstance.dataSource().filteredData).toEqual([rows[0]]);

    fixture.componentInstance.clearAllFilters();
    fixture.detectChanges();
    expect(fixture.componentInstance.hasActiveFilters()).toBe(false);
    expect(fixture.componentInstance.dataSource().filteredData.length).toBe(rows.length);
  });

  it('removes a filter when set to undefined', () => {
    const fixture = createTable();
    fixture.componentInstance.updateFilter('active', true);
    fixture.componentInstance.updateFilter('active', undefined);
    expect(fixture.componentInstance.activeFilters()).toEqual({});
  });

  it('activates a row on Enter key', () => {
    const fixture = createTable();
    let emitted: Row | null = null;
    fixture.componentInstance.rowClicked.subscribe((r) => (emitted = r));
    const firstRow = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
    firstRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(emitted).toEqual(rows[0]);
  });

  it('renders the no-data row when filters match nothing', () => {
    const fixture = createTable();
    fixture.componentInstance.applyFilter('no-such-row');
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.empty-row');
    expect(empty).toBeTruthy();
  });
});

describe('CustomPaginatorIntl', () => {
  it('localises the empty range', () => {
    const intl = new CustomPaginatorIntl();
    expect(intl.getRangeLabel(0, 25, 0)).toContain('0');
  });

  it('formats a page range', () => {
    const intl = new CustomPaginatorIntl();
    const label = intl.getRangeLabel(1, 10, 25);
    expect(label).toContain('11');
    expect(label).toContain('20');
    expect(label).toContain('25');
  });
});
