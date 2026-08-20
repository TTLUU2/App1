import { redirect } from 'next/navigation';

// /balances — folded into Journeys as a sub-tab during Phase 4e
// (Decision #33). Redirect preserves any bookmark or TestFlight
// build-27 deep link. The Journeys tab in the bar picks up.

export default function BalancesIndex() {
  redirect('/journeys?tab=balances');
}
