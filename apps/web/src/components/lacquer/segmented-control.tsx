// SegmentedControl — the 999px pill under every second-level tab
// header (HANDOFF § Second level). Optimise uses it for "Your cards |
// Next card"; Journeys for "Destinations | Balances". Both sub-tabs
// are equal weight — the pill is deliberately symmetric so the two
// halves feel like peer views of one dataset, not "main + drawer".
//
// Interaction (HANDOFF § Interactions): instant switch, thumb slides
// 180ms ease-out. Selection persists per tab for the session — the
// caller owns that state; this primitive just renders + fires
// onChange. We measure the active tab's position and animate the
// thumb via a transform on a single absolutely-positioned element,
// so the slide reads as physical motion rather than a colour swap.

'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

// useLayoutEffect on the server logs a warning; useEffect during SSR
// silently does nothing (which is what we want for a measurement pass
// that only makes sense in the browser).
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface SegmentedControlItem<Id extends string = string> {
  id: Id;
  label: ReactNode;
}

export interface SegmentedControlProps<Id extends string = string> {
  items: SegmentedControlItem<Id>[];
  activeId: Id;
  onChange: (id: Id) => void;
  /** Optional aria-label describing the group (e.g. "Optimise view"). */
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<Id extends string = string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<Id>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Map<Id, HTMLButtonElement>>(new Map());
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  // Recompute the thumb position on active change, mount, and resize.
  // The layout effect ensures we measure after DOM commit so the
  // transform target matches the button's final geometry.
  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    const btn = btnRefs.current.get(activeId);
    if (!track || !btn) return;
    const trackBox = track.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setThumb({ x: btnBox.left - trackBox.left, w: btnBox.width });
  }, [activeId, items.length]);

  // Resize: recalc on window resize so orientation changes don't
  // strand the thumb.
  useEffect(() => {
    function recompute() {
      const track = trackRef.current;
      const btn = btnRefs.current.get(activeId);
      if (!track || !btn) return;
      const trackBox = track.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setThumb({ x: btnBox.left - trackBox.left, w: btnBox.width });
    }
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [activeId]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'relative inline-flex rounded-full bg-ph-fill p-1',
        // The track defines the pill; the thumb rides above it.
        className,
      )}
    >
      {thumb && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-ph-card"
          style={{
            transform: `translateX(${thumb.x - 4}px)`,
            width: thumb.w,
            transition: 'transform 180ms ease-out, width 180ms ease-out',
            boxShadow: 'var(--shadow-ph-thumb)',
          }}
        />
      )}
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) btnRefs.current.set(item.id, el);
              else btnRefs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={clsx(
              'relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isActive ? 'text-ph-ink' : 'text-ph-text-meta hover:text-ph-text',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
