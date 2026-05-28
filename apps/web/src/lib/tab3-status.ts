// Pure status + projection logic for Tab 3 (Card Optimisation), per PRD §9.3
// and §9.2.3 sign-up bonus block. Pure functions so they're testable
// without React or a DB.

import type {
  Benefit,
  CardWithIssuer,
  UserBenefitRedemption,
  UserCardWithDetails,
} from '@ph/shared';
import {
  computeCurrentPeriod,
  daysUntilPeriodEnd,
  isRedemptionInPeriod,
  type BenefitPeriodRange,
} from '@/store/user-benefits';

export type Tab3Status = 'on_track' | 'action_needed' | 'at_risk';

export interface BonusProjection {
  /** Average daily spend since application date. 0 if no days elapsed. */
  averageDailySpend: number;
  /** Projected spend total at the spend-by date at current pace. */
  projectedTotal: number;
  /** Days remaining until the spend-by date (negative if overdue). */
  daysRemaining: number;
  /** How many days late the projected completion would be vs the deadline. */
  projectedMissDays: number;
  /** Convenience: target - projectedTotal (negative when target met). */
  shortfall: number;
}

export function projectBonusCompletion(uc: UserCardWithDetails): BonusProjection | null {
  if (uc.bonusTarget == null || uc.bonusSpendWindowEndDate == null) return null;

  const today = new Date();
  const applicationDate = new Date(uc.applicationDate + 'T00:00:00');
  const spendByDate = new Date(uc.bonusSpendWindowEndDate + 'T23:59:59');

  const daysSinceApplication = Math.max(
    1,
    Math.floor((today.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const spentSoFar = uc.bonusSpentToDate ?? 0;
  const averageDailySpend = spentSoFar / daysSinceApplication;

  const daysRemaining = Math.ceil(
    (spendByDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const projectedTotal = spentSoFar + averageDailySpend * Math.max(0, daysRemaining);
  const shortfall = uc.bonusTarget - projectedTotal;

  // Days late if we miss: extra days needed at current pace.
  const projectedMissDays =
    averageDailySpend > 0 && projectedTotal < uc.bonusTarget
      ? Math.ceil((uc.bonusTarget - projectedTotal) / averageDailySpend)
      : projectedTotal >= uc.bonusTarget
        ? 0
        : Infinity;

  return {
    averageDailySpend,
    projectedTotal,
    daysRemaining,
    projectedMissDays,
    shortfall,
  };
}

export interface BenefitStatus {
  benefit: Benefit;
  period: BenefitPeriodRange;
  redemption: UserBenefitRedemption | null;
  daysRemaining: number;
  /** 'used' | 'expiring_soon' | 'unused' */
  state: 'used' | 'expiring_soon' | 'unused';
}

export function benefitStatusFor(
  benefit: Benefit,
  uc: UserCardWithDetails,
  allRedemptions: UserBenefitRedemption[],
): BenefitStatus {
  // Anchor benefit periods to activationDate; fall back to applicationDate.
  const anchor = uc.activationDate ?? uc.applicationDate;
  const period = computeCurrentPeriod(benefit.period, anchor);
  const days = daysUntilPeriodEnd(period);
  const redemption =
    allRedemptions.find(
      (r) =>
        r.userCardId === uc.id && r.benefitId === benefit.id && isRedemptionInPeriod(r, period),
    ) ?? null;

  const state: BenefitStatus['state'] = redemption
    ? 'used'
    : days <= 30 && days >= 0
      ? 'expiring_soon'
      : 'unused';

  return { benefit, period, redemption, daysRemaining: days, state };
}

/**
 * PRD §9.3 status rules. Combines bonus-spend projection + benefit expiry +
 * annual-fee proximity into a single chip. Returns 'on_track' by default.
 */
export function computeCardStatus(
  uc: UserCardWithDetails,
  benefitStatuses: BenefitStatus[],
): Tab3Status {
  const now = new Date();

  // Annual fee proximity
  if (uc.annualFeeNextDueDate) {
    const due = new Date(uc.annualFeeNextDueDate + 'T00:00:00');
    const daysUntilFee = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilFee >= 0 && daysUntilFee < 7) return 'at_risk';
  }

  // Bonus projection
  const projection = projectBonusCompletion(uc);
  if (projection) {
    if (projection.daysRemaining < 7) return 'at_risk';
    if (projection.shortfall > 0 && projection.projectedMissDays > 10) return 'at_risk';
    if (projection.daysRemaining < 30) return 'action_needed';
    if (projection.shortfall > 0 && projection.projectedMissDays <= 10) return 'action_needed';
  }

  // Benefit expiry within 30 days, not used
  for (const b of benefitStatuses) {
    if (b.state === 'expiring_soon') return 'action_needed';
  }

  return 'on_track';
}

export interface SummaryHeaderStats {
  activeCount: number;
  totalMinSpendRemaining: number; // AUD
  totalPointsPending: number; // points still being chased across active min-spends
  actionNeededCount: number;
}

export function computeSummary(
  cards: UserCardWithDetails[],
  benefitStatusByCard: Map<string, BenefitStatus[]>,
): SummaryHeaderStats {
  let activeCount = 0;
  let totalMinSpendRemaining = 0;
  let totalPointsPending = 0;
  let actionNeededCount = 0;

  for (const uc of cards) {
    if (uc.cancellationDate) continue;
    activeCount += 1;

    const projection = projectBonusCompletion(uc);
    if (projection && projection.shortfall > 0 && projection.daysRemaining > 0) {
      totalMinSpendRemaining += projection.shortfall;
      if (uc.card.bonusPoints) totalPointsPending += uc.card.bonusPoints;
    }

    const status = computeCardStatus(uc, benefitStatusByCard.get(uc.id) ?? []);
    if (status !== 'on_track') actionNeededCount += 1;
  }

  return { activeCount, totalMinSpendRemaining, totalPointsPending, actionNeededCount };
}

/** Single most important upcoming date/amount for the collapsed row headline. */
export function rowHeadline(
  uc: UserCardWithDetails,
  benefits: BenefitStatus[],
): { label: string; tone: 'neutral' | 'warning' | 'danger' } {
  const projection = projectBonusCompletion(uc);

  if (projection && projection.shortfall > 0) {
    const fmt = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    });
    const tone: 'danger' | 'warning' | 'neutral' =
      projection.daysRemaining < 7
        ? 'danger'
        : projection.daysRemaining < 30
          ? 'warning'
          : 'neutral';
    return {
      label: `${fmt.format(projection.shortfall)} to go in ${Math.max(0, projection.daysRemaining)} days`,
      tone,
    };
  }

  const expiringBenefit = benefits.find((b) => b.state === 'expiring_soon');
  if (expiringBenefit) {
    return {
      label: `${expiringBenefit.benefit.name} expires in ${expiringBenefit.daysRemaining} days`,
      tone: 'warning',
    };
  }

  if (uc.annualFeeNextDueDate) {
    const days = Math.ceil(
      (new Date(uc.annualFeeNextDueDate + 'T00:00:00').getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (days >= 0 && days < 60) {
      const fmt = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
      });
      return {
        label: `Annual fee ${fmt.format(uc.card.annualFee)} due in ${days} days`,
        tone: days < 14 ? 'warning' : 'neutral',
      };
    }
  }

  return { label: 'No immediate obligations.', tone: 'neutral' };
}

export function statusVisualClass(status: Tab3Status): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'action_needed':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
    case 'at_risk':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';
  }
}

export function statusLabel(status: Tab3Status): string {
  return status === 'on_track'
    ? 'On track'
    : status === 'action_needed'
      ? 'Action needed'
      : 'At risk';
}

/** Filter Tab 4 recommendations for the 3-month-to-bonus CTA (PRD §9.4). */
export function threeMonthCtaCards<
  T extends { eligibility: { status: string; daysRemaining?: number }; card: CardWithIssuer },
>(recommendations: T[]): T[] {
  return recommendations
    .filter(
      (r) => r.eligibility.status === 'waiting' && (r.eligibility.daysRemaining ?? Infinity) <= 90,
    )
    .sort((a, b) => (a.eligibility.daysRemaining ?? 0) - (b.eligibility.daysRemaining ?? 0));
}
