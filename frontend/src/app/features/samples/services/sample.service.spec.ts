import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import { SampleService } from './sample.service';

describe('SampleService', () => {
  let service: SampleService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(SampleService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts to /samples on create', () => {
    service.create({ id: 'S-1' }).subscribe();
    const req = httpTesting.expectOne('/api/samples');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'S-1' });
  });

  it('patches /samples/:id on update', () => {
    service.update('S-1', { organ: 'Lung' }).subscribe();
    const req = httpTesting.expectOne('/api/samples/S-1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'S-1' });
  });
});
