'use client';

import type { EligibilityStatus, RewardsProgram } from '@ph/shared';

/**
 * PRD §10.6: sort by points value, by issuer, by FF program, by eligibility
 * status. Filter dimensions mirror sort dimensions.
 */

export type SortKey = 'priority' | 'points' | 'issuer' | 'program' | 'status';
export type FilterKey = 'all' | EligibilityStatus | RewardsProgram;

export interface SortFilterValue {
  sort: SortKey;
  filter: FilterKey;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'priority', label: 'Best match' },
  { value: 'points', label: 'Most points' },
  { value: 'issuer', label: 'Issuer A→Z' },
  { value: 'program', label: 'FF program' },
  { value: 'status', label: 'Status' },
];

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'grey_area', label: 'Grey area' },
  { value: 'not_eligible', label: 'Not eligible' },
  { value: 'qantas', label: 'Qantas' },
  { value: 'velocity', label: 'Velocity' },
  { value: 'flexible', label: 'Bank' },
];

export function SortFilterBar({
  value,
  onChange,
}: {
  value: SortFilterValue;
  onChange: (next: SortFilterValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col">
        <span className="sr-only">Sort by</span>
        <select
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as SortKey })}
          aria-label="Sort by"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="sr-only">Filter</span>
        <select
          value={value.filter}
          onChange={(e) => onChange({ ...value, filter: e.target.value as FilterKey })}
          aria-label="Filter by"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              Filter: {f.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const STATUS_PRIORITY: Record<EligibilityStatus, number> = {
  eligible: 0,
  waiting: 1,
  grey_area: 2,
  not_eligible: 3,
};

/**
 * Apply the active sort + filter to a recommendations list. Pure function so
 * it's trivially testable later.
 */
export function applySortFilter<T extends import('@ph/shared').Recommendation>(
  recommendations: T[],
  { sort, filter }: SortFilterValue,
): T[] {
  // Filter
  let out = recommendations;
  if (filter !== 'all') {
    out = out.filter((r) => {
      if (
        filter === 'eligible' ||
        filter === 'waiting' ||
        filter === 'grey_area' ||
        filter === 'not_eligible'
      ) {
        return r.eligibility.status === filter;
      }
      // FF program filter
      if (filter === 'flexible') {
        return r.card.rewardsProgram === 'flexible' || r.card.rewardsProgram === 'bank';
      }
      return r.card.rewardsProgram === filter;
    });
  }

  // Sort
  const sorted = [...out];
  switch (sort) {
    case 'points':
      sorted.sort((a, b) => (b.card.bonusPoints ?? 0) - (a.card.bonusPoints ?? 0));
      break;
    case 'issuer':
      sorted.sort((a, b) => a.card.issuer.name.localeCompare(b.card.issuer.name));
      break;
    case 'program':
      sorted.sort((a, b) => a.card.rewardsProgram.localeCompare(b.card.rewardsProgram));
      break;
    case 'status':
      sorted.sort(
        (a, b) => STATUS_PRIORITY[a.eligibility.status] - STATUS_PRIORITY[b.eligibility.status],
      );
      break;
    case 'priority':
    default:
      sorted.sort((a, b) => b.priority - a.priority);
  }
  return sorted;
}
