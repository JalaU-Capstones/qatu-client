import { resolveReportRange } from './adminReportRange.js';

describe('resolveReportRange', () => {
  const now = new Date(2026, 10, 18);

  it('covers the last 30 local days, grouped by day', () => {
    expect(resolveReportRange('30d', now)).toEqual({
      key: '30d',
      from: '2026-10-20',
      to: '2026-11-18',
      groupBy: 'day',
    });
  });

  it('starts this month on the first and groups by day', () => {
    expect(resolveReportRange('month', now)).toEqual({
      key: 'month',
      from: '2026-11-01',
      to: '2026-11-18',
      groupBy: 'day',
    });
  });

  it('covers 90 days by week and the calendar year by month', () => {
    expect(resolveReportRange('90d', now).groupBy).toBe('week');
    expect(resolveReportRange('90d', now).from).toBe('2026-08-21');
    expect(resolveReportRange('year', now)).toEqual({
      key: 'year',
      from: '2026-01-01',
      to: '2026-11-18',
      groupBy: 'month',
    });
  });

  it('falls back to 30 days for an unknown preset', () => {
    expect(resolveReportRange('forever', now).key).toBe('30d');
  });
});
