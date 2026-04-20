import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LoadingStateComponent } from './loading-state.component';

describe('LoadingStateComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [LoadingStateComponent],
      providers: [provideAnimationsAsync('noop')],
    }).compileComponents(),
  );

  it('renders a spinner with aria-live="polite" in loading state', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentRef.setInput('status', 'loading');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(el.querySelector('mat-spinner')).toBeTruthy();
  });

  it('emits the retry output when the retry button is clicked', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorMessage', 'Bang');
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.retry-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(retried).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Bang');
  });

  it('uses provided empty title and message when empty', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentRef.setInput('status', 'empty');
    fixture.componentRef.setInput('emptyTitle', 'Nothing here');
    fixture.componentRef.setInput('emptyMessage', 'Try adding one.');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Nothing here');
    expect(text).toContain('Try adding one.');
  });

  it('falls back to default copy in empty state when no title or message is set', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentRef.setInput('status', 'empty');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('No data found');
    expect(text).toContain('There are no items to display yet.');
  });

  it('falls back to default error copy when errorMessage is omitted', () => {
    const fixture = TestBed.createComponent(LoadingStateComponent);
    fixture.componentRef.setInput('status', 'error');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('We could not load the data. Please try again.');
  });
});
