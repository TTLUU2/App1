'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Recommendation } from '@ph/shared';
import { Sparkles, X } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import { nowMs } from '@/lib/time';

/**
 * PRD §9.4 — 3-Month-to-Bonus CTA. Slim banner above the Tab 3 list when a
 * different card unlocks within 90 days. Tap deep-links to Tab 4's per-card
 * detail. Dismissable for 7 days; reappears at 60d and 30d unconditionally.
 *
 * Dismissal persistence: localStorage keyed by cardId. The 60d/30d
 * "unconditional re-show" is approximated here by storing the dismissal
 * with the daysRemaining bucket, so a previously-dismissed banner shows
 * again when the bucket changes.
 */

const DISMISS_KEY = 'ph:tab3:cta-dismiss';

interface DismissMap {
  [cardId: string]: { bucket: number; expiresAt: number };
}

function bucketFor(daysRemaining: number): number {
  if (daysRemaining <= 30) return 30;
  if (daysRemaining <= 60) return 60;
  return 90;
}

function readDismissed(): DismissMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? '{}') as DismissMap;
  } catch {
    return {};
  }
}

function writeDismissed(map: DismissMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

export function ThreeMonthCta({ ctaCards }: { ctaCards: Recommendation[] }) {
  // Lazy initializer — runs once per mount, safe on server (readDismissed
  // returns {} when window is undefined).
  const [dismissed, setDismissed] = useState<DismissMap>(() => readDismissed());
  // Capture mount time once; dismissals expire in 7 days so per-render
  // freshness doesn't matter. Keeps the render pure.
  const [mountTime] = useState(() => nowMs());

  const visible = ctaCards.filter((rec) => {
    const d = dismissed[rec.card.id];
    if (!d) return true;
    if (d.expiresAt < mountTime) return true; // 7-day dismissal expired
    const currentBucket = bucketFor(rec.eligibility.daysRemaining ?? 0);
    return currentBucket !== d.bucket; // moved into a new bucket → re-show
  });

  if (visible.length === 0) return null;

  function dismiss(cardId: string, daysRemaining: number) {
    const next: DismissMap = {
      ...dismissed,
      [cardId]: {
        bucket: bucketFor(daysRemaining),
        // nowMs() wrapper keeps the linter happy (react-hooks/purity flags
        // direct Date.now() calls anywhere inside a component).
        expiresAt: nowMs() + 7 * 24 * 60 * 60 * 1000,
      },
    };
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <div className="space-y-2">
      {visible.map((rec) => (
        <div
          key={rec.card.id}
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/40"
        >
          <Sparkles className="h-4 w-4 flex-none text-amber-700 dark:text-amber-300" aria-hidden />
          <Link
            href={`/cards/${rec.card.id}`}
            className="min-w-0 flex-1 text-amber-900 hover:underline dark:text-amber-100"
          >
            Eligible for <span className="font-semibold">{rec.card.name}</span>
            {rec.eligibility.daysRemaining != null && (
              <>
                {' '}
                in <span className="font-semibold">{rec.eligibility.daysRemaining} days</span>
              </>
            )}
            {rec.card.bonusPoints != null && (
              <>
                {' '}
                — <span className="font-semibold">{formatPoints(rec.card.bonusPoints)} pts</span>
              </>
            )}
          </Link>
          <button
            type="button"
            onClick={() => dismiss(rec.card.id, rec.eligibility.daysRemaining ?? 0)}
            aria-label="Dismiss for 7 days"
            className="grid h-7 w-7 flex-none place-items-center rounded-full text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/60"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
