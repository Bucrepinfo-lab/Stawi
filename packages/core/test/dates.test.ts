import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, dateParts, weekdayOf, monthLabel, todayIso } from '../src/dates';

describe('formatDate — day-first whatever the device locale', () => {
  it('formats a date-only string as dd/mm/yy without any time-zone shift', () => {
    expect(formatDate('2026-11-07')).toBe('07/11/26');
    expect(formatDate('2026-01-31', { year: 'yyyy' })).toBe('31/01/2026');
    // A UTC-negative zone must not move a calendar date to the day before.
    expect(formatDate('2026-11-07', { timeZone: 'America/Los_Angeles' })).toBe('07/11/26');
  });

  it('is day-first for 7 November — never the month-first 11/07 an en-US phone shows', () => {
    expect(formatDate('2026-11-07')).not.toBe('11/07/26');
    expect(formatDate(new Date(Date.UTC(2026, 10, 7, 9, 0)))).toBe('07/11/26');
  });

  it('shows timestamps on the Nairobi clock by default', () => {
    // 22:30 UTC on 06/11 is already 01:30 on 07/11 in Nairobi (UTC+3).
    const late = '2026-11-06T22:30:00Z';
    expect(formatDate(late)).toBe('07/11/26');
    expect(formatDateTime(late)).toBe('07/11/26 01:30');
    expect(formatDateTime(late, { timeZone: 'UTC' })).toBe('06/11/26 22:30');
  });

  it('uses a 24-hour clock and 4-digit years when asked', () => {
    expect(formatDateTime('2026-11-07T11:05:00Z', { year: 'yyyy' })).toBe('07/11/2026 14:05');
  });

  it('returns the fallback for empty or unreadable input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(undefined, {}, 'No date')).toBe('No date');
    expect(formatDate('not a date', {}, '—')).toBe('—');
    expect(formatDate('2026-02-30', {}, '—')).toBe('—');
    expect(dateParts(null)).toBeNull();
  });
});

describe('weekdayOf / monthLabel / todayIso', () => {
  it('names the weekday of a calendar date', () => {
    expect(weekdayOf('2026-06-12')).toBe('Friday');
    expect(weekdayOf('2026-11-07')).toBe('Saturday');
    expect(weekdayOf('')).toBe('');
  });

  it('labels a month by name', () => {
    expect(monthLabel('2026-06')).toBe('June 2026');
    expect(monthLabel('2026-13')).toBe('');
    expect(monthLabel('junk')).toBe('');
  });

  it("gives today's date on the country clock", () => {
    expect(todayIso(new Date('2026-11-06T22:30:00Z'))).toBe('2026-11-07');
    expect(todayIso(new Date('2026-11-06T22:30:00Z'), 'UTC')).toBe('2026-11-06');
  });
});
