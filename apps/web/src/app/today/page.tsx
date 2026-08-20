// /today — the daily-brief anchor. Reached from the header ⌂ icon
// (top-right cluster, added in Phase 3). Replaces the old /home?view=
// score entry point; /home now redirects here.
//
// This page owns nothing of its own visual language yet — the ScoreView
// content is preserved verbatim from the pre-Lacquer /home so nothing
// visibly regresses during the nav-shell cutover. Phase 4 will rebuild
// the greeting header (mono date eyebrow + serif greeting), swap the
// score card for a HeroCard, and route DoToday items through the
// Alert Centre model rather than the raw feed filter.

import { Suspense } from 'react';
import { ScoreView } from '@/components/home/score-view';

const USER_NAME = 'Tin';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage() {
  return (
    <main className="px-4 pt-4 pb-32">
      <Header />
      <Suspense fallback={<div aria-busy="true" />}>
        <ScoreView />
      </Suspense>
    </main>
  );
}

function Header() {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const greeting = greetingForHour(now.getHours());
  return (
    <header className="mb-4">
      <h1 className="text-xl font-semibold tracking-tight">
        {greeting}, {USER_NAME}
      </h1>
      <p className="mt-1 text-xs text-zinc-500">{dateLabel}</p>
    </header>
  );
}
