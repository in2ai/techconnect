import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents(),
  );

  it('renders the title and optional subtitle', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Patients');
    fixture.componentRef.setInput('subtitle', 'Subtitle copy');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-title')?.textContent).toContain('Patients');
    expect(el.querySelector('.page-subtitle')?.textContent).toContain('Subtitle copy');
  });

  it('omits breadcrumb nav when none are provided', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Patients');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav.breadcrumbs')).toBeNull();
  });

  it('renders breadcrumbs and marks the last one with aria-current', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Patient detail');
    fixture.componentRef.setInput('breadcrumbs', [
      { label: 'Patients', route: '/patients' },
      { label: 'John' },
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.breadcrumb-link') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('Patients');

    const current = el.querySelector('.breadcrumb-current') as HTMLElement | null;
    expect(current?.getAttribute('aria-current')).toBe('page');
    expect(current?.textContent?.trim()).toBe('John');
  });
});
