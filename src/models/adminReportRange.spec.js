import { formatLocalDate, REPORT_RANGE_OPTIONS, resolveReportRange } from './adminReportRange.js';

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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('adminReportRange additional branches (recovered 1)', () => {
      const now = new Date(2026, 1, 28, 15, 30, 45);

      it('exposes a frozen list of the four dashboard presets', () => {
        expect(REPORT_RANGE_OPTIONS).toEqual([
          { key: '30d', label: 'Últimos 30 días' },
          { key: 'month', label: 'Este mes' },
          { key: '90d', label: 'Últimos 90 días' },
          { key: 'year', label: 'Este año' },
        ]);
        expect(Object.isFrozen(REPORT_RANGE_OPTIONS)).toBe(true);
      });

      it('formats local dates with zero padding and ignores the time component', () => {
        expect(formatLocalDate(new Date(2026, 0, 2))).toBe('2026-01-02');
        expect(formatLocalDate(new Date(2026, 10, 18))).toBe('2026-11-18');
        expect(formatLocalDate(now)).toBe('2026-02-28');
      });

      it('strips the time component from an explicit now value', () => {
        expect(resolveReportRange('month', now)).toEqual({
          key: 'month',
          from: '2026-02-01',
          to: '2026-02-28',
          groupBy: 'day',
        });
      });

      it('resolves the 90 day preset across month boundaries', () => {
        expect(resolveReportRange('90d', new Date(2026, 2, 1))).toEqual({
          key: '90d',
          from: '2025-12-02',
          to: '2026-03-01',
          groupBy: 'week',
        });
      });

      it('resolves the year preset from January 1st', () => {
        expect(resolveReportRange('year', now)).toEqual({
          key: 'year',
          from: '2026-01-01',
          to: '2026-02-28',
          groupBy: 'month',
        });
      });

      it('falls back to the complete 30 day range for unknown keys', () => {
        for (const key of [undefined, null, '', 'MONTH', 42, {}]) {
          expect(resolveReportRange(key, new Date(2026, 0, 1))).toEqual({
            key: '30d',
            from: '2025-12-03',
            to: '2026-01-01',
            groupBy: 'day',
          });
        }
      });

      it('handles leap day rollovers', () => {
        expect(resolveReportRange('30d', new Date(2024, 2, 1))).toEqual({
          key: '30d',
          from: '2024-02-01',
          to: '2024-03-01',
          groupBy: 'day',
        });
      });

      it('uses the current date when now is omitted', () => {
        const result = resolveReportRange('30d');
        expect(result.key).toBe('30d');
        expect(result.to).toBe(formatLocalDate(new Date()));
      });
    });
  })();
})();
