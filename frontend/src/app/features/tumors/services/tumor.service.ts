import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Tumor, TumorGenomicSequencing, TumorMolecularData } from '@generated/models';

@Injectable({ providedIn: 'root' })
export class TumorService extends BaseCrudService<Tumor> {
  protected endpoint = 'tumors';
}

@Injectable({ providedIn: 'root' })
export class TumorGenomicSequencingService extends BaseCrudService<TumorGenomicSequencing> {
  protected endpoint = 'tumor-genomic-sequencings';
}

@Injectable({ providedIn: 'root' })
export class TumorMolecularDataService extends BaseCrudService<TumorMolecularData> {
  protected endpoint = 'tumor-molecular-data';
}
