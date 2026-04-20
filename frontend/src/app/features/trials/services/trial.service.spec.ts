import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@core/tokens/api-url.token';
import {
  CryopreservationService,
  FACSService,
  ImplantService,
  LCTrialService,
  MeasureService,
  MouseService,
  PDOTrialService,
  PDXTrialService,
  TrialGenomicSequencingService,
  TrialImageService,
  TrialMolecularDataService,
  TrialService,
  UsageRecordService,
} from './trial.service';

describe('Trial services', () => {
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

  it('TrialService.createWithSubtype posts to /trials then /pdx-trials with shared id', () => {
    const created = { id: 'TR-9' };
    const service = TestBed.inject(TrialService);
    service
      .createWithSubtype({ description: 'x' }, 'PDX')
      .subscribe((trial) => expect(trial).toEqual(created));

    const base = httpTesting.expectOne('/api/trials');
    expect(base.request.method).toBe('POST');
    base.flush(created);

    const sub = httpTesting.expectOne('/api/pdx-trials');
    expect(sub.request.method).toBe('POST');
    expect(sub.request.body).toEqual({ id: 'TR-9' });
    sub.flush({});
  });

  it('TrialService.createWithSubtype chooses /pdo-trials for PDO', () => {
    const service = TestBed.inject(TrialService);
    service.createWithSubtype({}, 'PDO').subscribe();
    httpTesting.expectOne('/api/trials').flush({ id: 'TR-1' });
    httpTesting.expectOne('/api/pdo-trials').flush({});
  });

  it('TrialService.createWithSubtype chooses /lc-trials for LC', () => {
    const service = TestBed.inject(TrialService);
    service.createWithSubtype({}, 'LC').subscribe();
    httpTesting.expectOne('/api/trials').flush({ id: 'TR-2' });
    httpTesting.expectOne('/api/lc-trials').flush({});
  });

  it.each<[new (...args: any[]) => any, string]>([
    [PDXTrialService, '/api/pdx-trials'],
    [PDOTrialService, '/api/pdo-trials'],
    [LCTrialService, '/api/lc-trials'],
    [ImplantService, '/api/implants'],
    [MeasureService, '/api/measures'],
    [MouseService, '/api/mice'],
    [FACSService, '/api/facs'],
    [UsageRecordService, '/api/usage-records'],
    [TrialImageService, '/api/images'],
    [CryopreservationService, '/api/cryopreservations'],
    [TrialGenomicSequencingService, '/api/trial-genomic-sequencings'],
    [TrialMolecularDataService, '/api/trial-molecular-data'],
  ])('%s targets the expected endpoint', (ctor, endpoint) => {
    (TestBed.inject(ctor) as any).list().subscribe();
    httpTesting.expectOne(`${endpoint}?offset=0&limit=100`).flush([]);
  });
});
