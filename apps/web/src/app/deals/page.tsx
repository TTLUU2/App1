'use client';

/**
 * /deals — currently-running points deals for Tab 2.
 *
 * Replaces the M1 PlaceholderScreen. Filter + sort state lives in this
 * component (client-side filtering against the bundled deals.json — no
 * API call needed for v1).
 */

import { useMemo, useState } from 'react';
import dealsRaw from '@/data/deals.json';
import { filterAndSortDeals } from '@/lib/filter-deals';
import { DealCard } from '@/components/deals/deal-card';
import { FilterControls } from '@/components/deals/filter-controls';
import { SortSelect } from '@/components/deals/sort-select';
import { EmptyState } from '@/components/deals/empty-state';
import { EMPTY_FILTERS, type Deal, type FilterState, type SortKey } from '@/data/deals-types';

const DEALS = dealsRaw as Deal[];

export default function DealsPage() {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('ending-soonest');
  const [showFilters, setShowFilters] = useState(false);

  const visible = useMemo(
    () => filterAndSortDeals(DEALS, filter, sort, new Date()),
    [filter, sort],
  );

  return (
    <main className="px-4 pt-4 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-ink">Deals</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Currently-running points deals. Tap a card for the source link, or ask Copilot how to
          maximise.
        </p>
      </header>

      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink-soft hover:border-navy/40 hover:text-ink"
          aria-expanded={showFilters}
        >
          {showFilters ? 'Hide filters' : 'Filters'}
        </button>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {showFilters && (
        <div className="mb-4 rounded-card border border-line bg-paper-warm/40 p-4">
          <FilterControls filters={filter} onChange={setFilter} />
        </div>
      )}

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
