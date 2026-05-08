import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';

@Pipe({
  name: 'localizedDate',
  standalone: true,
})
export class LocalizedDatePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const format = this.locale.startsWith('es') ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    return new DatePipe(this.locale).transform(value, format);
  }
}

export function getLocalizedDatePlaceholder(): string {
  const path = globalThis.location?.pathname ?? '';
  const isSpanish = path.startsWith('/es/') || path === '/es';
  return isSpanish ? 'dd/mm/aaaa' : 'mm/dd/yyyy';
}
