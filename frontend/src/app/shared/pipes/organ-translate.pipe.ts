import { LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { inject } from '@angular/core';

const ORGAN_TRANSLATIONS_ES: Record<string, string> = {
  'Lung': 'Pulmón',
  'Bladder': 'Vejiga',
  'Colon': 'Colon',
  'Pancreas': 'Páncreas',
  'Breast': 'Mama',
  'Soft tissue': 'Partes blandas',
  'Bone/Hard tissue': 'Partes duras/oseas',
};

export function translateOrgan(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  if (locale.startsWith('es')) {
    return ORGAN_TRANSLATIONS_ES[value] ?? value;
  }
  return value;
}

@Pipe({
  name: 'organTranslate',
  standalone: true,
})
export class OrganTranslatePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: string | null | undefined): string {
    return translateOrgan(value, this.locale);
  }
}
