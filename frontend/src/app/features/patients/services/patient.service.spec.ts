import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(PatientService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('targets the patients endpoint for list requests', () => {
    service.list().subscribe();
    httpTesting.expectOne('/api/patients?offset=0&limit=100').flush([]);
  });

  it('targets the patients endpoint for get requests', () => {
    service.get('NHC-1').subscribe();
    httpTesting.expectOne('/api/patients/NHC-1').flush({ nhc: 'NHC-1' });
  });
});
