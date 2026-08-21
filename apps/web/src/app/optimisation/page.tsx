'use client';

// /optimisation — Optimise tab shell with two sub-tabs (Phase 4b + 4c,
// Decision #33, HANDOFF § Second level).
//
//   ?tab=cards (default) → YourCardsView  — min-spend pace anchor
//   ?tab=next            → NextCardView   — best-move + ranked list
//
// State model: local useState is the source of truth for the toggle,
// seeded from ?tab once on mount. The URL still updates on switch
// (deep-link-shareable), but the render doesn't depend on
// useSearchParams re-firing — Next 16 App Router with
// router.replace({scroll:false}) is unreliable at re-emitting
// useSearchParams when only the query string changes, which is
// exactly the shape our toggle produces.

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/lacquer';
import { YourCardsView } from '@/components/optimise/your-cards-view';
import { NextCardView } from '@/components/optimise/next-card-view';

type OptimiseTab = 'cards' | 'next';

const TAB_ITEMS: { id: OptimiseTab; label: string }[] = [
  { id: 'cards', label: 'Your cards' },
  { id: 'next', label: 'Next card' },
];

export default function OptimisationPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-ph-paper" aria-busy="true" />}>
      <OptimisationShell />
    </Suspense>
  );
}

function OptimisationShell() {
  const params = useSearchParams();
  const initialTab: OptimiseTab = params.get('tab') === 'next' ? 'next' : 'cards';
  const [tab, setTab] = useState<OptimiseTab>(initialTab);

  // Keep the URL in sync with local state so deep-links + browser
  // refresh preserve the sub-tab. history.replaceState avoids a
  // router-level re-render (which is exactly what tripped up the
  // previous router.replace + useSearchParams pairing).
  useEffect(() => {
    const url = tab === 'cards' ? '/optimisation' : `/optimisation?tab=${tab}`;
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== url
    ) {
      window.history.replaceState(null, '', url);
    }
  }, [tab]);

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
        <header>
          <h1 className="font-serif text-[28px] leading-none text-ph-ink">Optimise</h1>
        </header>

        <div className="mt-4">
          <SegmentedControl<OptimiseTab>
            items={TAB_ITEMS}
            activeId={tab}
            onChange={setTab}
            ariaLabel="Optimise view"
          />
        </div>

        {tab === 'cards' ? <YourCardsView /> : <NextCardView />}
      </div>
    </main>
  );
}
