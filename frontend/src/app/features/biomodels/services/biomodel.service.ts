import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Biomodel } from '@generated/models';

@Injectable({ providedIn: 'root' })
export class BiomodelService extends BaseCrudService<Biomodel> {
  protected endpoint = 'biomodels';
}
