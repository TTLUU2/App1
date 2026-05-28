// Root route redirects to Tab 3 (Card Optimisation). Tab 4 (Next Card)
// now lives at /next-card. UX call — most users open the app to see their
// held cards, not the recommendation hero.

import { redirect } from 'next/navigation';

export default function RootRedirect(): never {
  redirect('/optimisation');
}
