'use client';

// Zustand store for UserBenefitRedemption records. Same write-through pattern
// as the userCards store. Recurring benefits (annual / quarterly) produce one
// redemption row per period the user marks Used.

import { create } from 'zustand';
import type { Benefit, UserBenefitRedemption } from '@ph/shared';
import { getDb } from '@/lib/db';

interface UserBenefitsState {
  redemptions: UserBenefitRedemption[];
  loaded: boolean;

  load: () => Promise<void>;
  markUsed: (input: MarkBenefitUsedInput) => Promise<UserBenefitRedemption>;
  removeRedemption: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

export interface MarkBenefitUsedInput {
  userCardId: string;
  benefit: Benefit;
  activationDate: string; // ISO yyyy-MM-dd — used to compute the current period
  redeemedAmount?: number | null;
}

export const useUserBenefitsStore = create<UserBenefitsState>((set, get) => ({
  redemptions: [],
  loaded: false,

  async load() {
    if (get().loaded) return;
    const rows = await getDb().userBenefitRedemptions.toArray();
    set({ redemptions: rows, loaded: true });
  },

  async markUsed({ userCardId, benefit, activationDate, redeemedAmount }) {
    const period = computeCurrentPeriod(benefit.period, activationDate);
    const record: UserBenefitRedemption = {
      id: crypto.randomUUID(),
      userCardId,
      benefitId: benefit.id,
      periodStartDate: period.start,
      periodEndDate: period.end,
      redeemedAt: new Date().toISOString(),
      redeemedAmount: redeemedAmount ?? null,
    };
    await getDb().userBenefitRedemptions.add(record);
    set({ redemptions: [...get().redemptions, record] });
    return record;
  },

  async removeRedemption(id) {
    await getDb().userBenefitRedemptions.delete(id);
    set({ redemptions: get().redemptions.filter((r) => r.id !== id) });
  },

  async reset() {
    await getDb().userBenefitRedemptions.clear();
    set({ redemptions: [] });
  },
}));

// ── Period computation ────────────────────────────────────────────────────

export interface BenefitPeriodRange {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
}

const PERIOD_MONTHS: Record<Benefit['period'], number | null> = {
  annual: 12,
  biannual: 6,
  quarterly: 3,
  monthly: 1,
  one_off: null,
};

/**
 * Compute the current redemption period for a recurring benefit, anchored to
 * the card's activation date. For 'one_off', returns the full window from
 * activation date → +50 years (effectively the lifetime of the card).
 */
export function computeCurrentPeriod(
  period: Benefit['period'],
  activationDateIso: string,
): BenefitPeriodRange {
  const anchor = new Date(activationDateIso + 'T00:00:00');
  const now = new Date();
  const months = PERIOD_MONTHS[period];

  if (months == null) {
    // one_off → single period spanning the card's lifetime
    const end = new Date(anchor);
    end.setFullYear(end.getFullYear() + 50);
    return { start: toIso(anchor), end: toIso(end) };
  }

  // Roll forward from the anchor in `months`-sized steps until we contain `now`.
  const cursor = new Date(anchor);
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + months);
    if (next > now) {
      return { start: toIso(cursor), end: toIso(addDays(next, -1)) };
    }
    cursor.setMonth(cursor.getMonth() + months);
  }
}

export function isRedemptionInPeriod(
  redemption: UserBenefitRedemption,
  period: BenefitPeriodRange,
): boolean {
  return redemption.periodStartDate === period.start;
}

/** Days until the period ends (negative if past). */
export function daysUntilPeriodEnd(period: BenefitPeriodRange): number {
  const end = new Date(period.end + 'T23:59:59');
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
