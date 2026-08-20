'use client';

// /optimisation — Optimise tab shell with two sub-tabs (Phase 4b + 4c,
// Decision #33, HANDOFF § Second level).
//
//   ?tab=cards (default) → YourCardsView  — min-spend pace anchor
//   ?tab=next            → NextCardView   — best-move + ranked list
//
// Route replaced wholesale from the pre-Lacquer PRD-§9 layout. Old
// components under apps/web/src/components/tab3/* remain in the tree
// as dead code for now — they'll be swept in Phase 6 once every
// Optimise-adjacent feature (Cancel confirm, Three-month CTA, etc.)
// has a Lacquer replacement.

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const tab: OptimiseTab = params.get('tab') === 'next' ? 'next' : 'cards';

  function switchTo(next: OptimiseTab) {
    // scroll: false so the segmented thumb slide doesn't get overrun
    // by the browser's default "scroll to top on route change".
    router.replace(next === 'cards' ? '/optimisation' : `/optimisation?tab=${next}`, {
      scroll: false,
    });
  }

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
            onChange={switchTo}
            ariaLabel="Optimise view"
          />
        </div>

        {tab === 'cards' ? <YourCardsView /> : <NextCardView />}
      </div>
    </main>
  );
}
