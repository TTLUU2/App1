import { redirect } from 'next/navigation';

// /home — folded into /today + /journeys during the Phase 3 nav shell
// cutover (Decision #33). Old deep links from TestFlight build 27 and
// bookmarks still land somewhere sensible:
//
//   /home                  → /today
//   /home?view=score       → /today
//   /home?view=journeys    → /journeys
//
// Any other ?view value falls through to /today — same behaviour as
// the pre-Lacquer HomeShell which treated non-'journeys' as 'score'.

export default async function HomeIndex({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = (await searchParams).view;
  redirect(view === 'journeys' ? '/journeys' : '/today');
}
