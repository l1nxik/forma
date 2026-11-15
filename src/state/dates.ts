// Calendar dates are local date strings, never UTC instants.
export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(value: string, days: number): string {
  const d = parseDate(value);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
