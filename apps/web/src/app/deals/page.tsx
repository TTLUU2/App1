'use client';

/**
 * /deals — currently-running points deals for Tab 2.
 *
 * Replaces the M1 PlaceholderScreen. Filter + sort state lives in this
 * component (client-side filtering against the bundled deals.json — no
 * API call needed for v1).
 *
 * UX shape:
 *   - Header with Gift icon (matches the other tabs' header pattern).
 *   - Primary filters (Deal type + Expiring window) rendered inline as
 *     chips/pills at the top — these are the most-used filters and stay
 *     visible.
 *   - "More" button opens a bottom-sheet (FilterSheet) for the advanced
 *     filter set (programs, flyer subtypes) with focus management and
 *     Radix-driven open/close animations.
 *   - SortSelect dropdown sits on the right.
 *   - Empty state has a "Clear filters" affordance.
 */

import { useMemo, useState } from 'react';
import { Gift } from 'lucide-react';
import { cn } from '@/components/deals/cn';
import dealsRaw from '@/data/deals.json';
import { filterAndSortDeals } from '@/lib/filter-deals';
import { DealCard } from '@/components/deals/deal-card';
import { SortSelect } from '@/components/deals/sort-select';
import { EmptyState } from '@/components/deals/empty-state';
import { FilterSheet } from '@/components/deals/filter-sheet';
import {
  DEAL_TYPE_LABELS,
  EMPTY_FILTERS,
  type Deal,
  type DealType,
  type ExpiringWindow,
  type FilterState,
  type SortKey,
} from '@/data/deals-types';

const DEALS = dealsRaw as Deal[];

const DEAL_TYPES: DealType[] = ['gift-card', 'flyer', 'hotel'];

const EXPIRING_OPTIONS: { value: ExpiringWindow; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
];

function toggleDealType(state: FilterState, t: DealType): FilterState {
  const next = state.dealTypes.includes(t)
    ? state.dealTypes.filter((x) => x !== t)
    : [...state.dealTypes, t];
  // Drop flyer-subtypes if flyer is no longer selected — keeps the
  // advanced filter state consistent with the primary one.
  const stillHasFlyer = next.includes('flyer');
  return {
    ...state,
    dealTypes: next,
    flyerSubtypes: stillHasFlyer ? state.flyerSubtypes : [],
  };
}

export default function DealsPage() {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('ending-soonest');

  const visible = useMemo(
    () => filterAndSortDeals(DEALS, filter, sort, new Date()),
    [filter, sort],
  );

  return (
    <main className="px-4 pt-4 pb-24">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Gift className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Deals
        </h1>
        <p className="mt-1 text-xs text-ink-soft">
          Currently-running points deals. Tap a card for the source link, or ask Copilot how to
          maximise.
        </p>
      </header>

      {/* Primary filter row — deal type chips. Always visible because
          deal type is the most common cut. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {DEAL_TYPES.map((t) => {
          const active = filter.dealTypes.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter((f) => toggleDealType(f, t))}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 active:scale-95',
                active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-paper text-ink-soft hover:border-brand/40 hover:text-ink',
              )}
            >
              {DEAL_TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* Secondary inline row — expiring window pills + "More" sheet
          trigger + sort dropdown. Expiring window is the second-most-
          touched filter (users want to see what's about to drop). */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-ink-mute">Expiring</span>
        {EXPIRING_OPTIONS.map((opt) => {
          const active = filter.expiringWindow === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, expiringWindow: opt.value }))}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-150 active:scale-95',
                active
                  ? 'border-navy bg-navy text-white shadow-sm'
                  : 'border-line bg-paper text-ink-soft hover:border-navy/40 hover:text-ink',
              )}
            >
              {opt.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <FilterSheet
            filters={filter}
            onChange={setFilter}
            onClear={() => setFilter(EMPTY_FILTERS)}
          />
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState onClear={() => setFilter(EMPTY_FILTERS)} />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      )}
    </main>
  );
}
