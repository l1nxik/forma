import { describe, it, expect } from 'vitest';
import { localDate, addDays, parseDate } from './dates';
describe('local calendar dates', () => {
  it('uses local date components, including near UTC midnight', () => {
    const d = new Date(2026, 10, 15, 0, 15);
    expect(localDate(d)).toBe('2026-11-15');
  });
  it('crosses leap days and year boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('crosses daylight saving boundaries as calendar dates', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
  it('round trips without parsing an ISO date as UTC', () =>
    expect(localDate(parseDate('2026-11-15'))).toBe('2026-11-15'));
});
