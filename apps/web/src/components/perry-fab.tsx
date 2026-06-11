'use client';

// PerryFAB — universal Copilot entry point. A floating mascot button
// rendered at the layout level so it appears on every screen except
// /ask itself (where the chat surface IS the conversation, so an entry
// affordance is redundant).
//
// Tap → navigates to /ask. Combined with the inline-Copilot path on
// Tab 3 + the "Continue in chat" handoff from inline answers, this
// makes /ask a true universal chat surface reachable from anywhere.
//
// Positioned bottom-left (opposite the centre red FAB) so the two
// affordances don't compete for the same thumb zone. Sits above the
// tab bar + the iPhone home-indicator safe area.
//
// Animation: the eyes blink (inherited from PerryIcon's keyframe) and
// the whole button gently bobs up-and-down — the "hovering plane"
// feel the user asked for, matching the points-genie mascot vibe.

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
        className="perry-fab-bob fixed left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#1a4e6b] shadow-lg ring-2 ring-white/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1a4e6b]/40 dark:ring-zinc-800"
        style={{
          // Sit above the bottom nav (h-16 + iPhone safe area).
          bottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <PerryIcon size={42} />
      </Link>
    </>
  );
}
