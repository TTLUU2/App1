import { redirect } from 'next/navigation';

// /next-card — folded into Optimise as a sub-tab during Phase 4c
// (Decision #33). Redirect preserves any bookmark or TestFlight
// build-27 deep link. The Optimise tab in the bar picks up.

export default function NextCardIndex() {
  redirect('/optimisation?tab=next');
}
