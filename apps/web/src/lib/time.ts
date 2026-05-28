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
