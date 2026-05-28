'use client';

import type { Recommendation } from '@ph/shared';
import { Clock } from 'lucide-react';
import { CardRow } from './card-row';

/**
 * PRD §10.2.3: time-ordered list of cards the user becomes eligible for in
 * future (status 'waiting'), sorted by daysRemaining ascending.
 */
export function UpcomingList({ recommendations }: { recommendations: Recommendation[] }) {
  const waiting = recommendations
    .filter((r) => r.eligibility.status === 'waiting')
    .sort((a, b) => (a.eligibility.daysRemaining ?? 0) - (b.eligibility.daysRemaining ?? 0));

  if (waiting.length === 0) return null;

  return (
    <section aria-labelledby="upcoming-heading">
      <h2
        id="upcoming-heading"
        className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
      >
        <Clock className="h-3 w-3" aria-hidden />
        Upcoming
      </h2>
      <ul className="mt-2 space-y-2">
        {waiting.map((r) => (
          <li key={r.card.id}>
            <CardRow rec={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}
