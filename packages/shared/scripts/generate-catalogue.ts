// Idempotent regenerator for data/issuers.json and data/cards.json.
//
// Source data is mirrored inline from docs/Bonus Eligibility Reference/seed.ts
// (the original imports a drizzle db handle we don't have; the data values are
// unchanged). Re-run with `pnpm --filter @ph/shared generate-catalogue` whenever
// the source seed changes — UUIDs are derived via uuid v5 from a fixed
// namespace, so they stay stable across runs.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { v5 as uuidv5 } from 'uuid';
import type {
  CardType,
  ConfidenceLevel,
  EligibilityScope,
  EligibilityType,
  Issuer,
  Card,
  RewardsProgram,
} from '../src/types';

// Fixed namespace UUIDs so catalogue ids stay deterministic across regenerations.
const ISSUER_NAMESPACE = '7c1f4e9a-6d3b-4c0a-9f0e-3a8a2b6d1f01';
const CARD_NAMESPACE = '7c1f4e9a-6d3b-4c0a-9f0e-3a8a2b6d1f02';

interface SeedIssuer {
  name: string;
  shortName: string;
  eligibilityType: EligibilityType;
  exclusionPeriodMonths: number | null;
  scope: EligibilityScope;
  confidenceLevel: ConfidenceLevel;
  notes: string | null;
}

interface SeedCard {
  issuerShort: string;
  name: string;
  cardType: CardType;
  bonusPoints: number | null;
  annualFee: number;
  rewardsProgram: RewardsProgram;
  cardFamily: string | null;
}

const issuerData: SeedIssuer[] = [
  {
    name: 'American Express',
    shortName: 'Amex',
    eligibilityType: 'once_per_card',
    exclusionPeriodMonths: null,
    scope: 'card_family',
    confidenceLevel: 'medium',
    notes:
      'Lifetime-style rules for most cards. Targeted offers may bypass. Business cards have separate pool from personal.',
  },
  {
    name: 'ANZ',
    shortName: 'ANZ',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 24,
    scope: 'issuer_wide',
    confidenceLevel: 'high',
    notes: '24 month issuer-wide waiting. FF and Rewards programs block each other.',
  },
  {
    name: 'Westpac',
    shortName: 'Westpac',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 24,
    scope: 'card_family',
    confidenceLevel: 'medium',
    notes:
      '24 month family-wide waiting for Altitude cards. QF/Rewards/Velocity considered same family.',
  },
  {
    name: 'NAB',
    shortName: 'NAB',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 18,
    scope: 'card_family',
    confidenceLevel: 'medium',
    notes:
      'NAB Rewards has 18 month family-wide wait. NAB Qantas has different family. Check specific card terms.',
  },
  {
    name: 'Qantas Money',
    shortName: 'Qantas',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 12,
    scope: 'card_family',
    confidenceLevel: 'medium',
    notes: '12 month within family. Possible 24 month QFF first-time overlay for some offers.',
  },
  {
    name: 'Citi',
    shortName: 'Citi',
    eligibilityType: 'new_to_bank',
    exclusionPeriodMonths: null,
    scope: 'issuer_wide',
    confidenceLevel: 'medium',
    notes: 'If you currently hold another Citi card, not eligible. Otherwise no waiting period.',
  },
  {
    name: 'HSBC',
    shortName: 'HSBC',
    eligibilityType: 'first_time_only',
    exclusionPeriodMonths: null,
    scope: 'issuer_wide',
    confidenceLevel: 'low',
    notes: 'Offer-specific blackout. Often no fixed waiting period. Check current terms carefully.',
  },
  {
    name: 'CommBank',
    shortName: 'CBA',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 12,
    scope: 'same_card',
    confidenceLevel: 'medium',
    notes: '12 month same-card wait. Soft enforcement historically.',
  },
  {
    name: 'Virgin Money',
    shortName: 'Virgin',
    eligibilityType: 'time_based',
    exclusionPeriodMonths: 12,
    scope: 'same_card',
    confidenceLevel: 'medium',
    notes: '12 month same-card wait. Program changes may affect eligibility.',
  },
];

const cardData: SeedCard[] = [
  // American Express
  {
    issuerShort: 'Amex',
    name: 'American Express Platinum Card',
    cardType: 'personal',
    bonusPoints: 200000,
    annualFee: 1450,
    rewardsProgram: 'flexible',
    cardFamily: 'Platinum',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express Explorer',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 399,
    rewardsProgram: 'flexible',
    cardFamily: 'Explorer',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express Velocity Platinum',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 450,
    rewardsProgram: 'velocity',
    cardFamily: 'Velocity',
  },
  {
    issuerShort: 'Amex',
    name: 'Qantas American Express Ultimate',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 450,
    rewardsProgram: 'qantas',
    cardFamily: 'Qantas',
  },
  {
    issuerShort: 'Amex',
    name: 'Qantas American Express Premium',
    cardType: 'personal',
    bonusPoints: 55000,
    annualFee: 249,
    rewardsProgram: 'qantas',
    cardFamily: 'Qantas',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express Velocity Business',
    cardType: 'business',
    bonusPoints: 100000,
    annualFee: 450,
    rewardsProgram: 'velocity',
    cardFamily: 'Business Velocity',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express Business Platinum',
    cardType: 'business',
    bonusPoints: 150000,
    annualFee: 1750,
    rewardsProgram: 'flexible',
    cardFamily: 'Business Platinum',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express Business Explorer',
    cardType: 'business',
    bonusPoints: 100000,
    annualFee: 149,
    rewardsProgram: 'flexible',
    cardFamily: 'Business Explorer',
  },
  {
    issuerShort: 'Amex',
    name: 'American Express David Jones Platinum',
    cardType: 'personal',
    bonusPoints: 50000,
    annualFee: 295,
    rewardsProgram: 'flexible',
    cardFamily: 'David Jones',
  },

  // ANZ
  {
    issuerShort: 'ANZ',
    name: 'ANZ Rewards Black',
    cardType: 'personal',
    bonusPoints: 120000,
    annualFee: 375,
    rewardsProgram: 'flexible',
    cardFamily: 'Rewards',
  },
  {
    issuerShort: 'ANZ',
    name: 'ANZ Frequent Flyer Black',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 425,
    rewardsProgram: 'qantas',
    cardFamily: 'FF',
  },
  {
    issuerShort: 'ANZ',
    name: 'ANZ Rewards Platinum',
    cardType: 'personal',
    bonusPoints: 60000,
    annualFee: 150,
    rewardsProgram: 'flexible',
    cardFamily: 'Rewards',
  },
  {
    issuerShort: 'ANZ',
    name: 'ANZ Frequent Flyer Platinum',
    cardType: 'personal',
    bonusPoints: 75000,
    annualFee: 295,
    rewardsProgram: 'qantas',
    cardFamily: 'FF',
  },

  // Westpac
  {
    issuerShort: 'Westpac',
    name: 'Westpac Altitude Qantas Black',
    cardType: 'personal',
    bonusPoints: 150000,
    annualFee: 370,
    rewardsProgram: 'qantas',
    cardFamily: 'Altitude',
  },
  {
    issuerShort: 'Westpac',
    name: 'Westpac Altitude Platinum',
    cardType: 'personal',
    bonusPoints: 50000,
    annualFee: 150,
    rewardsProgram: 'qantas',
    cardFamily: 'Altitude',
  },
  {
    issuerShort: 'Westpac',
    name: 'Westpac Altitude Velocity Black',
    cardType: 'personal',
    bonusPoints: 75000,
    annualFee: 250,
    rewardsProgram: 'velocity',
    cardFamily: 'Altitude',
  },
  {
    issuerShort: 'Westpac',
    name: 'Westpac Altitude Velocity Platinum',
    cardType: 'personal',
    bonusPoints: 40000,
    annualFee: 150,
    rewardsProgram: 'velocity',
    cardFamily: 'Altitude',
  },

  // NAB
  {
    issuerShort: 'NAB',
    name: 'NAB Qantas Rewards Signature',
    cardType: 'personal',
    bonusPoints: 130000,
    annualFee: 420,
    rewardsProgram: 'qantas',
    cardFamily: 'NAB Qantas',
  },
  {
    issuerShort: 'NAB',
    name: 'NAB Qantas Rewards Premium',
    cardType: 'personal',
    bonusPoints: 60000,
    annualFee: 199,
    rewardsProgram: 'qantas',
    cardFamily: 'NAB Qantas',
  },
  {
    issuerShort: 'NAB',
    name: 'NAB Rewards Signature',
    cardType: 'personal',
    bonusPoints: 80000,
    annualFee: 195,
    rewardsProgram: 'flexible',
    cardFamily: 'NAB Rewards',
  },
  {
    issuerShort: 'NAB',
    name: 'NAB Rewards Platinum',
    cardType: 'personal',
    bonusPoints: 40000,
    annualFee: 95,
    rewardsProgram: 'flexible',
    cardFamily: 'NAB Rewards',
  },

  // Qantas Money
  {
    issuerShort: 'Qantas',
    name: 'Qantas Money Platinum',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 399,
    rewardsProgram: 'qantas',
    cardFamily: 'Qantas Money',
  },
  {
    issuerShort: 'Qantas',
    name: 'Qantas Money Titanium',
    cardType: 'personal',
    bonusPoints: 120000,
    annualFee: 449,
    rewardsProgram: 'qantas',
    cardFamily: 'Qantas Money',
  },

  // Citi
  {
    issuerShort: 'Citi',
    name: 'Citi Prestige',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 700,
    rewardsProgram: 'flexible',
    cardFamily: 'Prestige',
  },
  {
    issuerShort: 'Citi',
    name: 'Citi Premier',
    cardType: 'personal',
    bonusPoints: 75000,
    annualFee: 199,
    rewardsProgram: 'flexible',
    cardFamily: 'Premier',
  },
  {
    issuerShort: 'Citi',
    name: 'Citi Rewards',
    cardType: 'personal',
    bonusPoints: 50000,
    annualFee: 149,
    rewardsProgram: 'flexible',
    cardFamily: 'Rewards',
  },

  // HSBC
  {
    issuerShort: 'HSBC',
    name: 'HSBC Platinum Qantas',
    cardType: 'personal',
    bonusPoints: 100000,
    annualFee: 199,
    rewardsProgram: 'qantas',
    cardFamily: 'Platinum',
  },
  {
    issuerShort: 'HSBC',
    name: 'HSBC Star Alliance',
    cardType: 'personal',
    bonusPoints: 60000,
    annualFee: 199,
    rewardsProgram: 'flexible',
    cardFamily: 'Star Alliance',
  },

  // CommBank
  {
    issuerShort: 'CBA',
    name: 'CommBank Ultimate Awards',
    cardType: 'personal',
    bonusPoints: 80000,
    annualFee: 349,
    rewardsProgram: 'flexible',
    cardFamily: 'Ultimate',
  },
  {
    issuerShort: 'CBA',
    name: 'CommBank Smart Awards',
    cardType: 'personal',
    bonusPoints: 40000,
    annualFee: 119,
    rewardsProgram: 'flexible',
    cardFamily: 'Smart',
  },
  {
    issuerShort: 'CBA',
    name: 'CommBank Awards',
    cardType: 'personal',
    bonusPoints: 30000,
    annualFee: 89,
    rewardsProgram: 'flexible',
    cardFamily: 'Awards',
  },

  // Virgin Money
  {
    issuerShort: 'Virgin',
    name: 'Virgin Money High Flyer',
    cardType: 'personal',
    bonusPoints: 75000,
    annualFee: 289,
    rewardsProgram: 'velocity',
    cardFamily: 'High Flyer',
  },
  {
    issuerShort: 'Virgin',
    name: 'Virgin Money Flyer',
    cardType: 'personal',
    bonusPoints: 40000,
    annualFee: 129,
    rewardsProgram: 'velocity',
    cardFamily: 'Flyer',
  },
  {
    issuerShort: 'Virgin',
    name: 'Virgin Money No Annual Fee',
    cardType: 'personal',
    bonusPoints: 10000,
    annualFee: 0,
    rewardsProgram: 'velocity',
    cardFamily: 'No Fee',
  },
];

function main(): void {
  const issuers: Issuer[] = issuerData.map((d) => ({
    id: uuidv5(d.shortName, ISSUER_NAMESPACE),
    ...d,
  }));

  const issuerIdByShort = new Map(issuers.map((i) => [i.shortName, i.id]));

  const cards: Card[] = cardData.map((d) => {
    const issuerId = issuerIdByShort.get(d.issuerShort);
    if (!issuerId) {
      throw new Error(`Unknown issuer shortName "${d.issuerShort}" referenced by card "${d.name}"`);
    }
    return {
      id: uuidv5(d.name, CARD_NAMESPACE),
      issuerId,
      name: d.name,
      cardType: d.cardType,
      cardFamily: d.cardFamily,
      bonusPoints: d.bonusPoints,
      annualFee: d.annualFee,
      rewardsProgram: d.rewardsProgram,
    };
  });

  const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  writeFileSync(join(dataDir, 'issuers.json'), JSON.stringify(issuers, null, 2) + '\n');
  writeFileSync(join(dataDir, 'cards.json'), JSON.stringify(cards, null, 2) + '\n');

  console.log(`Wrote ${issuers.length} issuers and ${cards.length} cards.`);
}

main();
