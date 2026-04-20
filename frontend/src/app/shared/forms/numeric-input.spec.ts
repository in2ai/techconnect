import { FormControl } from '@angular/forms';
import { numberFormatValidator, sanitizeNumericText } from './numeric-input';

describe('sanitizeNumericText', () => {
  it('strips non-numeric characters when allowing decimals', () => {
    expect(sanitizeNumericText('abc12.3.4xx', false)).toBe('12.34');
  });

  it('removes decimal separator when integerOnly is true', () => {
    expect(sanitizeNumericText('12.34', true)).toBe('1234');
  });

  it('preserves a single leading minus sign', () => {
    expect(sanitizeNumericText('--12-3', false)).toBe('-123');
  });

  it('strips stray minus signs when value is positive', () => {
    expect(sanitizeNumericText('12-3', false)).toBe('123');
  });
});

describe('numberFormatValidator', () => {
  it('accepts empty values as valid', () => {
    const validate = numberFormatValidator(false);
    expect(validate(new FormControl(''))).toBeNull();
    expect(validate(new FormControl(null))).toBeNull();
  });

  it('rejects incomplete tokens like "-" or "."', () => {
    const validate = numberFormatValidator(false);
    expect(validate(new FormControl('-'))).toEqual({ numberFormat: true });
    expect(validate(new FormControl('.'))).toEqual({ numberFormat: true });
    expect(validate(new FormControl('-.'))).toEqual({ numberFormat: true });
  });

  it('enforces integers when integerOnly is true', () => {
    const validate = numberFormatValidator(true);
    expect(validate(new FormControl('12'))).toBeNull();
    expect(validate(new FormControl('-7'))).toBeNull();
    expect(validate(new FormControl('12.5'))).toEqual({ numberFormat: true });
  });

  it('accepts valid decimals with optional sign', () => {
    const validate = numberFormatValidator(false);
    expect(validate(new FormControl('12.5'))).toBeNull();
    expect(validate(new FormControl('-0.25'))).toBeNull();
    expect(validate(new FormControl('.5'))).toBeNull();
    expect(validate(new FormControl('1.'))).toBeNull();
  });

  it('treats whitespace-only values as valid (empty after trim)', () => {
    const validate = numberFormatValidator(false);
    expect(validate(new FormControl('   '))).toBeNull();
  });

  it('rejects garbage strings that pass the sanity pattern but do not parse', () => {
    const validate = numberFormatValidator(false);
    expect(validate(new FormControl('abc'))).toEqual({ numberFormat: true });
  });
});

describe('sanitizeNumericText edge cases', () => {
  it('returns the original string when no dot is present (decimal mode)', () => {
    expect(sanitizeNumericText('123', false)).toBe('123');
  });
});
