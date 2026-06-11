'use client';

// PerryFAB — universal Copilot entry point. A floating mascot button
// rendered at the layout level so it appears on every screen except
// /ask itself (where the chat surface IS the conversation, so an entry
// affordance is redundant).
//
// Visual:
//   - Perry himself (no background circle), with a soft drop-shadow so
//     he's visible on both light and dark pages.
//   - A speech bubble sits above-and-to-the-right with a friendly
//     prompt, giving Perry presence + personality. The bubble has a
//     small tail pointing toward Perry.
//   - The whole thing gently bobs up-and-down (3.4s loop) for the
//     "hovering plane" feel. Perry's eyes blink on their own (5s loop,
//     baked into PerryIcon's CSS).
//
// Behaviour:
//   - Tap anywhere on the cluster (Perry OR bubble) → routes to /ask.
//   - Hides on /ask and /ask/* (no point showing the entry while the
//     user is inside the destination).
//   - Positioned bottom-left (opposite the centre red FAB) so the two
//     affordances don't compete for the same thumb zone. Sits above
//     the tab bar + the iPhone home-indicator safe area.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PerryIcon } from './perry-icon';

export function PerryFAB() {
  const pathname = usePathname();
  // Hide when already on the chat surface — no reason to surface an
  // entry point when you're inside the destination.
  if (pathname === '/ask' || pathname.startsWith('/ask/')) return null;

  return (
    <>
      <style>{`
        @keyframes perry-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .perry-fab-bob {
          animation: perry-bob 3.4s ease-in-out infinite;
        }
      `}</style>

      <Link
        href="/ask"
        aria-label="Ask the Copilot"
        className="perry-fab-bob fixed left-3 z-40 flex flex-col items-start gap-1.5"
        style={{
          // Sit above the bottom nav (h-16 + iPhone safe area).
          bottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Speech bubble — sits above Perry, tail anchored at his head.
            Aussie-friendly tone matching the Copilot system prompt persona. */}
        <div className="relative ml-1 max-w-[180px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[11px] font-medium leading-snug text-zinc-700 shadow-md ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
          G&apos;day! Got a points question?
          {/* Tail — small rotated square forming the speech-bubble pointer
              toward Perry below. Matches bubble bg + ring colours. */}
          <span
            aria-hidden
            className="absolute -bottom-1 left-3 h-2 w-2 rotate-45 bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
          />
        </div>

        {/* Perry — naked, no background ring. Drop-shadow gives him weight
            on light pages where the cream body would otherwise vanish. */}
        <div className="ml-1 transition-transform hover:scale-105 active:scale-95 [filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.18))]">
          <PerryIcon size={60} />
        </div>
      </Link>
    </>
  );
}
