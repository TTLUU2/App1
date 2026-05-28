// Demo dataset for the dev-menu seeder. Hand-picked to surface every Tab 4
// status — eligible, waiting, grey_area, not_eligible — so reviewers don't
// have to enter cards by hand to see the UI.
//
// Dates are computed relative to "today" so the timeline stays realistic as
// you re-seed at any point in the future.

import type { UserCard } from '@ph/shared';
import { getCardsWithIssuer } from '@ph/shared';

interface Fixture {
  cardName: string;
  monthsSinceApplication: number;
  monthsSinceCancellation: number | null;
  bonusReceived: boolean;
  notes?: string;
}

const FIXTURES: Fixture[] = [
  // Active personal Amex → blocks the rest of the personal Amex pool.
  {
    cardName: 'American Express Velocity Platinum',
    monthsSinceApplication: 8,
    monthsSinceCancellation: null,
    bonusReceived: true,
    notes: 'Active. Min-spend hit.',
  },
  // Active NAB Qantas → blocks the NAB Qantas family for now.
  {
    cardName: 'NAB Qantas Rewards Signature',
    monthsSinceApplication: 14,
    monthsSinceCancellation: null,
    bonusReceived: true,
  },
  // Cancelled Citi 12mo ago → Citi cards show grey_area (no exclusion period).
  {
    cardName: 'Citi Premier',
    monthsSinceApplication: 26,
    monthsSinceCancellation: 12,
    bonusReceived: true,
    notes: 'Cancelled before annual fee renewal.',
  },
  // Cancelled ANZ FF 10mo ago → ANZ cards show waiting (24mo wait, 14mo to go).
  {
    cardName: 'ANZ Frequent Flyer Black',
    monthsSinceApplication: 30,
    monthsSinceCancellation: 10,
    bonusReceived: true,
  },
  // Cancelled Westpac 30mo ago → Westpac Altitude cards now eligible (>24mo).
  {
    cardName: 'Westpac Altitude Velocity Black',
    monthsSinceApplication: 48,
    monthsSinceCancellation: 30,
    bonusReceived: true,
    notes: 'Old churn. Wait period expired.',
  },
];

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildDemoUserCards(): UserCard[] {
  const today = new Date();
  const now = today.toISOString();
  const cardsByName = new Map(getCardsWithIssuer().map((c) => [c.name, c]));
  const out: UserCard[] = [];

  for (const f of FIXTURES) {
    const card = cardsByName.get(f.cardName);
    if (!card) {
      console.warn(`buildDemoUserCards: catalogue missing "${f.cardName}" — skipping`);
      continue;
    }
    const applicationDate = toIsoDate(subtractMonths(today, f.monthsSinceApplication));
    const cancellationDate =
      f.monthsSinceCancellation != null
        ? toIsoDate(subtractMonths(today, f.monthsSinceCancellation))
        : null;

    out.push({
      id: crypto.randomUUID(),
      cardId: card.id,
      applicationDate,
      cancellationDate,
      bonusReceived: f.bonusReceived,
      notes: f.notes ?? null,
      createdAt: now,
      nickname: null,
      last4: null,
      expiryMonthYear: null,
      activationDate: null,
      annualFeeNextDueDate: null,
      bonusTarget: null,
      bonusSpentToDate: null,
      bonusSpendWindowEndDate: null,
    });
  }
  return out;
}
