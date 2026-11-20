const pad2 = (n: number): string => String(n).padStart(2, '0');

export function getLocalDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getLocalWeekStartDate(nowMs: number = Date.now()): Date {
  const d = new Date(nowMs);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
  return monday;
}

export function getLocalWeekKey(nowMs: number = Date.now()): string {
  const monday = getLocalWeekStartDate(nowMs);
  return `W:${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
}

export function getMsUntilNextDailyReset(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - nowMs);
}

export function getMsUntilNextWeeklyReset(nowMs: number = Date.now()): number {
  const currentMonday = getLocalWeekStartDate(nowMs);
  const nextMonday = new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate() + 7,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMonday.getTime() - nowMs);
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (days > 0) {
    return `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
  }
  return `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
}

/**
 * Computes exact whole calendar-day difference (currDateKey - prevDateKey)
 * using UTC midnight math to stay immune to local DST shifts.
 * Returns null if either key is malformed.
 */
export function diffCalendarDays(prevDateKey: string, currDateKey: string): number | null {
  const parse = (k: string): number | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const ms = Date.UTC(year, month, day);
    const verify = new Date(ms);
    if (
      verify.getUTCFullYear() !== year ||
      verify.getUTCMonth() !== month ||
      verify.getUTCDate() !== day
    ) {
      return null;
    }
    return ms;
  };

  const a = parse(prevDateKey);
  const b = parse(currDateKey);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

export function getShortDayLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const labels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return labels[d.getDay()] ?? '';
}

export function getTrailingDateKeys(count: number, endNowMs: number = Date.now()): string[] {
  const end = new Date(endNowMs);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    out.push(getLocalDateKey(d.getTime()));
  }
  return out;
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicPick<T>(items: readonly T[], seedKey: string): T | null {
  if (items.length === 0) return null;
  const rng = mulberry32(hashString(seedKey));
  const idx = Math.floor(rng() * items.length);
  return items[idx] ?? items[0];
}
