import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Strip invalid characters; keep at most one `.` and optional leading `-`. */
export function sanitizeNumericText(raw: string, integerOnly: boolean): string {
  let s = raw.replaceAll(/[^\d.-]/g, '');
  if (integerOnly) {
    s = s.replaceAll('.', '');
  }
  if (s.startsWith('-')) {
    s = '-' + s.slice(1).replaceAll('-', '');
  } else {
    s = s.replaceAll('-', '');
  }
  if (!integerOnly) {
    const firstDot = s.indexOf('.');
    if (firstDot === -1) return s;
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replaceAll('.', '');
  }
  return s;
}

/** Allows empty (optional fields). Rejects incomplete tokens like `-` or `.` alone. */
export function numberFormatValidator(integerOnly: boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    const s = String(raw).trim();
    if (s === '') return null;
    if (s === '-' || s === '.' || s === '-.') return { numberFormat: true };
    if (integerOnly) {
      return /^-?\d+$/.test(s) ? null : { numberFormat: true };
    }
    if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return { numberFormat: true };
    return Number.isFinite(Number(s)) ? null : { numberFormat: true };
  };
}
