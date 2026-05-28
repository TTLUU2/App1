import { db } from './db';
import { issuers, cards, userCards } from '@shared/schema';

const issuerData = [
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

const cardData = [
  // American Express - from Point Hacks (scraped Feb 2026)
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

  // ANZ - from Point Hacks
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

  // Westpac - from Point Hacks (150k bonus offer)
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

  // NAB - from Point Hacks (130k + $250 cashback offer)
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

  // Qantas Money - from Point Hacks (100k offer)
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

  // CommBank (CBA)
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

export async function seedDatabase(force = false) {
  try {
    const existingIssuers = await db.select().from(issuers);

    if (existingIssuers.length > 0 && !force) {
      console.log('Database already seeded, skipping...');
      return { status: 'skipped', message: 'Database already seeded' };
    }

    if (force && existingIssuers.length > 0) {
      console.log('Force reseeding - clearing existing data...');
      await db.delete(userCards);
      await db.delete(cards);
      await db.delete(issuers);
    }

    console.log('Seeding database with Australian issuers and cards from Point Hacks...');

    const issuerMap: Record<string, string> = {};
    for (const issuer of issuerData) {
      const [created] = await db.insert(issuers).values(issuer).returning();
      issuerMap[issuer.shortName] = created.id;
      console.log(`Created issuer: ${issuer.name}`);
    }

    for (const card of cardData) {
      const issuerId = issuerMap[card.issuerShort];
      if (!issuerId) {
        console.log(`Skipping card ${card.name} - issuer not found`);
        continue;
      }

      await db.insert(cards).values({
        issuerId,
        name: card.name,
        cardType: card.cardType,
        cardFamily: card.cardFamily,
        bonusPoints: card.bonusPoints,
        annualFee: card.annualFee,
        rewardsProgram: card.rewardsProgram,
      });
      console.log(`Created card: ${card.name}`);
    }

    console.log('Database seeding complete!');
    return { status: 'success', cardsCreated: cardData.length, issuersCreated: issuerData.length };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
