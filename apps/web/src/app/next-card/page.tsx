'use client';

import { Sparkles, PlusCircle, Sliders } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUserCardsStore } from '@/store/user-cards';
import { selectRecommendations, selectUserCardsWithDetails } from '@/store/user-cards';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { BestMoveHero } from '@/components/next-card/best-move-hero';
import { EligibilityBanner } from '@/components/next-card/eligibility-banner';
import { EligibleSummary } from '@/components/next-card/eligible-summary';
import { Clock, List, GalleryHorizontalEnd } from 'lucide-react';
import { CollapsibleSection } from '@/components/next-card/collapsible-section';
import { CardRow } from '@/components/next-card/card-row';
import {
  SortFilterBar,
  applySortFilter,
  type SortFilterValue,
} from '@/components/next-card/sort-filter-bar';
import { ProgramPills } from '@/components/next-card/program-pills';
import { PreferencesModal } from '@/components/next-card/preferences-modal';
import { HiddenByPrefsChip } from '@/components/next-card/hidden-by-prefs-chip';
import { SwiperView } from '@/components/next-card/swiper-view';
import { TripleTapHeader } from '@/components/triple-tap-header';

/**
 * Tab 4 — Next Card (PRD §10). Reads from the Zustand store; the engine
 * recomputes on every render off the in-memory UserCard array (fast: ~33
 * cards × <1ms each, well inside the §19.1 budget of <=300ms).
 */
export default function NextCardPage() {
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  // Pull current preferences so the engine can bias ranking. Subscribing
  // here means edits to preferences (via the prefs modal) re-rank Tab 4
  // immediately, no refresh.
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const prefsLoaded = useUserPreferencesStore((s) => s.loaded);

  // Recompute recommendations on every store change. Cheap; see file header.
  const recommendations = useMemo(
    () => selectRecommendations({ userCards, loaded, error: null } as never, preferences),
    [userCards, loaded, preferences],
  );

  // All user cards (held + cancelled) — needed by the eligibility banner
  // to surface the bridge between Tab 3 history and Tab 4 eligibility in
  // one sentence.
  const allUserCards = useMemo(
    () => selectUserCardsWithDetails({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );

  const [sortFilter, setSortFilter] = useState<SortFilterValue>({
    sort: 'priority',
    filter: 'all',
  });
  // List vs swiper. Swiper renders one eligible card at a time with
  // bigger context — counters decision fatigue. Sticks to the eligible
  // list only (Upcoming / Grey / Not-eligible stay in list view because
  // they're reference info, not decision info).
  const [viewMode, setViewMode] = useState<'list' | 'swiper'>('list');
  const filtered = useMemo(
    () => applySortFilter(recommendations, sortFilter),
    [recommendations, sortFilter],
  );

  // Preferences modal — open when user explicitly taps the chip, OR
  // auto-open once on first visit (after both stores hydrate) if the user
  // has never been prompted. Stops the user from staring at unfiltered
  // 30-card lists wondering why the ranking is what it is.
  const promptedAt = useUserPreferencesStore((s) => s.promptedAt);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useEffect(() => {
    if (!prefsLoaded || !loaded) return;
    if (promptedAt) return; // already prompted at least once
    setPrefsOpen(true);
  }, [prefsLoaded, loaded, promptedAt]);

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
          {/* Eligibility banner — one-line bridge between Tab 3 history
              (active + cancelled counts) and Tab 4 future (eligible now,
              next unlock). Lives above the prefs chip so the user reads
              "where I stand" before "what filters are applied to it". */}
          <div className="mt-3">
            <EligibilityBanner allCards={allUserCards} recommendations={recommendations} />
          </div>

          {/* Preferences chip — shows current settings, taps to edit. Sits
              above the hero so the user sees the filter context that's
              shaping the recommendation below. */}
          <div className="mt-2 flex items-center justify-between gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <Sliders className="h-3.5 w-3.5" aria-hidden />
              Preferences:
            </span>
            <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
              {summarisePrefs(preferences)}
            </span>
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Edit
            </button>
          </div>

          {/* Honesty chip — surfaces how many catalogue cards are being
              filtered out by the card-type pref, so the user knows the
              ranking isn't missing recommendations silently. Renders
              nothing when nothing is hidden. */}
          <div className="mt-2">
            <HiddenByPrefsChip cardType={preferences.cardType} onClick={() => setPrefsOpen(true)} />
          </div>

          <div className="mt-3">
            <BestMoveHero rec={hero} />
          </div>

          <div className="mt-6">
            <EligibleSummary
              recommendations={recommendations}
              activeFilter={sortFilter.filter}
              onFilterChange={(next) => setSortFilter({ ...sortFilter, filter: next })}
            />
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SortFilterBar value={sortFilter} onChange={setSortFilter} />
              </div>
              {/* List ↔ Swiper toggle. Disabled when filter !== 'all' so
                  the swiper always operates on the canonical priority
                  ranking, not a sub-filter. */}
              <div className="flex flex-none overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  className={
                    viewMode === 'list'
                      ? 'grid h-8 w-8 place-items-center bg-[var(--color-ph-red)] text-white'
                      : 'grid h-8 w-8 place-items-center bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }
                >
                  <List className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('swiper')}
                  aria-pressed={viewMode === 'swiper'}
                  aria-label="Swiper view"
                  className={
                    viewMode === 'swiper'
                      ? 'grid h-8 w-8 place-items-center bg-[var(--color-ph-red)] text-white'
                      : 'grid h-8 w-8 place-items-center bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }
                >
                  <GalleryHorizontalEnd className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <ProgramPills
              value={sortFilter.filter}
              onChange={(next) => setSortFilter({ ...sortFilter, filter: next })}
            />
          </div>

          {viewMode === 'swiper' ? (
            // Swiper view: focus mode on the eligible list only. Upcoming
            // / Grey / Not-eligible are reference info, not decision info,
            // so they don't appear here.
            <div className="mt-4">
              <SwiperView items={eligible} />
            </div>
          ) : (
            <>
              {/* Default view: grouped sections. Eligible is open by
                  default — that's the daily focus. Upcoming / Grey /
                  Not-eligible all collapsed for visual quiet. */}
              {eligible.length > 0 && (
                <div className="mt-6">
                  <h2 className="px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    All eligible · {eligible.length}
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {eligible.map((r, i) => (
                      <li key={r.card.id}>
                        {/* rank=i+1 drives the "Top pick" prefix in the
                            "why this card" line — only meaningful for
                            eligible cards. */}
                        <CardRow rec={r} rank={i + 1} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {waiting.length > 0 && (
                <div className="mt-6">
                  <CollapsibleSection heading="Upcoming" items={waiting} icon={Clock} />
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

      {prefsOpen && <PreferencesModal onClose={() => setPrefsOpen(false)} />}
    </main>
  );
}

// Short human-readable summary of the user's current preferences, shown
// on the chip. e.g. "Qantas · Velocity · Personal only" or "All programs ·
// Personal only" when no programs selected.
function summarisePrefs(prefs: {
  preferredPrograms: string[];
  cardType: 'personal' | 'personal_and_business' | 'business';
}): string {
  const programLabels: Record<string, string> = {
    qantas: 'Qantas',
    velocity: 'Velocity',
    flexible: 'Amex',
    bank: 'Bank',
  };
  const cardTypeLabels: Record<string, string> = {
    personal: 'Personal',
    personal_and_business: 'Personal + Business',
    business: 'Business',
  };
  const programPart =
    prefs.preferredPrograms.length === 0
      ? 'All programs'
      : prefs.preferredPrograms.map((p) => programLabels[p] ?? p).join(' · ');
  return `${programPart} · ${cardTypeLabels[prefs.cardType] ?? prefs.cardType}`;
}
