// Verbatim port of docs/Bonus Eligibility Reference/eligibility-engine.ts.
// The ONLY change vs the source file is the import path on line 2:
// the original imports types from "@shared/schema"; this port imports from
// the local "./types" module. The pure-functional core (calculateEligibility,
// generateRecommendations and the four handle* helpers) is unchanged.

import { differenceInMonths, differenceInDays, addMonths, format } from 'date-fns';
import type {
  UserCardWithDetails,
  CardWithIssuer,
  EligibilityResult,
  Issuer,
  Recommendation,
} from './types';

export function calculateEligibility(
  targetCard: CardWithIssuer,
  userCards: UserCardWithDetails[],
  _allIssuers: Issuer[],
): EligibilityResult {
  const now = new Date();
  const issuer = targetCard.issuer;

  const userCardsForIssuer = userCards.filter((uc) => uc.card.issuer.id === issuer.id);

  const userCardsForCard = userCards.filter((uc) => uc.card.id === targetCard.id);

  const userCardsForFamily = targetCard.cardFamily
    ? userCards.filter((uc) => uc.card.cardFamily === targetCard.cardFamily)
    : [];

  if (userCardsForCard.length === 0 && userCardsForIssuer.length === 0) {
    return {
      cardId: targetCard.id,
      card: targetCard,
      status: 'eligible',
      reason: "No history with this card or issuer. You're good to go!",
      confidenceLevel: 'high',
    };
  }

  switch (issuer.eligibilityType) {
    case 'first_time_only':
      return handleFirstTimeOnly(targetCard, userCardsForIssuer, issuer);

    case 'new_to_bank':
      return handleNewToBank(targetCard, userCardsForIssuer, issuer, now);

    case 'once_per_card':
      return handleOncePerCard(targetCard, userCardsForCard, userCardsForIssuer, issuer, now);

    case 'time_based':
    default:
      return handleTimeBased(
        targetCard,
        userCardsForCard,
        userCardsForFamily,
        userCardsForIssuer,
        issuer,
        now,
      );
  }
}

function handleFirstTimeOnly(
  card: CardWithIssuer,
  userCardsForIssuer: UserCardWithDetails[],
  issuer: Issuer,
): EligibilityResult {
  if (userCardsForIssuer.length > 0) {
    return {
      cardId: card.id,
      card,
      status: 'not_eligible',
      reason: `${issuer.name} typically requires you to be a new customer. You've held a ${issuer.name} card before.`,
      confidenceLevel: issuer.confidenceLevel,
      ...(issuer.notes ? { greyAreaNotes: issuer.notes } : {}),
    };
  }
  return {
    cardId: card.id,
    card,
    status: 'eligible',
    reason: `You haven't held a ${issuer.name} card before. Safe to apply!`,
    confidenceLevel: 'high',
  };
}

function handleNewToBank(
  card: CardWithIssuer,
  userCardsForIssuer: UserCardWithDetails[],
  issuer: Issuer,
  now: Date,
): EligibilityResult {
  if (userCardsForIssuer.length === 0) {
    return {
      cardId: card.id,
      card,
      status: 'eligible',
      reason: "You're new to this issuer. Safe to apply!",
      confidenceLevel: 'high',
    };
  }

  const latestCancellation = userCardsForIssuer
    .filter((uc) => uc.cancellationDate)
    .sort(
      (a, b) =>
        new Date(b.cancellationDate as string).getTime() -
        new Date(a.cancellationDate as string).getTime(),
    )[0];

  const hasActiveCard = userCardsForIssuer.some((uc) => !uc.cancellationDate);

  if (hasActiveCard) {
    return {
      cardId: card.id,
      card,
      status: 'not_eligible',
      reason: `You currently hold an active ${issuer.name} card. New-to-bank bonus not available.`,
      confidenceLevel: 'high',
    };
  }

  if (latestCancellation && issuer.exclusionPeriodMonths) {
    const cancellationDate = new Date(latestCancellation.cancellationDate as string);
    const monthsSinceCancellation = differenceInMonths(now, cancellationDate);

    if (monthsSinceCancellation < issuer.exclusionPeriodMonths) {
      const eligibleDate = addMonths(cancellationDate, issuer.exclusionPeriodMonths);
      const daysRemaining = differenceInDays(eligibleDate, now);

      return {
        cardId: card.id,
        card,
        status: 'waiting',
        eligibleDate: format(eligibleDate, 'yyyy-MM-dd'),
        daysRemaining: Math.max(0, daysRemaining),
        reason: `Wait ${issuer.exclusionPeriodMonths} months since your last ${issuer.name} card cancellation.`,
        confidenceLevel: issuer.confidenceLevel,
      };
    }
  }

  return {
    cardId: card.id,
    card,
    status: 'grey_area',
    reason: `You've held ${issuer.name} cards before. Check current terms carefully.`,
    confidenceLevel: 'medium',
    greyAreaNotes: issuer.notes ?? 'Rules may have changed. Verify with issuer.',
  };
}

function handleOncePerCard(
  card: CardWithIssuer,
  userCardsForCard: UserCardWithDetails[],
  userCardsForIssuer: UserCardWithDetails[],
  issuer: Issuer,
  now: Date,
): EligibilityResult {
  // Special handling for Amex: 18-month issuer-wide waiting period after any cancellation
  const isAmex = issuer.shortName === 'Amex';
  const AMEX_WAITING_PERIOD_MONTHS = 18;

  if (isAmex) {
    // For Amex, personal and business are separate pools
    const sameTypeCards = userCardsForIssuer.filter((uc) => uc.card.cardType === card.cardType);

    // First check: Is there an active card of the same type?
    const hasActiveCard = sameTypeCards.some((uc) => !uc.cancellationDate);
    if (hasActiveCard) {
      return {
        cardId: card.id,
        card,
        status: 'not_eligible',
        reason: `You currently hold an active ${card.cardType} Amex card. Cannot apply for another.`,
        confidenceLevel: 'high',
      };
    }

    // Second check: 18-month waiting period after ANY Amex card cancellation (same type pool)
    const cancelledCards = sameTypeCards.filter((uc) => uc.cancellationDate);
    if (cancelledCards.length > 0) {
      const latestCancellation = cancelledCards.sort(
        (a, b) =>
          new Date(b.cancellationDate as string).getTime() -
          new Date(a.cancellationDate as string).getTime(),
      )[0];

      if (latestCancellation) {
        const cancellationDate = new Date(latestCancellation.cancellationDate as string);
        const monthsSinceCancellation = differenceInMonths(now, cancellationDate);

        if (monthsSinceCancellation < AMEX_WAITING_PERIOD_MONTHS) {
          const eligibleDate = addMonths(cancellationDate, AMEX_WAITING_PERIOD_MONTHS);
          const daysRemaining = differenceInDays(eligibleDate, now);

          return {
            cardId: card.id,
            card,
            status: 'waiting',
            eligibleDate: format(eligibleDate, 'yyyy-MM-dd'),
            daysRemaining: Math.max(0, daysRemaining),
            reason: `Wait ${AMEX_WAITING_PERIOD_MONTHS} months since your last Amex ${card.cardType} card cancellation. ${daysRemaining} days to go.`,
            confidenceLevel: 'medium',
          };
        }
      }
    }

    // Third check: Have they held this specific card family before? (lifetime exclusion)
    const sameFamilyCards = sameTypeCards.filter((uc) => uc.card.cardFamily === card.cardFamily);

    if (sameFamilyCards.length === 0) {
      const poolName = card.cardType === 'business' ? 'business' : 'personal';
      return {
        cardId: card.id,
        card,
        status: 'eligible',
        reason: `You haven't held this ${poolName} card before. Safe to apply!`,
        confidenceLevel: 'high',
      };
    }

    // They've held this card family before - lifetime exclusion applies
    return {
      cardId: card.id,
      card,
      status: 'not_eligible',
      reason: `You've held this card before. ${issuer.name} typically allows one bonus per card family lifetime.`,
      confidenceLevel: issuer.confidenceLevel,
      ...(issuer.notes ? { greyAreaNotes: issuer.notes } : {}),
    };
  }

  // Standard once-per-card logic for other issuers
  if (userCardsForCard.length === 0) {
    return {
      cardId: card.id,
      card,
      status: 'eligible',
      reason: "You haven't held this specific card before. Safe to apply!",
      confidenceLevel: 'high',
    };
  }

  const latestCard = userCardsForCard.sort(
    (a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime(),
  )[0];

  if (latestCard && !latestCard.cancellationDate) {
    return {
      cardId: card.id,
      card,
      status: 'not_eligible',
      reason: 'You currently hold this card. Cannot apply again.',
      confidenceLevel: 'high',
    };
  }

  return {
    cardId: card.id,
    card,
    status: 'not_eligible',
    reason: `You've held this card before. ${issuer.name} typically allows one bonus per card lifetime.`,
    confidenceLevel: issuer.confidenceLevel,
    ...(issuer.notes ? { greyAreaNotes: issuer.notes } : {}),
  };
}

function handleTimeBased(
  card: CardWithIssuer,
  userCardsForCard: UserCardWithDetails[],
  userCardsForFamily: UserCardWithDetails[],
  userCardsForIssuer: UserCardWithDetails[],
  issuer: Issuer,
  now: Date,
): EligibilityResult {
  let relevantCards: UserCardWithDetails[];
  let scopeDescription: string;

  switch (issuer.scope) {
    case 'issuer_wide':
      relevantCards = userCardsForIssuer;
      scopeDescription = `any ${issuer.name} card`;
      break;
    case 'card_family':
      relevantCards = userCardsForFamily.length > 0 ? userCardsForFamily : userCardsForCard;
      scopeDescription = card.cardFamily ? `${card.cardFamily} family cards` : 'this card';
      break;
    case 'same_card':
    default:
      relevantCards = userCardsForCard;
      scopeDescription = 'this specific card';
      break;
  }

  if (relevantCards.length === 0) {
    return {
      cardId: card.id,
      card,
      status: 'eligible',
      reason: `No history with ${scopeDescription}. Safe to apply!`,
      confidenceLevel: 'high',
    };
  }

  const hasActiveCard = relevantCards.some((uc) => !uc.cancellationDate);
  if (hasActiveCard) {
    return {
      cardId: card.id,
      card,
      status: 'not_eligible',
      reason: `You currently hold ${scopeDescription}. Cancel first before reapplying.`,
      confidenceLevel: 'high',
    };
  }

  const latestRelevant = relevantCards
    .filter((uc) => uc.cancellationDate)
    .sort(
      (a, b) =>
        new Date(b.cancellationDate as string).getTime() -
        new Date(a.cancellationDate as string).getTime(),
    )[0];

  if (!latestRelevant || !issuer.exclusionPeriodMonths) {
    return {
      cardId: card.id,
      card,
      status: 'grey_area',
      reason: `You've held ${scopeDescription} before. Check current bonus terms.`,
      confidenceLevel: 'medium',
      greyAreaNotes: issuer.notes ?? 'Rules may vary. Verify eligibility.',
    };
  }

  const cancellationDate = new Date(latestRelevant.cancellationDate as string);
  const monthsSinceCancellation = differenceInMonths(now, cancellationDate);

  if (monthsSinceCancellation >= issuer.exclusionPeriodMonths) {
    return {
      cardId: card.id,
      card,
      status: 'eligible',
      reason: `${monthsSinceCancellation} months since you cancelled ${scopeDescription}. Safe to apply!`,
      confidenceLevel: issuer.confidenceLevel,
    };
  }

  const eligibleDate = addMonths(cancellationDate, issuer.exclusionPeriodMonths);
  const daysRemaining = differenceInDays(eligibleDate, now);

  return {
    cardId: card.id,
    card,
    status: 'waiting',
    eligibleDate: format(eligibleDate, 'yyyy-MM-dd'),
    daysRemaining: Math.max(0, daysRemaining),
    reason: `Wait ${issuer.exclusionPeriodMonths} months since cancelling ${scopeDescription}. ${daysRemaining} days to go.`,
    confidenceLevel: issuer.confidenceLevel,
  };
}

export function generateRecommendations(
  allCards: CardWithIssuer[],
  userCards: UserCardWithDetails[],
  allIssuers: Issuer[],
  preferences?: import('./types').UserPreferences,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Resolve preferences: undefined = legacy "show everything" behaviour
  // (tests and any caller that doesn't supply prefs). When preferences are
  // explicitly passed we apply both the card-type hard filter and the
  // program soft boost.
  const allowPersonal = !preferences || preferences.cardType !== 'business';
  const allowBusiness = !preferences || preferences.cardType !== 'personal';
  const hasProgramPreference = (preferences?.preferredPrograms.length ?? 0) > 0;

  for (const card of allCards) {
    // HARD card-type filter — most users can't apply for business cards
    // without an ABN, so hiding them is the correct default behavior.
    if (card.cardType === 'business' && !allowBusiness) continue;
    if (card.cardType === 'personal' && !allowPersonal) continue;

    const eligibility = calculateEligibility(card, userCards, allIssuers);
    // not_eligible cards are kept in the result (with priority 0) so the
    // Tab 4 "Not eligible" section can render them as reference info.
    // They sort to the bottom because nothing boosts a not_eligible card's
    // priority below.

    let priority = 0;

    if (eligibility.status === 'eligible') priority += 100;
    else if (eligibility.status === 'grey_area') priority += 50;
    else if (eligibility.status === 'waiting') priority += 25;

    if (card.bonusPoints) {
      priority += Math.floor(card.bonusPoints / 1000);
    }

    if (eligibility.confidenceLevel === 'high') priority += 20;
    else if (eligibility.confidenceLevel === 'medium') priority += 10;

    if (eligibility.daysRemaining && eligibility.daysRemaining < 30) {
      priority += 15;
    }

    // SOFT program-preference boost. +50 is significant but not so large
    // that a 200k-point non-preferred card gets pushed off the top — the
    // absolute "best move" is still visible regardless of preference.
    const programMatched =
      hasProgramPreference && (preferences?.preferredPrograms ?? []).includes(card.rewardsProgram);
    if (programMatched) priority += 50;

    let reason = '';
    if (eligibility.status === 'eligible') {
      reason = `Safe to apply now${card.bonusPoints ? ` for ${card.bonusPoints.toLocaleString()} points` : ''}.`;
    } else if (eligibility.status === 'grey_area') {
      reason = `Likely eligible${card.bonusPoints ? ` for ${card.bonusPoints.toLocaleString()} points` : ''}. Check terms.`;
    } else if (eligibility.status === 'waiting' && eligibility.daysRemaining) {
      reason = `Unlocks in ${eligibility.daysRemaining} days${card.bonusPoints ? ` for ${card.bonusPoints.toLocaleString()} points` : ''}.`;
    }

    recommendations.push({
      card,
      eligibility,
      priority,
      reason,
      preferenceMatch: {
        programMatched,
        cardTypeAllowed: true, // we filtered above; surviving cards are allowed
      },
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}
