'use client';

// Forward-projects which push notifications a given UserCard should
// generate. Called from the user-cards store after add / update / cancel
// mutations; the resulting projections are POSTed to /api/projections/sync
// which idempotently replaces all rows for (deviceId, sourceCardId).
//
// Two alert families today:
//   • Sign-up bonus spend-by — fire 14d / 7d / 1d before deadline, only
//     while bonus is still chase-eligible (target set, not yet received).
//   • Annual fee due — fire 14d / 7d before due date. Lets the user
//     decide whether to keep the card or call to cancel.
//
// Benefits (period-end reminders) are intentionally deferred — they'd
// generate a much larger volume of low-stakes alerts and want a different
// UX (one digest per week, not per benefit). Coming in a follow-up.

import type { UserCardWithDetails } from '@ph/shared';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { formatCurrency, formatDate } from '@/lib/format';
import { isPastIso, subDaysIso } from '@/lib/time';

export interface ProjectionInput {
  alertType: string;
  fireOnDate: string; // 'yyyy-MM-dd'
  title: string;
  body: string;
  url?: string;
}

export function buildProjections(uc: UserCardWithDetails): ProjectionInput[] {
  const out: ProjectionInput[] = [];
  const cardName = uc.card.name;

  // Sign-up bonus spend-by reminders
  if (
    uc.bonusSpendWindowEndDate &&
    uc.bonusTarget != null &&
    uc.bonusTarget > 0 &&
    !uc.bonusReceived &&
    !uc.cancellationDate
  ) {
    const remaining = uc.bonusTarget - (uc.bonusSpentToDate ?? 0);
    for (const days of [14, 7, 1]) {
      const fireDate = subDaysIso(uc.bonusSpendWindowEndDate, days);
      if (isPastIso(fireDate)) continue;
      const tail =
        remaining > 0
          ? `${formatCurrency(remaining)} still to spend by ${formatDate(uc.bonusSpendWindowEndDate)}.`
          : `Target already met — bonus should post soon.`;
      out.push({
        alertType: `spend_by_T-${days}`,
        fireOnDate: fireDate,
        title: `${days} day${days === 1 ? '' : 's'} to min-spend deadline`,
        body: `${cardName}: ${tail}`,
        url: `/spend?card=${uc.id}`,
      });
    }
  }

  // Annual fee reminders
  if (uc.annualFeeNextDueDate && uc.card.annualFee > 0 && !uc.cancellationDate) {
    for (const days of [14, 7]) {
      const fireDate = subDaysIso(uc.annualFeeNextDueDate, days);
      if (isPastIso(fireDate)) continue;
      out.push({
        alertType: `fee_due_T-${days}`,
        fireOnDate: fireDate,
        title: `Annual fee in ${days} day${days === 1 ? '' : 's'}`,
        body: `${cardName} — ${formatCurrency(uc.card.annualFee)} due ${formatDate(uc.annualFeeNextDueDate)}. Decide now whether to keep or cancel.`,
        url: `/cards/${uc.cardId}`,
      });
    }
  }

  return out;
}

/** Push the freshly-computed projections for a card up to the server.
 *  Server-side idempotent: replaces all rows for (deviceId, sourceCardId).
 *  Best-effort — failures don't crash the calling mutation. */
export async function syncProjections(uc: UserCardWithDetails): Promise<void> {
  try {
    const projections = buildProjections(uc);
    await fetch('/api/projections/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        sourceCardId: uc.id,
        projections,
      }),
    });
  } catch {
    // Silent — server-side syncs are best-effort. The card mutation
    // itself has already succeeded locally; missing a push reminder
    // is a tolerable degradation.
  }
}

/** Remove all projections for a deleted/cancelled card. */
export async function clearProjections(userCardId: string): Promise<void> {
  try {
    await fetch('/api/projections/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        sourceCardId: userCardId,
        projections: [],
      }),
    });
  } catch {
    /* best-effort */
  }
}
