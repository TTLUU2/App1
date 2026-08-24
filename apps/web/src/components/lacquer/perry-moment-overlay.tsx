'use client';

// PerryMomentOverlay — the full-bleed celebration takeover that fires
// for the "Perry moments" the app deliberately lets Perry speak on
// (HANDOFF § 10). Two colours: brick for min-spend bonus cleared, pine
// for tracked-journey destination unlocked. Same shape, different tone.
//
// UX contract:
//   - Fires once per entity, ever (celebrations store tracks fired ids).
//   - Solid tinted background, no blur, no scrim underneath — the
//     celebration IS the surface, not something floating over content.
//   - Tap anywhere dismisses. No button. HANDOFF: "hold until tapped."
//   - The centred 46px Perry disc is our source-of-truth Perry mark
//     (PerryAvatar) — the same one that lives in the resting-state
//     Copilot bar. Perry's face carries here even after the FAB hover
//     went away.
//   - Fade + slight scale-in on mount, 200ms. No animation on exit —
//     the overlay just unmounts once dismissed. Reduced motion skips
//     the animation entirely.

import { useEffect } from 'react';
import { PerryAvatar } from './perry-avatar';

export interface PerryMomentOverlayProps {
  /** brick for bonus-cleared, pine for destination-unlocked. Sets the
   *  full-bleed background colour and the semantic tone. */
  tone: 'brick' | 'pine';
  /** Big line — e.g. "Bonus cleared." Displayed in Instrument Serif
   *  at 30px on an amber-figure fill. Keep it one sentence. */
  headline: string;
  /** Optional second line — e.g. "That's Tokyo, booked." Same serif
   *  at 17px, softer weight. */
  subhead?: string;
  /** Fires when the user taps anywhere. Parent uses this to unmount
   *  the overlay AND mark the celebration id as fired. */
  onDismiss: () => void;
}

export function PerryMomentOverlay({
  tone,
  headline,
  subhead,
  onDismiss,
}: PerryMomentOverlayProps) {
  const bg = tone === 'brick' ? 'bg-ph-brick' : 'bg-ph-pine';
  const glyph = tone === 'brick' ? 'P' : '✓';

  // Escape key dismisses too — accessible parity with the tap-anywhere
  // pattern. Keyboard users otherwise can't dismiss (no focusable
  // element inside the overlay).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      onClick={onDismiss}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center ${bg} px-8 text-center motion-reduce:[animation:none]`}
      style={{ animation: 'ph-celebration-in 200ms ease-out' }}
    >
      {/* Perry disc — the mark inherits ph-brick internally, so on the
          brick background we swap the disc to warm cream so he doesn't
          blend into the surround. On pine, the default brick disc pops
          against the green. */}
      <PerryAvatar
        size={46}
        glyph={glyph}
        className={tone === 'brick' ? '!bg-ph-paper !text-ph-brick' : undefined}
      />
      <p
        className="mt-6 font-serif text-[30px] leading-tight text-ph-amber-lacquer"
        style={{ textShadow: '0 1px 0 rgba(0,0,0,0.08)' }}
      >
        {headline}
      </p>
      {subhead && (
        <p className="mt-2 font-serif text-[17px] leading-snug text-ph-paper/85">{subhead}</p>
      )}
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-paper/60">
        Tap anywhere to dismiss
      </p>
    </div>
  );
}
