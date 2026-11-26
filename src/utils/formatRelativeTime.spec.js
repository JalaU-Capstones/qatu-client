import { formatFullDateTime, formatRelativeTime } from './formatRelativeTime.js';

describe('formatRelativeTime', () => {
  const now = new Date(2026, 10, 26, 15, 0, 0);
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);

  it('returns an empty string for invalid values', () => {
    expect(formatRelativeTime('not a date', now)).toBe('');
    expect(formatRelativeTime(null, now)).toBe('');
  });

  it('describes recent moments in minutes and hours', () => {
    expect(formatRelativeTime(minutesAgo(0.5), now)).toBe('Justo ahora');
    expect(formatRelativeTime(minutesAgo(5), now)).toBe('Hace 5 min');
    expect(formatRelativeTime(minutesAgo(3 * 60), now).startsWith('Hace 3 h')).toBeTrue();
  });

  it('says "Ayer" for the previous calendar day and days after that', () => {
    expect(formatRelativeTime(new Date(2026, 10, 25, 9, 0), now)).toBe('Ayer');
    expect(formatRelativeTime(new Date(2026, 10, 22, 9, 0), now)).toBe('Hace 4 días');
  });

  it('falls back to a short date for older notifications', () => {
    const sameYear = formatRelativeTime(new Date(2026, 9, 1, 9, 0), now);
    const otherYear = formatRelativeTime(new Date(2025, 9, 1, 9, 0), now);

    expect(sameYear).toContain('1');
    expect(sameYear).not.toContain('2026');
    expect(otherYear).toContain('2025');
  });

  it('accepts ISO strings from the API', () => {
    expect(formatRelativeTime(minutesAgo(10).toISOString(), now)).toBe('Hace 10 min');
  });
});

describe('formatFullDateTime', () => {
  it('formats a full local date with time', () => {
    const label = formatFullDateTime(new Date(2026, 10, 26, 15, 30));

    expect(label).toContain('2026');
    expect(label).toContain('26');
  });

  it('returns an empty string for invalid values', () => {
    expect(formatFullDateTime('nope')).toBe('');
  });
});
