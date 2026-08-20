// EvidencePanel — the "every recommendation shows its reasoning"
// primitive (HANDOFF § Behaviour rules #3). Used by Next card's
// best-move card and by Log-a-spend's consequence panel: paper-tinted
// inset, radius 14, dot bullets each in one of three tones.
//
// Each bullet stands alone as a piece of evidence — eligibility fact,
// feasibility read against the user's real spend, net-value figure.
// Three items is the sweet spot; four is legible; five turns the
// panel into a list and the reader stops reading.

import { type ReactNode } from 'react';
import clsx from 'clsx';

export type EvidenceTone = 'pine' | 'amber-brown' | 'ink';

export interface EvidenceBullet {
  tone: EvidenceTone;
  children: ReactNode;
}

export interface EvidencePanelProps {
  bullets: EvidenceBullet[];
  className?: string;
}

const DOT_CLASSES: Record<EvidenceTone, string> = {
  pine: 'bg-ph-pine',
  'amber-brown': 'bg-ph-amber-figure',
  ink: 'bg-ph-ink',
};

const TEXT_CLASSES: Record<EvidenceTone, string> = {
  pine: 'text-ph-pine-text',
  'amber-brown': 'text-ph-amber-text',
  ink: 'text-ph-text',
};

export function EvidencePanel({ bullets, className }: EvidencePanelProps) {
  return (
    <div
      className={clsx('rounded-ph-inner border border-ph-tint-border bg-ph-tint p-3.5', className)}
    >
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
            <span
              aria-hidden
              className={clsx(
                'mt-[6px] h-[5px] w-[5px] flex-none rounded-full',
                DOT_CLASSES[b.tone],
              )}
            />
            <span className={TEXT_CLASSES[b.tone]}>{b.children}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
