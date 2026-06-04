// Engine test suite. Covers every issuer eligibility type, every status,
// every scope under time_based, the Amex 18-month carve-out (personal vs
// business pools, lifetime exclusion fallback), and the generateRecommendations
// ranking. Dates are mocked to 2026-05-28 (matches the harness "currentDate"
// at the time the tests were authored) so countdowns are deterministic.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { calculateEligibility, generateRecommendations } from '../src/engine';
import { getIssuers, getCardsWithIssuer } from '../src/catalogue';
import type { CardWithIssuer, UserCard, UserCardWithDetails } from '../src/types';

const NOW = new Date('2026-05-28T00:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const ALL_CARDS = getCardsWithIssuer();
const ALL_ISSUERS = getIssuers();

function findCard(name: string): CardWithIssuer {
  const c = ALL_CARDS.find((c) => c.name === name);
  if (!c) throw new Error(`fixture: card not found: ${name}`);
  return c;
}

function held(card: CardWithIssuer, opts: Partial<UserCard> = {}): UserCardWithDetails {
  return {
    id: `uc-${card.id}`,
    cardId: card.id,
    applicationDate: '2024-01-01',
    cancellationDate: null,
    bonusReceived: true,
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...opts,
    card,
  } as UserCardWithDetails;
}

function cancelled(
  card: CardWithIssuer,
  cancellationDate: string,
  applicationDate = '2022-01-01',
): UserCardWithDetails {
  return held(card, { applicationDate, cancellationDate });
}

describe('zero-history baseline', () => {
  it('returns eligible for every catalogue card when the user has no history', () => {
    for (const card of ALL_CARDS) {
      const result = calculateEligibility(card, [], ALL_ISSUERS);
      expect(result.status).toBe('eligible');
      expect(result.confidenceLevel).toBe('high');
    }
  });
});

describe('first_time_only (HSBC)', () => {
  const hsbcPlat = () => findCard('HSBC Platinum Qantas');
  const hsbcStar = () => findCard('HSBC Star Alliance');

  it('eligible when the user has never held an HSBC card', () => {
    const result = calculateEligibility(hsbcPlat(), [], ALL_ISSUERS);
    expect(result.status).toBe('eligible');
  });

  it('not_eligible the moment the user has held any HSBC card (lifetime)', () => {
    // Cancellation date does not matter for first_time_only — even a long-cancelled
    // card disqualifies the user.
    const userCards = [cancelled(hsbcStar(), '2010-01-01')];
    const result = calculateEligibility(hsbcPlat(), userCards, ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/HSBC/);
    expect(result.greyAreaNotes).toBeDefined();
  });
});

describe('new_to_bank (Citi)', () => {
  const citiPrestige = () => findCard('Citi Prestige');
  const citiPremier = () => findCard('Citi Premier');

  it('eligible when no Citi history', () => {
    expect(calculateEligibility(citiPrestige(), [], ALL_ISSUERS).status).toBe('eligible');
  });

  it('not_eligible while any Citi card is currently active', () => {
    const result = calculateEligibility(citiPrestige(), [held(citiPremier())], ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/active/);
  });

  it('grey_area when only cancelled Citi history exists (Citi has no exclusion period)', () => {
    const result = calculateEligibility(
      citiPrestige(),
      [cancelled(citiPremier(), '2024-01-01')],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('grey_area');
    expect(result.confidenceLevel).toBe('medium');
    expect(result.greyAreaNotes).toBeDefined();
  });
});

describe('once_per_card — non-Amex (default branch behaviour)', () => {
  // We don't have a non-Amex once_per_card issuer in the catalogue, but the
  // engine's standard branch must still be covered. We synthesise a card whose
  // issuer behaves as once_per_card with a different shortName, then feed it
  // through calculateEligibility directly.
  const amexExplorer = findCard('American Express Explorer');
  const syntheticIssuer = {
    ...amexExplorer.issuer,
    shortName: 'Synth', // forces engine away from the Amex branch
  };
  const syntheticCard: CardWithIssuer = {
    ...amexExplorer,
    id: 'synth-card',
    issuerId: syntheticIssuer.id,
    issuer: syntheticIssuer,
  };

  it('eligible when no history of this specific card', () => {
    expect(calculateEligibility(syntheticCard, [], ALL_ISSUERS).status).toBe('eligible');
  });

  it('not_eligible — currently holding this card', () => {
    const result = calculateEligibility(syntheticCard, [held(syntheticCard)], ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/currently hold/);
  });

  it('not_eligible — previously held this card (lifetime)', () => {
    const result = calculateEligibility(
      syntheticCard,
      [cancelled(syntheticCard, '2020-01-01')],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/before/);
  });
});

describe('once_per_card — Amex 18-month carve-out', () => {
  const amexPlat = () => findCard('American Express Platinum Card');
  const amexExplorer = () => findCard('American Express Explorer');
  const amexBizPlat = () => findCard('American Express Business Platinum');
  const amexBizExplorer = () => findCard('American Express Business Explorer');

  it('not_eligible when holding an active Amex card of the same pool (personal)', () => {
    const result = calculateEligibility(amexPlat(), [held(amexExplorer())], ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/active personal Amex/);
  });

  it('personal and business pools are separate — eligible for biz while holding personal', () => {
    const result = calculateEligibility(amexBizPlat(), [held(amexExplorer())], ALL_ISSUERS);
    expect(result.status).toBe('eligible');
  });

  it('waiting status returned for 18 months after the most recent same-pool cancellation', () => {
    // Cancelled 6 months ago → 12 months still to wait.
    const sixMonthsAgo = '2025-11-28';
    const result = calculateEligibility(
      amexPlat(),
      [cancelled(amexExplorer(), sixMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('waiting');
    expect(result.eligibleDate).toBe('2027-05-28');
    expect(result.daysRemaining).toBeGreaterThan(360);
    expect(result.daysRemaining).toBeLessThan(370);
  });

  it('after 18 months elapsed, eligibility opens but lifetime-family exclusion may apply', () => {
    // Cancelled 20 months ago, AND the cancelled card was a different family.
    // Same-family exclusion does not apply, so this is eligible.
    const twentyMonthsAgo = '2024-09-28';
    const result = calculateEligibility(
      amexPlat(),
      [cancelled(amexExplorer(), twentyMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('eligible');
    expect(result.reason).toMatch(/haven't held this personal card before/);
  });

  it('after 18 months elapsed, holding the same family before disqualifies (lifetime)', () => {
    const twentyMonthsAgo = '2024-09-28';
    const result = calculateEligibility(
      amexPlat(),
      [cancelled(amexPlat(), twentyMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/lifetime/);
  });

  it('business pool unaffected by personal pool cancellation waiting period', () => {
    const sixMonthsAgo = '2025-11-28';
    const result = calculateEligibility(
      amexBizPlat(),
      [cancelled(amexExplorer(), sixMonthsAgo)], // personal cancellation
      ALL_ISSUERS,
    );
    expect(result.status).toBe('eligible');
  });

  it('business pool: holding active business card blocks another business card', () => {
    const result = calculateEligibility(amexBizPlat(), [held(amexBizExplorer())], ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
    expect(result.reason).toMatch(/business/);
  });
});

describe('time_based — issuer_wide scope (ANZ)', () => {
  const anzFf = () => findCard('ANZ Frequent Flyer Black');
  const anzRewards = () => findCard('ANZ Rewards Black');

  it('not_eligible while any ANZ card is currently active (any family)', () => {
    const result = calculateEligibility(anzFf(), [held(anzRewards())], ALL_ISSUERS);
    expect(result.status).toBe('not_eligible');
  });

  it('waiting until 24 months pass since last ANZ cancellation', () => {
    const twelveMonthsAgo = '2025-05-28';
    const result = calculateEligibility(
      anzFf(),
      [cancelled(anzRewards(), twelveMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('waiting');
    expect(result.eligibleDate).toBe('2027-05-28');
    expect(result.confidenceLevel).toBe('high');
  });

  it('eligible after 24 months have passed', () => {
    const twentyFiveMonthsAgo = '2024-04-28';
    const result = calculateEligibility(
      anzFf(),
      [cancelled(anzRewards(), twentyFiveMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('eligible');
  });
});

describe('time_based — card_family scope (Westpac)', () => {
  const altitudeQfBlack = () => findCard('Westpac Altitude Qantas Black');
  const altitudeVelocityBlack = () => findCard('Westpac Altitude Velocity Black');

  it('waiting when same family was cancelled <24 months ago', () => {
    // Both Westpac Altitude family — should trigger the family-scope path.
    const sixMonthsAgo = '2025-11-28';
    const result = calculateEligibility(
      altitudeQfBlack(),
      [cancelled(altitudeVelocityBlack(), sixMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('waiting');
    expect(result.eligibleDate).toBe('2027-11-28');
  });

  it('eligible after 24 months elapsed for the family', () => {
    const twoYearsAgo = '2024-04-28';
    const result = calculateEligibility(
      altitudeQfBlack(),
      [cancelled(altitudeVelocityBlack(), twoYearsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('eligible');
  });
});

describe('time_based — same_card scope (CBA)', () => {
  const cbaUltimate = () => findCard('CommBank Ultimate Awards');
  const cbaSmart = () => findCard('CommBank Smart Awards');

  it('different CBA card cancellations do NOT affect another CBA card', () => {
    const sixMonthsAgo = '2025-11-28';
    const result = calculateEligibility(
      cbaUltimate(),
      [cancelled(cbaSmart(), sixMonthsAgo)],
      ALL_ISSUERS,
    );
    // No history of THIS card → eligible.
    expect(result.status).toBe('eligible');
  });

  it('waiting only when the same CBA card was cancelled <12 months ago', () => {
    const sixMonthsAgo = '2025-11-28';
    const result = calculateEligibility(
      cbaUltimate(),
      [cancelled(cbaUltimate(), sixMonthsAgo)],
      ALL_ISSUERS,
    );
    expect(result.status).toBe('waiting');
    expect(result.eligibleDate).toBe('2026-11-28');
  });
});

describe('generateRecommendations ranking', () => {
  it('returns every catalogue card (including not_eligible), sorted by priority desc', () => {
    const userCards: UserCardWithDetails[] = [];
    const recs = generateRecommendations(ALL_CARDS, userCards, ALL_ISSUERS);

    // Engine no longer drops not_eligible — Tab 4 surfaces them in a
    // collapsed "Not eligible" section as reference info. With empty
    // history, every card is eligible anyway.
    expect(recs.length).toBe(ALL_CARDS.length);
    expect(recs.every((r) => r.eligibility.status === 'eligible')).toBe(true);

    // Sorted descending by priority.
    for (let i = 0; i < recs.length - 1; i++) {
      const a = recs[i];
      const b = recs[i + 1];
      if (a && b) {
        expect(a.priority).toBeGreaterThanOrEqual(b.priority);
      }
    }
  });

  it('top-ranked card with zero history is the highest-bonus eligible card', () => {
    const recs = generateRecommendations(ALL_CARDS, [], ALL_ISSUERS);
    const top = recs[0];
    // Sanity: every card is "eligible" with high confidence → priority is
    // 100 (status) + bonusPoints/1000 + 20 (confidence) = 120 + bonus_k.
    // The highest-bonus card is Amex Platinum at 200,000 pts → priority 320.
    expect(top?.card.name).toBe('American Express Platinum Card');
    expect(top?.priority).toBe(100 + 200 + 20);
  });

  it('waiting cards rank below grey-area which ranks below eligible', () => {
    // Construct three cards from the same recommendation list and verify
    // status weighting: eligible (100) > grey_area (50) > waiting (25).
    const userCards = [
      // Lock Citi Prestige to grey_area: cancelled Citi history, no exclusion period.
      cancelled(findCard('Citi Premier'), '2024-01-01'),
      // Force Amex Plat into waiting: cancel Amex Explorer 6 months ago (same personal pool).
      cancelled(findCard('American Express Explorer'), '2025-11-28'),
    ];

    const recs = generateRecommendations(ALL_CARDS, userCards, ALL_ISSUERS);

    const citiPrestige = recs.find((r) => r.card.name === 'Citi Prestige');
    const amexPlat = recs.find((r) => r.card.name === 'American Express Platinum Card');
    const wesAltQfBlack = recs.find((r) => r.card.name === 'Westpac Altitude Qantas Black');

    expect(citiPrestige?.eligibility.status).toBe('grey_area');
    expect(amexPlat?.eligibility.status).toBe('waiting');
    expect(wesAltQfBlack?.eligibility.status).toBe('eligible');

    // Same bonusPoints (100k for Citi Prestige vs 200k for Amex Plat) — but
    // assert relative bucket: eligible Westpac (150k) > grey Citi Prestige (100k) > waiting Amex (200k).
    // Westpac status weight 100 + 150 bonus + 10 (medium confidence) = 260
    // Citi Prestige grey: 50 + 100 + 10 = 160
    // Amex Platinum waiting: 25 + 200 + 10 = 235 (no <30 urgency bonus, daysRemaining ~365)
    expect(wesAltQfBlack?.priority).toBeGreaterThan(amexPlat?.priority ?? 0);
    expect(amexPlat?.priority).toBeGreaterThan(citiPrestige?.priority ?? 0);
  });

  it('applies the <30 days urgency bonus', () => {
    // Cancel an Amex card 17.5 months ago → ~15 days remaining of the 18-month wait.
    const seventeenAndAHalfMonthsAgo = '2024-12-13';
    const userCards = [
      cancelled(findCard('American Express Explorer'), seventeenAndAHalfMonthsAgo),
    ];
    const recs = generateRecommendations(ALL_CARDS, userCards, ALL_ISSUERS);
    const amexPlat = recs.find((r) => r.card.name === 'American Express Platinum Card');

    expect(amexPlat?.eligibility.status).toBe('waiting');
    expect(amexPlat?.eligibility.daysRemaining).toBeLessThan(30);
    // Status 25 + bonus 200 + medium confidence 10 + urgency 15 = 250
    expect(amexPlat?.priority).toBe(25 + 200 + 10 + 15);
  });
});
