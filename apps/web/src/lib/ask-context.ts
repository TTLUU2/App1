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

  return lines.join('\n');
}
