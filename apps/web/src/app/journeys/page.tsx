import { redirect } from 'next/navigation';

/**
 * /journeys — consolidated into the Home toggle. The standalone page
 * showed the same content as /home?view=journeys, so we redirect
 * here to keep every existing entry point working without a 404.
 *
 * Routes still pointing at /journeys:
 *   - Wizard "Start tracking" → after creating a tracked journey
 *   - Wizard "Not now" link
 *   - Home Journeys view "See all" link
 *   - Any deep link a user shared
 *
 * Removed deliberately: the duplicate Journeys landing UI. The
 * single source of truth now lives in /home/page.tsx's JourneysView.
 */
export default function JourneysIndex() {
  redirect('/home?view=journeys');
}
