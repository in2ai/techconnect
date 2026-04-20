import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import {
  TumorGenomicSequencingService,
  TumorMolecularDataService,
  TumorService,
} from './tumor.service';

describe('Tumor services', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('TumorService hits /tumors', () => {
    TestBed.inject(TumorService).list().subscribe();
    httpTesting.expectOne('/api/tumors?offset=0&limit=100').flush([]);
  });

  it('TumorGenomicSequencingService hits /tumor-genomic-sequencings', () => {
    TestBed.inject(TumorGenomicSequencingService).list().subscribe();
    httpTesting.expectOne('/api/tumor-genomic-sequencings?offset=0&limit=100').flush([]);
  });

  it('TumorMolecularDataService hits /tumor-molecular-data', () => {
    TestBed.inject(TumorMolecularDataService).list().subscribe();
    httpTesting.expectOne('/api/tumor-molecular-data?offset=0&limit=100').flush([]);
  });
});
