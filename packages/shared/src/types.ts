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
}

export interface CardWithIssuer extends Card {
  issuer: Issuer;
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
