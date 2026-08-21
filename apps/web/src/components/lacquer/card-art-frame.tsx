// CardArtFrame — cream surround with a hairline (HANDOFF § Fidelity +
// § Assets needed). Wraps every product image in every list; the
// frame is chrome, the art inside belongs to the issuer.
//
// Contract-critical: no tinted gradient behind the art. The spec
// calls out issuer red (Westpac / NAB / Virgin) explicitly: their
// red belongs to the card, not to our chrome. Cream frame, hairline
// border, nothing else.
//
// Three content modes, in order of preference:
//   1. `src` — real product photo (Phase 6 asset drop). Full-bleed.
//   2. `issuerLogo` — bank/issuer mark centred on the cream frame.
//      Used until real card art lands; keeps the surface recognisable
//      without cheating with a tinted gradient. Assets live at
//      /public/images/banks/{slug}.png.
//   3. Placeholder — diagonal-striped cream block with a mono
//      `card art` label. Never mistaken for a broken image in a flat
//      mock; falls through automatically when neither above is set.
//
// Sizes are locked to the five contexts in the mock:
//   lg   96×61  — Journeys · Destinations "Almost there" alt / Perry
//                 celebration
//   md   92×58  — Next card best-move card
//   sm   58×37  — Optimise · Your cards active card block
//   xs   48×31  — Add-a-card sheet results row
//   xxs  44×28  — Next card ranked-list rows

import Image from 'next/image';
import clsx from 'clsx';

export type CardArtSize = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

export interface CardArtFrameProps {
  /** Absolute or relative path to the card art. Full-bleed when set. */
  src?: string;
  /** Issuer logo slug (e.g. `amex`, `anz`, `nab`, `westpac`,
   *  `qantas-money`, `hsbc`, `st-george`, `bank-of-melbourne`,
   *  `banksa`, `mycard`). Resolves to /images/banks/{slug}.png.
   *  Rendered centred on the cream frame when `src` isn't set. */
  issuerLogo?: string;
  /** Product name — used as alt text (accessibility) and as the
   *  placeholder label. */
  alt: string;
  size?: CardArtSize;
  className?: string;
}

/** width, height, radius, placeholder label px, issuer-logo px */
const SIZE_MAP: Record<
  CardArtSize,
  { w: number; h: number; radius: string; labelPx: number; logoPx: number }
> = {
  lg: { w: 96, h: 61, radius: 'rounded-[9px]', labelPx: 9, logoPx: 38 },
  md: { w: 92, h: 58, radius: 'rounded-[9px]', labelPx: 9, logoPx: 36 },
  sm: { w: 58, h: 37, radius: 'rounded-[7px]', labelPx: 8, logoPx: 24 },
  xs: { w: 48, h: 31, radius: 'rounded-[6px]', labelPx: 7, logoPx: 20 },
  xxs: { w: 44, h: 28, radius: 'rounded-[5px]', labelPx: 7, logoPx: 18 },
};

export function CardArtFrame({ src, issuerLogo, alt, size = 'md', className }: CardArtFrameProps) {
  const dim = SIZE_MAP[size];

  // Mode 1: real product art (full-bleed).
  if (src) {
    return (
      <span
        className={clsx(
          'inline-block flex-none overflow-hidden border border-ph-border bg-ph-card',
          dim.radius,
          className,
        )}
        style={{ width: dim.w, height: dim.h }}
      >
        <Image
          src={src}
          alt={alt}
          width={dim.w}
          height={dim.h}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  // Mode 2: issuer logo centred on cream frame. `contain` fit + fixed
  // logoPx keeps the mark upright regardless of source aspect ratio,
  // so an amex.png shipped square and a westpac.png shipped landscape
  // both settle at the same visual weight inside the frame.
  if (issuerLogo) {
    return (
      <span
        className={clsx(
          'inline-flex flex-none items-center justify-center border border-ph-border bg-ph-card',
          dim.radius,
          className,
        )}
        style={{ width: dim.w, height: dim.h }}
      >
        <Image
          src={`/images/banks/${issuerLogo}.png`}
          alt={alt}
          width={dim.logoPx}
          height={dim.logoPx}
          className="object-contain"
          style={{ maxWidth: dim.logoPx, maxHeight: dim.logoPx * 0.85 }}
        />
      </span>
    );
  }

  // Mode 3: placeholder.
  return (
    <span
      className={clsx(
        'inline-block flex-none overflow-hidden border border-ph-border bg-ph-card',
        dim.radius,
        className,
      )}
      style={{ width: dim.w, height: dim.h }}
    >
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
    </span>
  );
}
