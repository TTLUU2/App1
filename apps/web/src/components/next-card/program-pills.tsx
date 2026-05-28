'use client';

// Quick-access program-cluster filter pills for Tab 4 (Next Card).
// Sits beneath the sort + filter dropdowns and lets users one-tap between
// All / Qantas / Velocity / Bank without opening the filter dropdown.
// Bound to the same filter state — tapping a pill is equivalent to picking
// the corresponding option in the filter <select>.

import clsx from 'clsx';
import type { FilterKey } from './sort-filter-bar';

interface Pill {
  key: FilterKey;
  label: string;
  /** Tailwind classes for the active state — coloured by program. */
  active: string;
}

const PILLS: Pill[] = [
  {
    key: 'all',
    label: 'All',
    active: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  },
  {
    key: 'qantas',
    label: 'Qantas',
    active: 'bg-rose-600 text-white',
  },
  {
    key: 'velocity',
    label: 'Velocity',
    active: 'bg-purple-600 text-white',
  },
  {
    key: 'flexible',
    label: 'Bank',
    active: 'bg-sky-600 text-white',
  },
];

export function ProgramPills({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (next: FilterKey) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Filter by program" className="flex flex-wrap gap-1.5">
      {PILLS.map((pill) => {
        const active = value === pill.key;
        return (
          <button
            key={pill.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(pill.key)}
            className={clsx(
              'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)]',
              active
                ? pill.active
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
            )}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
