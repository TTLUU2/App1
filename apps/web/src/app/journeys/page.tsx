'use client';

// /journeys — Journeys tab shell with two sub-tabs (Phase 4d + 4e,
// Decision #33, HANDOFF § Second level).
//
//   ?tab=destinations (default) → DestinationsView
//   ?tab=balances               → BalancesView
//
// See /optimisation/page.tsx for the state-model rationale — same
// local-useState + history.replaceState pattern here for the same
// Next 16 useSearchParams re-render caveat.

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/lacquer';
import { DestinationsView } from '@/components/journeys/destinations-view';
import { BalancesView } from '@/components/journeys/balances-view';

type JourneysTab = 'destinations' | 'balances';

const TAB_ITEMS: { id: JourneysTab; label: string }[] = [
  { id: 'destinations', label: 'Destinations' },
  { id: 'balances', label: 'Balances' },
];

export default function JourneysPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-ph-paper" aria-busy="true" />}>
      <JourneysShell />
    </Suspense>
  );
}

function JourneysShell() {
  const params = useSearchParams();
  const initialTab: JourneysTab = params.get('tab') === 'balances' ? 'balances' : 'destinations';
  const [tab, setTab] = useState<JourneysTab>(initialTab);

  useEffect(() => {
    const url = tab === 'destinations' ? '/journeys' : `/journeys?tab=${tab}`;
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
          <h1 className="font-serif text-[28px] leading-none text-ph-ink">Journeys</h1>
        </header>

        <div className="mt-4">
          <SegmentedControl<JourneysTab>
            items={TAB_ITEMS}
            activeId={tab}
            onChange={setTab}
            ariaLabel="Journeys view"
          />
        </div>

        {tab === 'destinations' ? <DestinationsView /> : <BalancesView />}
      </div>
    </main>
  );
}
