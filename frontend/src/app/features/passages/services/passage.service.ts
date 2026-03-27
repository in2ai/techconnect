import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Passage } from '@generated/models';

@Injectable({ providedIn: 'root' })
export class PassageService extends BaseCrudService<Passage> {
  protected endpoint = 'passages';
}
