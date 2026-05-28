'use client';

import { Sparkles, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUserCardsStore } from '@/store/user-cards';
import { selectRecommendations } from '@/store/user-cards';
import { BestMoveHero } from '@/components/next-card/best-move-hero';
import { EligibleSummary } from '@/components/next-card/eligible-summary';
import { UpcomingList } from '@/components/next-card/upcoming-list';
import { CollapsibleSection } from '@/components/next-card/collapsible-section';
import { CardRow } from '@/components/next-card/card-row';
import {
  SortFilterBar,
  applySortFilter,
  type SortFilterValue,
} from '@/components/next-card/sort-filter-bar';
import { ProgramPills } from '@/components/next-card/program-pills';
import { TripleTapHeader } from '@/components/triple-tap-header';

/**
 * Tab 4 — Next Card (PRD §10). Reads from the Zustand store; the engine
 * recomputes on every render off the in-memory UserCard array (fast: ~33
 * cards × <1ms each, well inside the §19.1 budget of <=300ms).
 */
export default function NextCardPage() {
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);

  // Recompute recommendations on every store change. Cheap; see file header.
  const recommendations = useMemo(
    () => selectRecommendations({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );

  const [sortFilter, setSortFilter] = useState<SortFilterValue>({
    sort: 'priority',
    filter: 'all',
  });
  const filtered = useMemo(
    () => applySortFilter(recommendations, sortFilter),
    [recommendations, sortFilter],
  );

  // Hero is always rank #1 from the unfiltered, priority-sorted list.
  const hero = recommendations[0];

  // Group the filtered list into eligible / waiting / grey / not_eligible
  // sections.
  const eligible = filtered.filter((r) => r.eligibility.status === 'eligible');
  const waiting = filtered.filter((r) => r.eligibility.status === 'waiting');
  const grey = filtered.filter((r) => r.eligibility.status === 'grey_area');
  const notEligible = filtered.filter((r) => r.eligibility.status === 'not_eligible');

  return (
    <main className="flex-1 px-4 pb-6 pt-4">
      <TripleTapHeader>
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Next Card
        </h1>
      </TripleTapHeader>

      {!loaded && <p className="mt-6 text-sm text-zinc-500">Loading your card history…</p>}

      {loaded && hero && (
        <>
          <div className="mt-3">
            <BestMoveHero rec={hero} />
          </div>

          <div className="mt-6">
            <EligibleSummary recommendations={recommendations} />
          </div>

          <div className="mt-6 space-y-2">
            <SortFilterBar value={sortFilter} onChange={setSortFilter} />
            <ProgramPills
              value={sortFilter.filter}
              onChange={(next) => setSortFilter({ ...sortFilter, filter: next })}
            />
          </div>

          {sortFilter.filter === 'all' ? (
            <>
              {/* Default view: grouped sections. */}
              {waiting.length > 0 && (
                <div className="mt-6">
                  <UpcomingList recommendations={waiting} />
                </div>
              )}
              {eligible.length > 0 && (
                <div className="mt-6">
                  <h2 className="px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    All eligible · {eligible.length}
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {eligible.map((r) => (
                      <li key={r.card.id}>
                        <CardRow rec={r} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {grey.length > 0 && (
                <div className="mt-6">
                  <CollapsibleSection heading="Grey area" items={grey} />
                </div>
              )}
              {notEligible.length > 0 && (
                <div className="mt-6">
                  <CollapsibleSection heading="Not eligible" items={notEligible} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              <ul className="space-y-2">
                {filtered.map((r) => (
                  <li key={r.card.id}>
                    <CardRow rec={r} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {loaded && !hero && (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            No catalogue cards available — check the bundled data files.
          </p>
        </div>
      )}

      {loaded && userCards.length === 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            With zero cards in your history, every catalogue card shows as eligible. Tap the red +
            below to add cards you&apos;ve held.
          </p>
          <Link
            href="/add-card"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ph-red)] hover:underline"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Add card to history
          </Link>
        </div>
      )}
    </main>
  );
}
