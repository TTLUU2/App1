'use client';

import type { SortKey } from '@/data/deals-types';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ending-soonest', label: 'Ending soonest' },
  { value: 'newest', label: 'Newest' },
  { value: 'biggest-bonus', label: 'Biggest bonus' },
];

interface SortSelectProps {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-mute">
      <span>Sort</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortKey)}
          className="appearance-none rounded-full border border-line bg-paper py-1.5 pl-3 pr-8 text-sm font-medium text-ink hover:border-navy/40 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink-mute"
        >
          <path
            d="M3 4.5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
