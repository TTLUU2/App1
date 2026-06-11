/**
 * Deals filtering, sorting, and date/bonus formatting helpers.
 *
 * Lifted from points-deals/lib/{filter-deals,format,cpp}.ts and merged into
 * a single module (no date-fns dependency — the source repo relied on it for
 * parseISO + differenceInCalendarDays, but we only need ISO-date math).
 *
 * Everything that touches a Bonus, Deal, or date string lives here so the
 * components stay UI-only.
 */

import type { Bonus, Deal, FilterState, LoyaltyProgram, SortKey } from '@/data/deals-types';
import { PROGRAM_SHORT } from '@/data/deals-types';
import { CPP } from '@/data/cpp';

/* ─── Date helpers (replace date-fns) ─────────────────────────────────── */

/** Parse an ISO date string ('YYYY-MM-DD' or full ISO) into a Date. */
function parseISO(iso: string): Date {
  // Append T00:00:00 for bare YYYY-MM-DD to avoid timezone drift on Safari.
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

/** Whole days between two dates, signed (b - a) in calendar days. */
function differenceInCalendarDays(later: Date, earlier: Date): number {
  const a = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const b = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((a - b) / 86_400_000);
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function fmtDayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function fmtDayMonthYear(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/* ─── Bonus formatting ───────────────────────────────────────────────── */

export function formatBonus(bonus: Bonus): string {
  switch (bonus.kind) {
    case 'multiplier':
      return `${bonus.value}x points`;
    case 'bonus-points':
      return `${bonus.value.toLocaleString('en-AU')} bonus points`;
    case 'percent-off':
      return `${bonus.value}% off`;
    case 'percent-bonus':
      return `+${bonus.value}% bonus`;
  }
}

/** Alias for the bonus label used by sort/preview surfaces. */
export const bonusLabel = formatBonus;

export function bonusProgram(bonus: Bonus): LoyaltyProgram | null {
  return 'program' in bonus ? bonus.program : null;
}

/** Returns estimated AUD value in whole dollars (bonus-points only). */
export function estimateValueDollars(bonus: Bonus): number | null {
  if (bonus.kind === 'bonus-points') {
    const cpp = CPP[bonus.program];
    const dollars = (bonus.value * cpp) / 100;
    return dollars >= 1 ? Math.round(dollars) : null;
  }
  return null;
}

/** "≈ $320 est. value" or null. */
export function estimateValueLabel(bonus: Bonus): string | null {
  const d = estimateValueDollars(bonus);
  if (d === null) return null;
  return `≈ $${d.toLocaleString('en-AU')} est. value`;
}

/* ─── Date / expiry helpers ──────────────────────────────────────────── */

export function formatDateRange(startISO: string, endISO: string, now: Date = new Date()): string {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (start <= today && today <= end) {
    return `Ends ${fmtDayMonthYear(end)}`;
  }
  if (today < start) {
    return `Starts ${fmtDayMonth(start)}`;
  }
  return `Ended ${fmtDayMonthYear(end)}`;
}

export function daysUntilEnd(endISO: string, now: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(endISO), now);
}

export function expiryStatus(
  endISO: string,
  now: Date = new Date(),
):
  | { kind: 'active'; daysLeft: number }
  | { kind: 'ending-soon'; daysLeft: number }
  | { kind: 'expired' } {
  const daysLeft = daysUntilEnd(endISO, now);
  if (daysLeft < 0) return { kind: 'expired' };
  if (daysLeft <= 7) return { kind: 'ending-soon', daysLeft };
  return { kind: 'active', daysLeft };
}

export function dealRetailerLabel(deal: Deal): string {
  switch (deal.dealType) {
    case 'gift-card':
      return deal.retailer;
    case 'flyer': {
      const primary = deal.programs[0];
      return deal.airlines?.join(' + ') ?? (primary ? PROGRAM_SHORT[primary] : 'Flyer deal');
    }
    case 'hotel':
      return deal.chain;
  }
}

/* ─── Filter + sort ──────────────────────────────────────────────────── */

/**
 * Normalised score to compare bonuses across kinds. Tuned so a 30k-bonus
 * Velocity offer outranks a 20x Flybuys multiplier.
 */
function bonusWeight(bonus: Bonus): number {
  switch (bonus.kind) {
    case 'bonus-points':
      return bonus.value;
    case 'multiplier':
      return bonus.value * 200;
    case 'percent-off':
      return bonus.value * 150;
    case 'percent-bonus':
      return bonus.value * 250;
  }
}

function isInExpiringWindow(
  endISO: string,
  window: FilterState['expiringWindow'],
  now: Date,
): boolean {
  if (window === 'all') return true;
  const end = parseISO(endISO);
  const ms = end.getTime() - now.getTime();
  const days = ms / 86_400_000;
  if (days < 0) return false;
  if (window === '7d') return days <= 7;
  return days <= 30;
}

export interface FilterOptions {
  /** Hide deals whose endDate is in the past. Default true. */
  hideExpired?: boolean;
}

/**
 * Filter the deal list, then sort. Public API used by the page —
 * renamed from `filterDeals` per the lift spec.
 */
export function filterAndSortDeals(
  deals: Deal[],
  filters: FilterState,
  sort: SortKey,
  now: Date = new Date(),
  options: FilterOptions = {},
): Deal[] {
  const hideExpired = options.hideExpired ?? true;

  const filtered = deals.filter((deal) => {
    if (hideExpired && parseISO(deal.endDate).getTime() < now.getTime()) return false;

    if (filters.dealTypes.length > 0 && !filters.dealTypes.includes(deal.dealType)) {
      return false;
    }

    if (filters.programs.length > 0) {
      const hit = deal.programs.some((p) => filters.programs.includes(p));
      if (!hit) return false;
    }

    if (
      filters.flyerSubtypes.length > 0 &&
      deal.dealType === 'flyer' &&
      !filters.flyerSubtypes.includes(deal.flyerSubtype)
    ) {
      return false;
    }

    if (!isInExpiringWindow(deal.endDate, filters.expiringWindow, now)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case 'ending-soonest':
      sorted.sort((a, b) => parseISO(a.endDate).getTime() - parseISO(b.endDate).getTime());
      break;
    case 'newest':
      sorted.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
      break;
    case 'biggest-bonus':
      sorted.sort((a, b) => bonusWeight(b.bonus) - bonusWeight(a.bonus));
      break;
  }
  return sorted;
}

export function countActiveFilters(filters: FilterState): number {
  return (
    filters.dealTypes.length +
    filters.programs.length +
    filters.flyerSubtypes.length +
    (filters.expiringWindow !== 'all' ? 1 : 0)
  );
}
