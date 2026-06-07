/**
 * Compact relative-time formatting for the data tool.
 * Returns terse labels like "just now", "5m ago", "2u ago", "3d ago" — with the
 * full absolute timestamp exposed separately for use in a `title` tooltip.
 */

/** Parse the API's timestamps, which may be ISO or "YYYY-MM-DD HH:MM:SS" (UTC). */
export function parseTimestamp(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
}

/** Terse relative label, e.g. "just now", "5m ago", "2u ago", "3d ago". */
export function formatRelative(value: string | number | Date, now: number = Date.now()): string {
  const date = parseTimestamp(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '—';

  const diffSec = Math.round((now - ms) / 1000);
  if (diffSec < 0) return 'just now';
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1m ago';

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}u ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;

  return `${Math.round(diffMonth / 12)}y ago`;
}

/** Full absolute timestamp for tooltips, e.g. "7 Jun 2026, 14:32". */
export function formatAbsolute(value: string | number | Date): string {
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
