// CardArtFrame — cream surround with a hairline (HANDOFF § Fidelity +
// § Assets needed). Wraps every product image in every list; the
// frame is chrome, the art inside belongs to the issuer.
//
// Contract-critical: no tinted gradient behind the art. The spec
// calls out issuer red (Westpac / NAB / Virgin) explicitly: their
// red belongs to the card, not to our chrome. Cream frame, hairline
// border, nothing else.
//
// Sizes are locked to the five contexts in the mock:
//   lg   96×61  — Journeys · Destinations "Almost there" alt / Perry
//                 celebration
//   md   92×58  — Next card best-move card
//   sm   58×37  — Optimise · Your cards active card block
//   xs   48×31  — Add-a-card sheet results row
//   xxs  44×28  — Next card ranked-list rows
//
// The placeholder mode (no `src`) matches the mock's diagonal-striped
// cream block labelled `card art` — legible in flat layouts, never
// mistaken for a broken image.

import Image from 'next/image';
import clsx from 'clsx';

export type CardArtSize = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

export interface CardArtFrameProps {
  /** Absolute or relative path to the card art. Omit to render the
   *  striped placeholder. */
  src?: string;
  /** Product name — used as alt text (accessibility) and as the
   *  placeholder label. */
  alt: string;
  size?: CardArtSize;
  className?: string;
}

/** width, height, radius (Tailwind class), placeholder text size */
const SIZE_MAP: Record<CardArtSize, { w: number; h: number; radius: string; labelPx: number }> = {
  lg: { w: 96, h: 61, radius: 'rounded-[9px]', labelPx: 9 },
  md: { w: 92, h: 58, radius: 'rounded-[9px]', labelPx: 9 },
  sm: { w: 58, h: 37, radius: 'rounded-[7px]', labelPx: 8 },
  xs: { w: 48, h: 31, radius: 'rounded-[6px]', labelPx: 7 },
  xxs: { w: 44, h: 28, radius: 'rounded-[5px]', labelPx: 7 },
};

export function CardArtFrame({ src, alt, size = 'md', className }: CardArtFrameProps) {
  const dim = SIZE_MAP[size];
  return (
    <span
      className={clsx(
        'inline-block flex-none overflow-hidden border border-ph-border bg-ph-card',
        dim.radius,
        className,
      )}
      style={{ width: dim.w, height: dim.h }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={dim.w}
          height={dim.h}
          className="h-full w-full object-cover"
        />
      ) : (
        // Placeholder: 45° diagonal stripes in fill + fill-warm so the
        // label reads on top without needing a text-shadow, and the
        // frame stays visibly "not-yet-populated" during design review.
        <span
          role="img"
          aria-label={`${alt} card art placeholder`}
          className="grid h-full w-full place-items-center text-ph-text-meta"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--color-ph-fill) 0 6px, var(--color-ph-fill-warm) 6px 12px)',
            fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
            fontSize: dim.labelPx,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          card art
        </span>
      )}
    </span>
  );
}
