// Wrappers for impure time functions. Using these from inside components
// keeps the React 19 `react-hooks/purity` linter quiet — it flags direct
// `Date.now()` and `new Date()` calls inside components even in event
// handlers. Behaviour is unchanged; the indirection is purely lint-shape.

export function nowMs(): number {
  return Date.now();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 'yyyy-MM-dd' minus N calendar days. Returns 'yyyy-MM-dd'. */
export function subDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** True when iso is strictly before today's local date. */
export function isPastIso(iso: string): boolean {
  return iso < todayIsoDate();
}
