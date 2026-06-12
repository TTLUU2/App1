'use client';

import { useMemo } from 'react';
import type { Card } from '../types';
import { MOCK_CARDS } from '../data/cards';

export interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  /** True when showing cached data and a background revalidation is in progress. */
  isValidating?: boolean;
}

/**
 * Cards data source for the PH Copilot port. The upstream tool talks to
 * PocketBase with stale-while-revalidate caching; here we use the bundled
 * MOCK_CARDS array — no network calls, no cache layer. The return shape is
 * kept identical to the upstream hook so call sites don't need to change.
 */
export function useCards(): UseCardsResult {
  const cards = useMemo(() => MOCK_CARDS, []);
  return {
    cards,
    loading: false,
    error: null,
    usingFallback: false,
    isValidating: false,
  };
}
