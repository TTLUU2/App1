// HeroCard — the "one signature surface" wrapper (HANDOFF § Behaviour
// rules #1). Every tab gets exactly one of these; it's what makes the
// brand read as brand. Deep brick surface, hero radius (22), padding
// 20, gap 18 between the left-hand mark (score ring / Perry / logo)
// and the right-hand text stack.
//
// Never nest a HeroCard inside another. Never place two side-by-side
// on the same screenful. The system leans hard on this restraint —
// two brick surfaces on one screen would compete for the "the app is
// speaking now" moment.

import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface HeroCardProps extends HTMLAttributes<HTMLElement> {
  /** Semantic element. Defaults to `<section>`; use `<header>` for the
   *  Today greeting variant, `<article>` for the Journeys hero, etc. */
  as?: 'section' | 'header' | 'article';
}

export const HeroCard = forwardRef<HTMLElement, HeroCardProps>(function HeroCard(
  { as = 'section', className, children, ...rest },
  ref,
) {
  const Comp = as as 'section';
  return (
    <Comp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- forwardRef + polymorphic `as` needs the escape
      ref={ref as any}
      className={clsx(
        'flex items-center gap-[18px] rounded-ph-hero bg-ph-brick p-5 text-ph-on-brick',
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
});
