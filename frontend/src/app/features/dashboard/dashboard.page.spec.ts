import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { API_URL } from '@core/tokens/api-url.token';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('creates a card for every registered endpoint', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const endpoints = fixture.componentInstance.cards.map((c) => c.endpoint);
    expect(endpoints).toEqual(['patients', 'tumors', 'samples', 'biomodels', 'passages', 'trials']);
  });

  it('throws when requesting an unknown resource', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    expect(() => fixture.componentInstance.getResource('unknown')).toThrow(
      'No resource found for endpoint: unknown',
    );
  });

  it('issues one http request per dashboard endpoint when rendered', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    for (const card of fixture.componentInstance.cards) {
      httpMock.expectOne(`/api/${card.endpoint}`).flush([]);
    }
    httpMock.verify();
  });

  it('renders the count for resources with values and an error icon otherwise', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const cards = fixture.componentInstance.cards;
    httpMock.expectOne(`/api/${cards[0].endpoint}`).flush([{ id: '1' }, { id: '2' }]);
    httpMock
      .expectOne(`/api/${cards[1].endpoint}`)
      .flush({ detail: 'boom' }, { status: 500, statusText: 'ServerError' });
    for (const card of cards.slice(2)) {
      httpMock.expectOne(`/api/${card.endpoint}`).flush([]);
    }

    await fixture.whenStable();
    fixture.detectChanges();

    const errorIcons = fixture.nativeElement.querySelectorAll('.count-error-icon');
    expect(errorIcons.length).toBe(1);
    const counts = Array.from(
      fixture.nativeElement.querySelectorAll('.card-count'),
    ) as HTMLElement[];
    const first = counts[0].textContent?.trim();
    expect(first).toBe('2');
  });
});
