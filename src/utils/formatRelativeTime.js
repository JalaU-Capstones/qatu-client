const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Short Spanish label in local time; older than a week shows a date */
export function formatRelativeTime(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return '';

  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return 'Justo ahora';
  if (diff < HOUR) return `Hace ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `Hace ${Math.floor(diff / HOUR)} h`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday - DAY) return 'Ayer';
  if (diff < 7 * DAY) return `Hace ${Math.max(2, Math.floor(diff / DAY))} días`;

  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

/** Full date and time for the tooltip */
export function formatFullDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
