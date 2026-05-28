// en-AU formatting helpers (single point of truth per PRD §19.5).
// AUD only in v1, but routed through one helper for future i18n.

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('en-AU');

export function formatCurrency(value: number): string {
  return AUD.format(value);
}

export function formatPoints(value: number): string {
  return NUM.format(value);
}

export function formatDate(iso: string): string {
  // 'yyyy-MM-dd' → 'd MMM yyyy' (e.g. '28 May 2026')
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatRelativeDays(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'now';
  if (daysRemaining === 1) return '1 day';
  if (daysRemaining < 30) return `${daysRemaining} days`;
  if (daysRemaining < 365) {
    const months = Math.round(daysRemaining / 30);
    return months === 1 ? '~1 month' : `~${months} months`;
  }
  const years = Math.floor(daysRemaining / 365);
  const remMonths = Math.round((daysRemaining % 365) / 30);
  if (remMonths === 0) return years === 1 ? '~1 year' : `~${years} years`;
  return `~${years}y ${remMonths}m`;
}
