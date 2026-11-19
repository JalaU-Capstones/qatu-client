export const REPORT_RANGE_OPTIONS = Object.freeze([
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'month', label: 'Este mes' },
  { key: '90d', label: 'Últimos 90 días' },
  { key: 'year', label: 'Este año' },
]);

const KNOWN_RANGES = new Set(REPORT_RANGE_OPTIONS.map((option) => option.key));

/**
 * @param {Date} date
 * @returns {string} YYYY-MM-DD in the admin's local calendar.
 */
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function shiftDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Turns a dashboard preset into the `from`, `to`, and `group_by` the API expects.
 * Dates are the admin's local calendar. The API reads them as UTC days.
 *
 * @param {string} key
 * @param {Date} [now]
 * @returns {{ key: string, from: string, to: string, groupBy: 'day'|'week'|'month' }}
 */
export function resolveReportRange(key, now = new Date()) {
  const rangeKey = KNOWN_RANGES.has(key) ? key : '30d';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (rangeKey === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      key: rangeKey,
      from: formatLocalDate(from),
      to: formatLocalDate(today),
      groupBy: 'day',
    };
  }

  if (rangeKey === '90d') {
    return {
      key: rangeKey,
      from: formatLocalDate(shiftDays(today, -89)),
      to: formatLocalDate(today),
      groupBy: 'week',
    };
  }

  if (rangeKey === 'year') {
    const from = new Date(today.getFullYear(), 0, 1);
    return {
      key: rangeKey,
      from: formatLocalDate(from),
      to: formatLocalDate(today),
      groupBy: 'month',
    };
  }

  return {
    key: '30d',
    from: formatLocalDate(shiftDays(today, -29)),
    to: formatLocalDate(today),
    groupBy: 'day',
  };
}
