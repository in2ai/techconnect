import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  Cryopreservation,
  FACS,
  Implant,
  LCTrial,
  Measure,
  Mouse,
  PDXTrial,
  PDOTrial,
  Trial,
  TrialGenomicSequencing,
  TrialImage,
  TrialMolecularData,
  UsageRecord,
} from '@generated/models';

@Injectable({ providedIn: 'root' })
export class TrialService extends BaseCrudService<Trial> {
  protected endpoint = 'trials';
}

@Injectable({ providedIn: 'root' })
export class PDXTrialService extends BaseCrudService<PDXTrial> {
  protected endpoint = 'pdx-trials';
}

@Injectable({ providedIn: 'root' })
export class PDOTrialService extends BaseCrudService<PDOTrial> {
  protected endpoint = 'pdo-trials';
}

@Injectable({ providedIn: 'root' })
export class LCTrialService extends BaseCrudService<LCTrial> {
  protected endpoint = 'lc-trials';
}

@Injectable({ providedIn: 'root' })
export class ImplantService extends BaseCrudService<Implant> {
  protected endpoint = 'implants';
}

@Injectable({ providedIn: 'root' })
export class MeasureService extends BaseCrudService<Measure> {
  protected endpoint = 'measures';
}

@Injectable({ providedIn: 'root' })
export class MouseService extends BaseCrudService<Mouse> {
  protected endpoint = 'mice';
}

@Injectable({ providedIn: 'root' })
export class FACSService extends BaseCrudService<FACS> {
  protected endpoint = 'facs';
}

@Injectable({ providedIn: 'root' })
export class UsageRecordService extends BaseCrudService<UsageRecord> {
  protected endpoint = 'usage-records';
}

@Injectable({ providedIn: 'root' })
export class TrialImageService extends BaseCrudService<TrialImage> {
  protected endpoint = 'images';
}

@Injectable({ providedIn: 'root' })
export class CryopreservationService extends BaseCrudService<Cryopreservation> {
  protected endpoint = 'cryopreservations';
}

@Injectable({ providedIn: 'root' })
export class TrialGenomicSequencingService extends BaseCrudService<TrialGenomicSequencing> {
  protected endpoint = 'trial-genomic-sequencings';
}

@Injectable({ providedIn: 'root' })
export class TrialMolecularDataService extends BaseCrudService<TrialMolecularData> {
  protected endpoint = 'trial-molecular-data';
}
