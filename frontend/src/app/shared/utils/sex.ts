export function normalizeSex(value: string | null): string | null {
  switch (value?.trim().toLowerCase()) {
    case 'm':
    case 'male':
      return 'M';
    case 'f':
    case 'female':
      return 'F';
    default:
      return value;
  }
}

export function formatSex(value: string | null): string {
  return normalizeSex(value) || '—';
}
