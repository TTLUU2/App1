// Schema types for the Point Hacks Copilot eligibility engine.
//
// Field names and union literals are taken from the deployed web prototype
// (verified by grepping its JS bundle); see docs/.prototype-schema-notes.md.
// The engine imports these types instead of @shared/schema from the prototype.

export type EligibilityType = 'first_time_only' | 'new_to_bank' | 'once_per_card' | 'time_based';

export type EligibilityScope = 'issuer_wide' | 'card_family' | 'same_card';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type CardType = 'personal' | 'business';

export type RewardsProgram = 'qantas' | 'velocity' | 'flexible' | 'bank';

export type EligibilityStatus = 'eligible' | 'waiting' | 'grey_area' | 'not_eligible';

export interface Issuer {
  id: string;
  name: string;
  shortName: string;
  eligibilityType: EligibilityType;
  exclusionPeriodMonths: number | null;
  scope: EligibilityScope;
  confidenceLevel: ConfidenceLevel;
  notes: string | null;
}

export interface Card {
  id: string;
  issuerId: string;
  name: string;
  cardType: CardType;
  cardFamily: string | null;
  bonusPoints: number | null;
  annualFee: number;
  rewardsProgram: RewardsProgram;
  /**
   * Direct deep-link to the per-card Point Hacks guide at
   * https://www.pointhacks.com.au/credit-cards/ — the canonical upstream
   * for AU card offers, art, and editorial content per the updated PRD §10.3.
   * Null when no dedicated guide exists; the UI falls back to the index.
   */
  pointHacksUrl: string | null;
  /**
   * Hero card-art image URL on plastic.pointhacks.com.au. Null when no
   * image is available — the UI falls back to a procedural tinted gradient.
   * Extracted from Point Hacks card guide pages.
   */
  cardArtUrl: string | null;
}

export interface CardWithIssuer extends Card {
  issuer: Issuer;
}

// Trackable benefits attached to a card. The seed currently ships coarse
// placeholders by card tier (premium → travel + hotel credits; mid → annual
// statement credit; basic → none). Replace with real per-card metadata when
// editorial data lands — the schema is stable.
export type BenefitCategory =
  | 'travel_credit'
  | 'hotel_credit'
  | 'statement_credit'
  | 'dining_credit'
  | 'insurance';

export type BenefitPeriod = 'annual' | 'biannual' | 'quarterly' | 'monthly' | 'one_off';

export interface Benefit {
  id: string;
  cardId: string;
  name: string;
  description: string;
  valueAud: number;
  category: BenefitCategory;
  period: BenefitPeriod;
}

// Per-user redemption record (PRD §16.2). For a recurring benefit (annual,
// quarterly, etc.), one row per period the user has marked it Used.
export interface UserBenefitRedemption {
  id: string;
  userCardId: string;
  benefitId: string;
  periodStartDate: string; // yyyy-MM-dd
  periodEndDate: string; // yyyy-MM-dd
  redeemedAt: string; // ISO
  redeemedAmount: number | null;
}

// Mutable user-owned record. Full PRD §16.2 fieldset; M1's manual-add form
// captures a subset and leaves the rest null/undefined for M2/M3 to populate.
export interface UserCard {
  id: string;
  cardId: string;
  applicationDate: string; // ISO yyyy-MM-dd
  cancellationDate: string | null;
  bonusReceived: boolean;
  notes: string | null;
  createdAt: string;

  // M1 manual-add additions (privacy-safe — no PAN, no CVV):
  nickname?: string | null;
  last4?: string | null;
  expiryMonthYear?: string | null; // 'MM/YY'

  // Reserved for M2 (Tab 3 / spend & benefit tracking). Nullable in M1 rows.
  activationDate?: string | null;
  annualFeeNextDueDate?: string | null;
  bonusTarget?: number | null;
  bonusSpentToDate?: number | null;
  bonusSpendWindowEndDate?: string | null;
}

export interface UserCardWithDetails extends UserCard {
  card: CardWithIssuer;
}

export interface EligibilityResult {
  cardId: string;
  card: CardWithIssuer;
  status: EligibilityStatus;
  reason: string;
  confidenceLevel: ConfidenceLevel;
  greyAreaNotes?: string;
  eligibleDate?: string; // yyyy-MM-dd
  daysRemaining?: number;
}

export interface Recommendation {
  card: CardWithIssuer;
  eligibility: EligibilityResult;
  priority: number;
  reason: string;
}
