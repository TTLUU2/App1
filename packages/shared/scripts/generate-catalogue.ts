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
  Benefit,
  BenefitCategory,
  BenefitPeriod,
  Card,
  CardType,
  ConfidenceLevel,
  EligibilityScope,
  EligibilityType,
  Issuer,
  RewardsProgram,
} from '../src/types';

// Fixed namespace UUIDs so catalogue ids stay deterministic across regenerations.
const ISSUER_NAMESPACE = '7c1f4e9a-6d3b-4c0a-9f0e-3a8a2b6d1f01';
const CARD_NAMESPACE = '7c1f4e9a-6d3b-4c0a-9f0e-3a8a2b6d1f02';
const BENEFIT_NAMESPACE = '7c1f4e9a-6d3b-4c0a-9f0e-3a8a2b6d1f03';

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

// Per-card guide URLs from the canonical upstream at
// https://www.pointhacks.com.au/credit-cards/ — extracted via the site's
// sitemap (cardguide-sitemap.xml), which carries more entries than the
// public index. Cards without a dedicated guide map to null; the UI falls
// back to the index URL in that case.
//
// Re-extract when seed.ts adds/renames cards: WebFetch the sitemap, then
// match each catalogue name to the closest -guide slug. Sitemap is the
// source of truth; the public index page paginates and may hide cards.
export const POINT_HACKS_URLS: Record<string, string | null> = {
  'American Express Platinum Card':
    'https://www.pointhacks.com.au/credit-cards/american-express-platinum-guide/',
  'American Express Explorer':
    'https://www.pointhacks.com.au/credit-cards/american-express-explorer-guide/',
  'American Express Velocity Platinum':
    'https://www.pointhacks.com.au/credit-cards/american-express-velocity-platinum-guide/',
  'Qantas American Express Ultimate':
    'https://www.pointhacks.com.au/credit-cards/qantas-american-express-ultimate-guide/',
  'Qantas American Express Premium':
    'https://www.pointhacks.com.au/credit-cards/qantas-american-express-premium-guide/',
  'American Express Velocity Business':
    'https://www.pointhacks.com.au/credit-cards/american-express-velocity-business-guide/',
  'American Express Business Platinum':
    'https://www.pointhacks.com.au/credit-cards/american-express-platinum-business-guide/',
  'American Express Business Explorer': null,
  'American Express David Jones Platinum': null,
  'ANZ Rewards Black': 'https://www.pointhacks.com.au/credit-cards/anz-rewards-black-guide/',
  'ANZ Frequent Flyer Black':
    'https://www.pointhacks.com.au/credit-cards/anz-frequent-flyer-black-guide/',
  'ANZ Rewards Platinum': 'https://www.pointhacks.com.au/credit-cards/anz-rewards-platinum-guide/',
  'ANZ Frequent Flyer Platinum':
    'https://www.pointhacks.com.au/credit-cards/anz-frequent-flyer-platinum-guide/',
  'Westpac Altitude Qantas Black':
    'https://www.pointhacks.com.au/credit-cards/westpac-altitude-qantas-black-guide/',
  // Westpac Altitude Platinum: catalogue name lacks a program qualifier;
  // mapped to the Rewards (non-FF) Platinum guide — confirm with editorial.
  'Westpac Altitude Platinum':
    'https://www.pointhacks.com.au/credit-cards/westpac-altitude-rewards-platinum-guide/',
  'Westpac Altitude Velocity Black':
    'https://www.pointhacks.com.au/credit-cards/westpac-altitude-velocity-black-guide/',
  'Westpac Altitude Velocity Platinum':
    'https://www.pointhacks.com.au/credit-cards/westpac-altitude-velocity-platinum-guide/',
  'NAB Qantas Rewards Signature':
    'https://www.pointhacks.com.au/credit-cards/nab-qantas-rewards-signature-guide/',
  'NAB Qantas Rewards Premium':
    'https://www.pointhacks.com.au/credit-cards/nab-qantas-rewards-premium-guide/',
  'NAB Rewards Signature':
    'https://www.pointhacks.com.au/credit-cards/nab-rewards-signature-guide/',
  'NAB Rewards Platinum': 'https://www.pointhacks.com.au/credit-cards/nab-rewards-platinum-guide/',
  'Qantas Money Platinum':
    'https://www.pointhacks.com.au/credit-cards/qantas-premier-platinum-card-guide/',
  'Qantas Money Titanium':
    'https://www.pointhacks.com.au/credit-cards/qantas-premier-titanium-card-guide/',
  'Citi Prestige': 'https://www.pointhacks.com.au/credit-cards/citi-prestige-card-guide/',
  'Citi Premier': 'https://www.pointhacks.com.au/credit-cards/citi-premier-card-guide/',
  'Citi Rewards': null,
  'HSBC Platinum Qantas': 'https://www.pointhacks.com.au/credit-cards/hsbc-platinum-qantas-guide/',
  'HSBC Star Alliance': 'https://www.pointhacks.com.au/credit-cards/hsbc-star-alliance-card-guide/',
  'CommBank Ultimate Awards':
    'https://www.pointhacks.com.au/credit-cards/commbank-ultimate-awards-card-guide/',
  'CommBank Smart Awards': null,
  'CommBank Awards': null,
  'Virgin Money High Flyer':
    'https://www.pointhacks.com.au/credit-cards/virgin-money-high-flyer-visa-guide/',
  'Virgin Money Flyer': 'https://www.pointhacks.com.au/credit-cards/virgin-money-flyer-visa-guide/',
  'Virgin Money No Annual Fee': null,
};

// Hero card-art image URLs on plastic.pointhacks.com.au. Extracted by
// fetching each Point Hacks guide page and picking the primary product
// image. 28 of 34 cards have a clear image; the rest fall back to the
// procedural tinted gradient in <CardArt>. Re-extract when seed changes
// using the same approach as POINT_HACKS_URLS above.
export const POINT_HACKS_ART_URLS: Record<string, string | null> = {
  'American Express Platinum Card':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2jnnoewycj09/amex_platinum_charge_2022_6xljjf9deh.jpg',
  'American Express Explorer':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2jqn6xwyk709/american_express_explorer_card_art_november_2024_arjvjbew8m.jpg',
  'American Express Velocity Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2k6qzhwzr009/american_express_velocity_platinum_card_art_2024_49yh3firx7.jpeg',
  'Qantas American Express Ultimate':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2fhvlxwpsq09/qantas_american_express_ultimate_card_art_2024_lw48ej3v5b.jpg',
  'Qantas American Express Premium':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2gbmvcwrc509/qantas_american_express_premium_card_art_2024_vaos32059g.jpg',
  'American Express Velocity Business':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2jtubywyte09/american_express_velocity_business_card_november_2024_8ywiovg8hz.jpg',
  'American Express Business Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2gkaw9wru109/amex_platinum_business_2022_600px_x465e2m7ws.jpg',
  'American Express Business Explorer': null,
  'American Express David Jones Platinum': null,
  'ANZ Rewards Black':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjknttt9jue8w09/anz_rewards_black_visa_s7rwnzufb8.jpg',
  'ANZ Frequent Flyer Black':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjknvh2xvugq509/anz_frequent_flyer_black_visa_6ibk1p3ynr.jpg',
  'ANZ Rewards Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjknt9di9uddp09/anz_rewards_platinum_600_px_wwlozabnnu.jpg',
  'ANZ Frequent Flyer Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjknv6hd1ug9p09/anz_ff_platinum_visa_600px_0538qyaam2.jpg',
  'Westpac Altitude Qantas Black':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cka5ybmc8pu1h08/westpac_altitude_black_2023_fknlgqsd7s.jpg',
  'Westpac Altitude Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cka5x0ssypqy908/altitude_platinum_2023_6vcc4gv533.jpg',
  'Westpac Altitude Velocity Black':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cldie1bixep4y0b/westpac_altitude_velocity_black_2025_1radouosgy.jpeg',
  'Westpac Altitude Velocity Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cldwl708u5s0c0a/westpac_altitude_velocity_platinum_2023_rlcx95salf.jpg',
  'NAB Qantas Rewards Signature':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkw9fq7r1e9509/nab_qantas_signature_card_art_2028_qkoxmp0i2r.jpeg',
  'NAB Qantas Rewards Premium':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkw98yry1dwy09/nab_qantas_platinum_card_art_2028_g72jpgc3df.jpeg',
  'NAB Rewards Signature':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkwcchfg1j1y09/nab_rewards_signature_card_art_2028_xwhzqycmot.jpeg',
  'NAB Rewards Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkwc7zwi1itw09/nab_rewards_platinum_card_art_2028_wmdsopry51.jpeg',
  'Qantas Money Platinum':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjm241rlwwy5v09/qantas_money_platinum_card_art_e9ebj2sysx.jpeg',
  'Qantas Money Titanium':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjs11tdtueo8308/qantas_money_titanium_card_art_srnuyrq74y.jpeg',
  'Citi Prestige':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkts6qss3h5f09/citi_prestige_mastercard_1rfn5vguak.jpg',
  'Citi Premier':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjktsifed3hmp09/citi_premier_mastercard_ahmj98jr9q.jpg',
  'Citi Rewards': null,
  'HSBC Platinum Qantas': null,
  'HSBC Star Alliance':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/clb1tlke72a0y09/hsbc_star_alliance_card_4zj1t0xz3a.jpg',
  'CommBank Ultimate Awards':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/ckacezu3o4g0n08/commbank_ultimate_awards_card_5gyy7e875f.jpg',
  'CommBank Smart Awards': null,
  'CommBank Awards':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjlr7gh4gbvds09/commbank_awards_8uxgzpjz8c.jpg',
  'Virgin Money High Flyer':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkwdxxvs1lra09/virginmoney_high_flyer_visa_qemy3qd1yd.jpg',
  'Virgin Money Flyer':
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjkwdjhj61l4l09/virgin_money_flyer_card_g3tiv493ck.jpg',
  'Virgin Money No Annual Fee': null,
};

// ── Benefits (placeholder dataset, see Decisions doc) ─────────────────────
//
// Three tiers by annualFee:
//   - Premium (>= $350): travel credit + hotel credit
//   - Mid    ($100–349): annual statement credit
//   - Basic  (< $100):   no benefits
//
// Values are realistic AU defaults derived from common card-tier benefits as
// of early 2026. Swap in real per-card metadata when editorial provides it.

interface BenefitTemplate {
  name: string;
  description: string;
  valueAud: number;
  category: BenefitCategory;
  period: BenefitPeriod;
}

const PREMIUM_BENEFITS: BenefitTemplate[] = [
  {
    name: 'Annual travel credit',
    description: 'Statement credit for eligible travel bookings, refreshed each card year.',
    valueAud: 400,
    category: 'travel_credit',
    period: 'annual',
  },
  {
    name: 'Hotel credit',
    description: 'Credit on eligible hotel bookings each card year.',
    valueAud: 200,
    category: 'hotel_credit',
    period: 'annual',
  },
];

const MID_BENEFITS: BenefitTemplate[] = [
  {
    name: 'Annual statement credit',
    description: 'Annual statement credit, refreshed each card year.',
    valueAud: 100,
    category: 'statement_credit',
    period: 'annual',
  },
];

function benefitsForCard(card: SeedCard): BenefitTemplate[] {
  if (card.annualFee >= 350) return PREMIUM_BENEFITS;
  if (card.annualFee >= 100) return MID_BENEFITS;
  return [];
}

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
    if (!(d.name in POINT_HACKS_URLS)) {
      throw new Error(
        `Card "${d.name}" has no entry in POINT_HACKS_URLS. Add it (set to null if no guide exists).`,
      );
    }
    if (!(d.name in POINT_HACKS_ART_URLS)) {
      throw new Error(
        `Card "${d.name}" has no entry in POINT_HACKS_ART_URLS. Add it (null if no image found).`,
      );
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
      pointHacksUrl: POINT_HACKS_URLS[d.name] ?? null,
      cardArtUrl: POINT_HACKS_ART_URLS[d.name] ?? null,
    };
  });

  // Generate per-card placeholder benefits.
  const benefits: Benefit[] = [];
  for (const seed of cardData) {
    const card = cards.find((c) => c.name === seed.name);
    if (!card) continue;
    for (const tpl of benefitsForCard(seed)) {
      benefits.push({
        id: uuidv5(`${card.id}:${tpl.name}`, BENEFIT_NAMESPACE),
        cardId: card.id,
        name: tpl.name,
        description: tpl.description,
        valueAud: tpl.valueAud,
        category: tpl.category,
        period: tpl.period,
      });
    }
  }

  const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  writeFileSync(join(dataDir, 'issuers.json'), JSON.stringify(issuers, null, 2) + '\n');
  writeFileSync(join(dataDir, 'cards.json'), JSON.stringify(cards, null, 2) + '\n');
  writeFileSync(join(dataDir, 'benefits.json'), JSON.stringify(benefits, null, 2) + '\n');

  console.log(
    `Wrote ${issuers.length} issuers, ${cards.length} cards, ${benefits.length} benefits.`,
  );
}

main();
