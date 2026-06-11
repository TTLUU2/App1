'use client';

import { useEffect, useMemo, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { getAllBenefits } from '@ph/shared';
import {
  selectRecommendations,
  selectUserCardsWithDetails,
  useUserCardsStore,
} from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { benefitStatusFor, computeSummary, threeMonthCtaCards } from '@/lib/tab3-status';
import { SummaryHeader } from '@/components/tab3/summary-header';
import { ThreeMonthCta } from '@/components/tab3/three-month-cta';
import { HeldCardRow } from '@/components/tab3/held-card-row';
import { CardUpdateCard } from '@/components/tab3/card-update-card';
import { NotificationsCard } from '@/components/notifications-card';
import { TripleTapHeader } from '@/components/triple-tap-header';
import { cancelSpeech, speak } from '@/lib/tts';
import Link from 'next/link';

/**
 * Tab 3 — Card Optimisation (PRD §9). All client-side: status, projections,
 * and the 3-month-to-bonus CTA derive from the same in-memory stores that
 * Tab 4 reads. Acceptance criteria §9.5: no spinners, no network, deterministic.
 */
export default function OptimisationPage() {
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  const redemptions = useUserBenefitsStore((s) => s.redemptions);

  const allCards = useMemo(
    () => selectUserCardsWithDetails({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );
  const allBenefits = useMemo(() => getAllBenefits(), []);
  const heldCards = useMemo(() => allCards.filter((c) => !c.cancellationDate), [allCards]);

  // Build a benefit-status map for the summary.
  const benefitStatusByCard = useMemo(() => {
    const map = new Map<string, ReturnType<typeof benefitStatusFor>[]>();
    for (const uc of allCards) {
      const cardBenefits = allBenefits.filter((b) => b.cardId === uc.cardId);
      map.set(
        uc.id,
        cardBenefits.map((b) => benefitStatusFor(b, uc, redemptions)),
      );
    }
    return map;
  }, [allCards, allBenefits, redemptions]);

  const summary = useMemo(
    () => computeSummary(allCards, benefitStatusByCard),
    [allCards, benefitStatusByCard],
  );

  // Threading preferences here so Tab 3's "3-month bonus" CTA list also
  // respects card-type filter + program boost. Otherwise a personal-only
  // user could see a business card recommended on Tab 3 but hidden on Tab 4.
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const recommendations = useMemo(
    () => selectRecommendations({ userCards, loaded, error: null } as never, preferences),
    [userCards, loaded, preferences],
  );
  const ctaCards = useMemo(() => threeMonthCtaCards(recommendations), [recommendations]);

  // Home-screen mount greeting — fires once per visit so the user hears
  // what's possible without tapping anything. Different copy for empty
  // state vs. has-cards so the prompt matches the action surface visible
  // below. Held until cards load so we don't greet then say something
  // contradictory.
  //
  // Intentionally NO cleanup function: React 19 StrictMode double-fires
  // effects in dev (run → cleanup → run again), and a `cancelSpeech()` in
  // cleanup would kill the audio between the two runs and we'd hear
  // nothing. Any subsequent screen's speak() cancels the in-flight audio
  // via lib/tts.ts internal cancelSpeech, so worst case is a one-second
  // overlap on fast navigation.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current || !loaded) return;
    greetedRef.current = true;
    if (heldCards.length === 0) {
      void speak(
        'Welcome to Point Hacks Copilot. Tap the plus button below to add your first card.',
      );
    } else {
      void speak(
        'Hi. Tap the mic to update spend or mark a benefit used. Or use the plus button to add a card or ask me anything.',
      );
    }
  }, [loaded, heldCards.length]);

  return (
    <main className="flex-1 px-4 pb-6 pt-4">
      <TripleTapHeader>
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingUp className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Card Optimisation
        </h1>
      </TripleTapHeader>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Track spend against minimum-spend targets, mark benefits as used, and ask Copilot anything
        about your active cards.
      </p>

      {!loaded && <p className="mt-6 text-sm text-zinc-500">Loading your cards…</p>}

      {loaded && (
        <>
          <div className="mt-4">
            <SummaryHeader stats={summary} />
          </div>

          {/* Copilot — big mic primary, text fallback. Voice-first inline
              assistant: spend, benefit, or general question (parser decides). */}
          {heldCards.length > 0 && (
            <div className="mt-4">
              <CardUpdateCard />
            </div>
          )}

          {ctaCards.length > 0 && (
            <div className="mt-4">
              <ThreeMonthCta ctaCards={ctaCards} />
            </div>
          )}

          {heldCards.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="mt-4 space-y-3">
              {heldCards.map((uc) => (
                <li key={uc.id}>
                  <HeldCardRow uc={uc} benefits={allBenefits} redemptions={redemptions} />
                </li>
              ))}
            </ul>
          )}

          {/* Push notifications opt-in — placed after the card list so it
              doesn't elbow the primary workflow but is still visible. */}
          <div className="mt-4">
            <NotificationsCard />
          </div>
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">No active cards yet.</p>
      <p className="mt-1 text-xs text-zinc-500">
        Add a card via the red + below to start tracking spend and benefits.
      </p>
      <Link
        href="/add-card"
        className="mt-3 inline-block rounded-full bg-[var(--color-ph-red)] px-4 py-1.5 text-xs font-medium text-white"
      >
        Add card
      </Link>
    </div>
  );
}
