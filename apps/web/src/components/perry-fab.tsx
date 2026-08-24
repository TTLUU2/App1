'use client';

// PerryFAB — universal Copilot entry point. A floating mascot button
// rendered at the layout level so it appears on every screen except
// /ask itself (where the chat surface IS the conversation, so an entry
// affordance is redundant).
//
// Visual:
//   - Perry himself (no background circle), with a soft drop-shadow so
//     he's visible on both light and dark pages. Sized to 68px so he
//     reads as a real mascot without dominating the corner.
//   - The whole cluster gently bobs up-and-down (3.4s loop) for the
//     "hovering plane" feel. Perry's eyes blink on their own (5s loop,
//     baked into PerryIcon's CSS).
//
// Behaviour:
//   - Tap on Perry → routes to /ask.
//   - Hides on /ask and /ask/* (no point showing the entry while the
//     user is inside the destination) and on /matching (crowded layout).
//   - Positioned bottom-left (opposite the centre red FAB) so the two
//     affordances don't compete for the same thumb zone. Sits above
//     the tab bar + the iPhone home-indicator safe area.
//
// History: the auto-popping "Got a question?" speech bubble (15s show/
// hide cycle) was removed 2026-08-23 per user call — the persistent
// hover-bubble read as attention-seeking chrome, and celebrations now
// live in <PerryMomentOverlay> (fires only on bonus-cleared / journey-
// unlocked events, not every 15s).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PerryIcon } from './perry-icon';

export function PerryFAB() {
  const pathname = usePathname();

  // Hide when already on the chat surface — no reason to surface an
  // entry point when you're inside the destination. Also hide on
  // /matching where the card-picker wizard already uses the full
  // viewport (red FAB + Show quick view chip + tab bar) and Perry
  // crowds the layout.
  if (pathname === '/ask' || pathname.startsWith('/ask/') || pathname === '/matching') return null;

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
        @media (prefers-reduced-motion: reduce) {
          .perry-fab-bob { animation: none; }
        }
      `}</style>

      <Link
        href="/ask"
        aria-label="Ask the Copilot"
        className="perry-fab-bob fixed left-3 z-40 block"
        style={{
          // Sit above the bottom nav (h-16 + iPhone safe area).
          bottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="transition-transform hover:scale-105 active:scale-95 [filter:drop-shadow(0_2px_6px_rgba(46,10,8,0.14))]">
          <PerryIcon size={68} />
        </div>
      </Link>
    </>
  );
}
