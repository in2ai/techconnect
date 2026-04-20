import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import { BiomodelService } from './biomodel.service';

describe('BiomodelService', () => {
  let service: BiomodelService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(BiomodelService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('deletes /biomodels/:id', () => {
    service.delete('B-1').subscribe((res) => expect(res).toEqual({ ok: true }));
    const req = httpTesting.expectOne('/api/biomodels/B-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });

  it('lists /biomodels with pagination', () => {
    service.list(25, 50).subscribe();
    httpTesting.expectOne('/api/biomodels?offset=25&limit=50').flush([]);
  });
});
