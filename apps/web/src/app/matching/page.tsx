'use client';

/**
 * /matching — Tab 1. Standard page header (CreditCard icon + "Matching"
 * + subtitle) sits above the Card Picker wizard. The wizard handles the
 * pick-and-filter UX; everything else (header style, deal-card style)
 * follows the rest of the app — matches /deals + /optimisation +
 * /next-card patterns.
 */

import { CreditCard } from 'lucide-react';
import { CardPicker } from '@/features/card-picker/CardPicker';

export default function MatchingPage() {
  return (
    <main className="px-4 pt-4 pb-24">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CreditCard className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Matching
        </h1>
        <p className="mt-1 text-xs text-ink-soft">
          Set your preferences and discover the best credit cards for you. Get matched in seconds.
        </p>
      </header>

      <CardPicker />
    </main>
  );
}
