// Fuzzy match an OCR'd product name against the bundled catalogue.
// The catalogue is small (~34 entries) so a token-overlap score is plenty
// for M1. Optimised for the realistic case where the OCR returns short,
// embossed text like "PLATINUM CARD" or "QANTAS REWARDS SIGNATURE".

import type { CardWithIssuer } from '@ph/shared';

function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

const ISSUER_ALIASES: Record<string, string[]> = {
  amex: ['american express', 'amex'],
  anz: ['anz', 'australia new zealand banking'],
  westpac: ['westpac'],
  nab: ['nab', 'national australia bank'],
  qantas: ['qantas'],
  citi: ['citi', 'citibank'],
  hsbc: ['hsbc'],
  cba: ['commbank', 'commonwealth bank', 'cba'],
  virgin: ['virgin money', 'virgin'],
};

export interface OcrMatchInput {
  productName?: string | null;
  issuer?: string | null;
}

export interface OcrMatchResult {
  cardId: string;
  score: number;
}

export function matchCardFromOcr(
  ocr: OcrMatchInput,
  catalogue: CardWithIssuer[],
): OcrMatchResult | null {
  const productTokens = tokenise(ocr.productName ?? '');
  const issuerHint = (ocr.issuer ?? '').toLowerCase();

  // Resolve issuer hint to a canonical shortName if possible.
  let preferredIssuer: string | null = null;
  for (const [shortName, aliases] of Object.entries(ISSUER_ALIASES)) {
    if (aliases.some((a) => issuerHint.includes(a))) {
      preferredIssuer = shortName;
      break;
    }
  }

  let best: OcrMatchResult | null = null;
  for (const card of catalogue) {
    const candidateTokens = new Set([
      ...tokenise(card.name),
      ...tokenise(card.issuer.name),
      ...tokenise(card.issuer.shortName),
      ...(card.cardFamily ? tokenise(card.cardFamily) : []),
    ]);

    let score = 0;
    for (const t of productTokens) if (candidateTokens.has(t)) score += 2;

    // Issuer alignment bonus
    if (preferredIssuer && card.issuer.shortName.toLowerCase() === preferredIssuer.toLowerCase()) {
      score += 3;
    }

    if (!best || score > best.score) {
      best = { cardId: card.id, score };
    }
  }

  // Reject low-confidence matches — the form will fall back to "Select a card…"
  if (!best || best.score < 2) return null;
  return best;
}
