'use client';

// Small chip surfacing how many catalogue cards are being hidden by the
// user's card-type preference. Without this, a user who set "Personal
// only" might wonder why business cards never appear — the chip closes
// that gap. Taps open the preferences modal.
//
// Renders nothing when nothing is hidden (default 'personal_and_business'
// effectively shows everything, and the chip stays silent when the
// catalogue happens to have zero of the hidden type).

import { EyeOff, ChevronRight } from 'lucide-react';
import type { CardTypePreference } from '@ph/shared';
import { catalogue } from '@/store/user-cards';

interface Props {
  cardType: CardTypePreference;
  onClick: () => void;
}

export function HiddenByPrefsChip({ cardType, onClick }: Props) {
  // No filter means nothing's hidden.
  if (cardType === 'personal_and_business') return null;

  const allCards = catalogue.allCards();
  const hiddenType: 'personal' | 'business' = cardType === 'personal' ? 'business' : 'personal';
  const hidden = allCards.filter((c) => c.cardType === hiddenType);
  if (hidden.length === 0) return null;

  const label = hiddenType === 'business' ? 'business' : 'personal';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span className="inline-flex items-center gap-1.5">
        <EyeOff className="h-3 w-3" aria-hidden />
        {hidden.length} {label} card{hidden.length === 1 ? '' : 's'} hidden by your preferences
      </span>
      <span className="inline-flex items-center gap-0.5 text-zinc-500">
        Edit
        <ChevronRight className="h-3 w-3" aria-hidden />
      </span>
    </button>
  );
}
