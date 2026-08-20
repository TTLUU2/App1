// Perry — the four-moment character (Decision #33, HANDOFF §10).
// This is the placeholder: a brick disc with a serif `P`. Real
// artwork lands in Phase 6 — a plane silhouette that can carry motion
// (tilting up on unlock) the disc can't.
//
// Two sizes only. 26px sits inside the Copilot bar as the default
// resting state; 46px fills the celebration circle for Bonus cleared
// / Destination unlocked takeovers. Anything else is a mistake — the
// spec deliberately restricts Perry's presence to keep him a
// character rather than a cursor.

import clsx from 'clsx';

export interface PerryAvatarProps {
  /** 26 = bar avatar (resting), 46 = celebration circle. */
  size?: 26 | 46;
  /** Override the label glyph. Defaults to `P`. Kept as a prop so the
   *  celebration takeovers can swap to an amber `✓` etc. */
  glyph?: string;
  className?: string;
}

export function PerryAvatar({ size = 26, glyph = 'P', className }: PerryAvatarProps) {
  const px = `${size}px`;
  return (
    <span
      role="img"
      aria-label="Perry"
      className={clsx(
        'inline-grid place-items-center rounded-full bg-ph-brick text-ph-on-brick',
        'font-serif leading-none',
        className,
      )}
      style={{
        width: px,
        height: px,
        // Serif at ~62% of the disc reads centred without descender bias.
        fontSize: size === 46 ? '28px' : '16px',
      }}
    >
      {glyph}
    </span>
  );
}
