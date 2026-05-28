// Bundled AU card catalogue, generated from docs/Bonus Eligibility Reference/seed.ts
// via scripts/generate-catalogue.ts. IDs are stable across regenerations (uuid v5).

import issuersJson from '../data/issuers.json' with { type: 'json' };
import cardsJson from '../data/cards.json' with { type: 'json' };
import benefitsJson from '../data/benefits.json' with { type: 'json' };
import type { Benefit, Card, CardWithIssuer, Issuer } from './types';

export function getIssuers(): Issuer[] {
  return issuersJson as Issuer[];
}

export function getCards(): Card[] {
  return cardsJson as Card[];
}

export function getCardsWithIssuer(): CardWithIssuer[] {
  const issuers = getIssuers();
  const issuerById = new Map(issuers.map((i) => [i.id, i]));
  return getCards().map((card) => {
    const issuer = issuerById.get(card.issuerId);
    if (!issuer) {
      throw new Error(`Card "${card.name}" references unknown issuer id "${card.issuerId}"`);
    }
    return { ...card, issuer };
  });
}

export function getCardWithIssuer(cardId: string): CardWithIssuer | undefined {
  return getCardsWithIssuer().find((c) => c.id === cardId);
}

export function getAllBenefits(): Benefit[] {
  return benefitsJson as Benefit[];
}

export function getBenefitsForCard(cardId: string): Benefit[] {
  return getAllBenefits().filter((b) => b.cardId === cardId);
}
