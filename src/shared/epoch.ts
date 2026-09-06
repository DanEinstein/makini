/**
 * Postgres/JSON timestamps arrive as Date, ISO string, or epoch ms/seconds.
 * Always return milliseconds so the lock-screen countdown can do Date.now() math.
 */
export function toEpochMs(value: Date | string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isFinite(ms)) return ms;
  }

  if (typeof value === 'string' && value.trim()) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }

  return Date.now();
}
