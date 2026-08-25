'use client';

// Zustand store for the user's card history.
//
// Strategy: load all UserCards into memory once on app start, then write through
// to IndexedDB on every mutation. This keeps Tab 4 selectors synchronous and
// satisfies PRD §17 ("update within 1s of an add") — no re-fetch round-trip.
//
// Why not React Query: there's no server. The catalogue is bundled. The
// UserCard table is small (rarely >50 rows) and fully fits in memory.

import { create } from 'zustand';
import type {
  CardWithIssuer,
  EligibilityResult,
  Issuer,
  Recommendation,
  UserCard,
  UserCardWithDetails,
} from '@ph/shared';
import {
  calculateEligibility,
  generateRecommendations,
  getCardsWithIssuer,
  getCardWithIssuer,
  getIssuers,
} from '@ph/shared';
import { getDb } from '@/lib/db';
import { assertNoPanOrCvv } from '@/lib/safety';
import { clearProjections, syncProjections } from '@/lib/projections';

export interface NewUserCardInput {
  cardId: string;
  applicationDate: string; // ISO yyyy-MM-dd
  cancellationDate?: string | null;
  bonusReceived?: boolean;
  notes?: string | null;
  nickname?: string | null;
  last4?: string | null;
  expiryMonthYear?: string | null;
  // Card onboarding extensions (M2 — populated by the manual form's "More
  // details" panel or the post-OCR conversational onboarding flow).
  activationDate?: string | null;
  annualFeeNextDueDate?: string | null;
  bonusTarget?: number | null;
  bonusSpentToDate?: number | null;
  bonusSpendWindowEndDate?: string | null;
  bonusPointsOverride?: number | null;
}

interface UserCardsState {
  userCards: UserCard[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  addCard: (input: NewUserCardInput) => Promise<UserCard>;
  updateCard: (id: string, patch: Partial<UserCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reset: () => Promise<void>;

  // Bulk replace — used by the dev-menu seeder.
  replaceAll: (cards: UserCard[]) => Promise<void>;
}

export const useUserCardsStore = create<UserCardsState>((set, get) => ({
  userCards: [],
  loaded: false,
  error: null,

  async load() {
    if (get().loaded) return;
    try {
      const rows = await getDb().userCards.toArray();
      set({ userCards: rows, loaded: true, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loaded: true });
    }
  },

  async addCard(input) {
    assertNoPanOrCvv(input);
    const now = new Date().toISOString();
    const record: UserCard = {
      id: crypto.randomUUID(),
      cardId: input.cardId,
      applicationDate: input.applicationDate,
      cancellationDate: input.cancellationDate ?? null,
      bonusReceived: input.bonusReceived ?? false,
      notes: input.notes ?? null,
      createdAt: now,
      nickname: input.nickname ?? null,
      last4: input.last4 ?? null,
      expiryMonthYear: input.expiryMonthYear ?? null,
      activationDate: input.activationDate ?? null,
      annualFeeNextDueDate: input.annualFeeNextDueDate ?? null,
      bonusTarget: input.bonusTarget ?? null,
      bonusSpentToDate: input.bonusSpentToDate ?? null,
      bonusSpendWindowEndDate: input.bonusSpendWindowEndDate ?? null,
      bonusPointsOverride: input.bonusPointsOverride ?? null,
    };
    await getDb().userCards.add(record);
    set({ userCards: [...get().userCards, record] });
    // Push fresh alert projections (best-effort, fire-and-forget).
    const cardWithIssuer = getCardWithIssuer(record.cardId);
    if (cardWithIssuer) {
      void syncProjections({ ...record, card: cardWithIssuer });
    }
    return record;
  },

  async updateCard(id, patch) {
    assertNoPanOrCvv(patch);
    await getDb().userCards.update(id, patch);
    set({
      userCards: get().userCards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
    // Re-sync if fields that affect projections changed, or anytime — the
    // server endpoint is cheap and idempotent.
    const updated = get().userCards.find((c) => c.id === id);
    if (updated) {
      const cardWithIssuer = getCardWithIssuer(updated.cardId);
      if (cardWithIssuer) {
        void syncProjections({ ...updated, card: cardWithIssuer });
      }
    }
  },

  async deleteCard(id) {
    await getDb().userCards.delete(id);
    set({ userCards: get().userCards.filter((c) => c.id !== id) });
    void clearProjections(id);
  },

  async reset() {
    await getDb().userCards.clear();
    set({ userCards: [] });
  },

  async replaceAll(cards) {
    await getDb().transaction('rw', getDb().userCards, async () => {
      await getDb().userCards.clear();
      await getDb().userCards.bulkAdd(cards);
    });
    set({ userCards: cards });
  },
}));

// ── Derived selectors ──────────────────────────────────────────────────────

/** Join in-memory UserCards with the bundled catalogue. */
export function selectUserCardsWithDetails(state: UserCardsState): UserCardWithDetails[] {
  const out: UserCardWithDetails[] = [];
  for (const uc of state.userCards) {
    const card = getCardWithIssuer(uc.cardId);
    if (!card) continue; // stale id (catalogue updated, row references missing card)
    out.push({ ...uc, card });
  }
  return out;
}

/**
 * Recommendations sorted by priority desc. Optional `preferences` biases
 * the ranking — hides cards whose card type doesn't match the user's
 * choice and boosts cards whose rewards program is in the preferred list.
 * Callers without preferences get the legacy "best move regardless"
 * behaviour.
 */
export function selectRecommendations(
  state: UserCardsState,
  preferences?: import('@ph/shared').UserPreferences,
): Recommendation[] {
  const details = selectUserCardsWithDetails(state);
  return generateRecommendations(getCardsWithIssuer(), details, getIssuers(), preferences);
}

/** Eligibility result for one specific card id from the catalogue. */
export function selectEligibilityForCard(
  state: UserCardsState,
  cardId: string,
): EligibilityResult | null {
  const card = getCardWithIssuer(cardId);
  if (!card) return null;
  const details = selectUserCardsWithDetails(state);
  return calculateEligibility(card, details, getIssuers());
}

// Re-export upstream helpers so consumers don't need to import from @ph/shared.
export const catalogue = {
  allCards: (): CardWithIssuer[] => getCardsWithIssuer(),
  allIssuers: (): Issuer[] => getIssuers(),
};
