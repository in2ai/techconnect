import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import { PassageService } from './passage.service';

describe('PassageService', () => {
  let service: PassageService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(PassageService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('gets /passages/:id', () => {
    service.get('P-7').subscribe();
    httpTesting.expectOne('/api/passages/P-7').flush({ id: 'P-7' });
  });

  it('throws when id is empty for get()', () => {
    expect(() => service.get('')).toThrow('ID is required');
  });
});
