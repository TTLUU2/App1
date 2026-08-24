'use client';

// PerryFAB — universal Copilot entry point. A floating mascot button
// rendered at the layout level so it appears on every screen except
// /ask itself (where the chat surface IS the conversation, so an entry
// affordance is redundant).
//
// Visual:
//   - Perry himself (no background circle), with a soft drop-shadow so
//     he's visible on both light and dark pages. Sized to 90px so he
//     reads as a real mascot rather than an icon.
//   - A small speech bubble pulses in above-and-to-the-right of his
//     head every 15s for ~3s, then fades back out — present enough to
//     invite a tap, not so loud it competes with page content.
//   - The whole cluster gently bobs up-and-down (3.4s loop) for the
//     "hovering plane" feel. Perry's eyes blink on their own (5s loop,
//     baked into PerryIcon's CSS).
//
// Behaviour:
//   - Tap anywhere on the cluster (Perry OR bubble) → routes to /ask.
//   - Hides on /ask and /ask/* (no point showing the entry while the
//     user is inside the destination).
//   - Bubble layout is absolute over Perry so its show/hide cycle
//     doesn't shift Perry's position.
//   - Positioned bottom-left (opposite the centre red FAB) so the two
//     affordances don't compete for the same thumb zone. Sits above
//     the tab bar + the iPhone home-indicator safe area.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PerryIcon } from './perry-icon';

// Bubble timing cycle. Values picked by hand to give Perry a "tap me"
// nudge on first paint, then back off so he's not constantly demanding
// attention. Tune here if the rhythm feels too loud or too quiet.
const BUBBLE_VISIBLE_MS = 3000;
const BUBBLE_HIDDEN_MS = 12000;

export function PerryFAB() {
  const pathname = usePathname();
  // Periodic show/hide: starts visible on mount, then cycles. The user
  // sees the prompt immediately on first load (no missed nudge), then
  // it backs off into the rhythm.
  const [bubbleVisible, setBubbleVisible] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function step(visible: boolean) {
      setBubbleVisible(visible);
      timer = setTimeout(() => step(!visible), visible ? BUBBLE_VISIBLE_MS : BUBBLE_HIDDEN_MS);
    }
    // Kick off the cycle: visible state was set in the useState init,
    // so schedule the next flip after the visible window.
    timer = setTimeout(() => step(false), BUBBLE_VISIBLE_MS);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

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
        {/* Cluster wrapper — relative so the bubble can absolute-position
            itself without shifting Perry on show/hide cycles. */}
        <div className="relative">
          {/* Speech bubble — Lacquer chrome. Paper card + hairline
              border to sit against any page surface; ph-text-muted
              body so it doesn't compete with Perry. Rounded-bl-sm
              gives the tail its Perry-facing bite. */}
          {/* HANDOFF § Motion — speech card: fade + 8px rise, 200ms. Was
              opacity+scale/300ms; switched to opacity + translateY for a
              lift-off feel that matches Perry facing up-right into the
              corner. Reduced motion opts out via motion-reduce:*. */}
          <div
            aria-hidden={!bubbleVisible}
            className={`absolute -top-1 left-[46px] origin-bottom-left whitespace-nowrap rounded-2xl rounded-bl-sm border border-ph-border bg-ph-card px-2.5 py-1.5 text-[11px] font-medium leading-snug text-ph-text-muted transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
              bubbleVisible
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-2 opacity-0'
            }`}
            style={{ boxShadow: 'var(--shadow-ph-thumb)' }}
          >
            Got a question?
            <span
              aria-hidden
              className="absolute -bottom-1 left-2 h-2 w-2 rotate-45 border-b border-l border-ph-border bg-ph-card"
            />
          </div>

          {/* Perry — the floating overlay treatment is transitional
              (HANDOFF § 10 replaces this with the four-moment character
              + Copilot bar in Phase 5). For the Lacquer interim we
              shrink from 90px to 68px and soften the drop shadow so
              he stops dominating the corner. */}
          <div className="transition-transform hover:scale-105 active:scale-95 [filter:drop-shadow(0_2px_6px_rgba(46,10,8,0.14))]">
            <PerryIcon size={68} />
          </div>
        </div>
      </Link>
    </>
  );
}
