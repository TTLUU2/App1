// Build the grounded context block passed to /api/ask. Keeps the prompt
// small (relevant fields only — no PAN / last4 / nicknames spilled to the
// model) and human-readable so the model can cite specific values.

import type {
  Recommendation,
  UserCardWithDetails,
  Benefit,
  UserBenefitRedemption,
} from '@ph/shared';
import { benefitStatusFor } from '@/lib/tab3-status';
import { formatCurrency, formatDate, formatPoints } from '@/lib/format';
import sweetSpotsRaw from '@/data/sweet-spots.json';
import dealsRaw from '@/data/deals.json';
import { CPP, PROGRAM_LABEL, type LoyaltyProgram } from '@/data/cpp';

// Lightweight types over the raw JSON. We don't import the full points-deals
// type system — just the fields we read.
interface SweetSpot {
  id: string;
  program: LoyaltyProgram;
  minPoints: number;
  label: string;
  description: string;
  retailValue: number;
  category: string;
  caveats?: string;
}

interface Deal {
  id: string;
  dealType: string;
  title: string;
  description: string;
  programs: LoyaltyProgram[];
  retailer?: string;
  chain?: string;
  startDate: string;
  endDate: string;
}

const SWEET_SPOTS = sweetSpotsRaw as SweetSpot[];
const DEALS = dealsRaw as Deal[];

export function buildAskContext(args: {
  heldCards: UserCardWithDetails[];
  cancelledCards: UserCardWithDetails[];
  recommendations: Recommendation[];
  benefits: Benefit[];
  redemptions: UserBenefitRedemption[];
  today: string; // yyyy-MM-dd
}): string {
  const lines: string[] = [];
  lines.push(`Today: ${args.today}`);
  lines.push('');

  // Held cards
  lines.push(`## Active cards (${args.heldCards.length})`);
  if (args.heldCards.length === 0) {
    lines.push('- (none)');
  } else {
    for (const uc of args.heldCards) {
      const parts: string[] = [];
      parts.push(`- ${uc.card.name} (${uc.card.issuer.name})`);
      parts.push(`  applied ${uc.applicationDate}`);
      if (uc.activationDate) parts.push(`  activated ${uc.activationDate}`);
      parts.push(`  annual fee ${formatCurrency(uc.card.annualFee)}`);
      if (uc.annualFeeNextDueDate) parts.push(`  fee next due ${uc.annualFeeNextDueDate}`);
      if (uc.bonusTarget != null) {
        parts.push(
          `  bonus: ${formatCurrency(uc.bonusSpentToDate ?? 0)} of ${formatCurrency(uc.bonusTarget)} by ${uc.bonusSpendWindowEndDate ?? '?'}`,
        );
        if (uc.card.bonusPoints) parts.push(`  reward: ${formatPoints(uc.card.bonusPoints)} pts`);
        parts.push(`  bonus received: ${uc.bonusReceived ? 'yes' : 'no'}`);
      }
      const cardBenefits = args.benefits.filter((b) => b.cardId === uc.cardId);
      for (const b of cardBenefits) {
        const bs = benefitStatusFor(b, uc, args.redemptions);
        parts.push(
          `  benefit: ${b.name} (${formatCurrency(b.valueAud)}) — ${bs.state}` +
            (bs.state !== 'used' ? `, period ends ${formatDate(bs.period.end)}` : ''),
        );
      }
      lines.push(parts.join('\n'));
    }
  }
  lines.push('');

  // Cancelled cards (compact)
  if (args.cancelledCards.length > 0) {
    lines.push(`## Cancelled cards (${args.cancelledCards.length})`);
    for (const uc of args.cancelledCards) {
      lines.push(
        `- ${uc.card.name}: applied ${uc.applicationDate} → cancelled ${uc.cancellationDate}`,
      );
    }
    lines.push('');
  }

  // Top 5 recommendations
  lines.push(`## Top recommendations (Tab 4 — ranked)`);
  for (const rec of args.recommendations.slice(0, 8)) {
    const dr =
      rec.eligibility.status === 'waiting' && rec.eligibility.daysRemaining != null
        ? `, eligible in ${rec.eligibility.daysRemaining} days`
        : '';
    const pts = rec.card.bonusPoints ? `, ${formatPoints(rec.card.bonusPoints)} pts` : '';
    lines.push(
      `- ${rec.card.name} — ${rec.eligibility.status}${dr}${pts}. ${rec.eligibility.reason}`,
    );
  }
  lines.push('');

  // Points valuations — conservative AUD cents-per-point estimates so the
  // Copilot can quote real numbers instead of guessing. Cite these as
  // "approximately" / "about" — never as exact.
  lines.push('## Points valuations (AUD cents per point, conservative estimates)');
  for (const program of Object.keys(CPP) as LoyaltyProgram[]) {
    lines.push(`- ${PROGRAM_LABEL[program]}: ${CPP[program]}¢ per point`);
  }
  lines.push('');

  // Award sweet spots — notable redemption targets grouped by program.
  // The Copilot can cite these by minPoints + retailValue to answer
  // "is 90k QFF good for J to Japan?" type questions with real anchors.
  lines.push('## Award sweet spots (notable redemptions)');
  const spotsByProgram = new Map<LoyaltyProgram, SweetSpot[]>();
  for (const spot of SWEET_SPOTS) {
    const list = spotsByProgram.get(spot.program) ?? [];
    list.push(spot);
    spotsByProgram.set(spot.program, list);
  }
  for (const [program, spots] of spotsByProgram) {
    lines.push(`### ${PROGRAM_LABEL[program]}`);
    for (const spot of spots) {
      lines.push(
        `- ${formatPoints(spot.minPoints)} pts → ${spot.label} (worth ~${formatCurrency(spot.retailValue)})` +
          (spot.caveats ? ` — ${spot.caveats}` : ''),
      );
    }
  }
  lines.push('');

  // Active deals — only include deals where today falls in the
  // [startDate, endDate] window. Stops Copilot from suggesting expired
  // promos. Compares date strings directly (yyyy-MM-dd sorts correctly).
  const activeDeals = DEALS.filter((d) => d.startDate <= args.today && args.today <= d.endDate);
  if (activeDeals.length > 0) {
    lines.push(`## Active deals (running ${args.today})`);
    for (const deal of activeDeals) {
      const where = deal.retailer ?? deal.chain ?? '';
      const programs = deal.programs.map((p) => PROGRAM_LABEL[p]).join(', ');
      lines.push(
        `- ${deal.title}${where ? ` (${where})` : ''} — ${programs}, ends ${deal.endDate}`,
      );
      lines.push(`  ${deal.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
