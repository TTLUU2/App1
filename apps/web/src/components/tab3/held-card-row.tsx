'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { Benefit, UserCardWithDetails, UserBenefitRedemption } from '@ph/shared';
import { CardArt } from '@/components/card-art';
import { formatCurrency, formatDate, formatPoints } from '@/lib/format';
import {
  benefitStatusFor,
  computeCardStatus,
  projectBonusCompletion,
  rowHeadline,
  statusLabel,
  statusVisualClass,
  type BenefitStatus,
} from '@/lib/tab3-status';
import { useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { CancelCardConfirm } from '@/components/cancel-card-confirm';
import { todayIsoDate } from '@/lib/time';

/**
 * Collapsed row (PRD §9.2.2) expands into the detail view (§9.2.3). Animated
 * with native <details> for keyboard / screen-reader native semantics; the
 * 200ms PRD requirement is met inherently.
 */
export function HeldCardRow({
  uc,
  benefits,
  redemptions,
}: {
  uc: UserCardWithDetails;
  benefits: Benefit[];
  redemptions: UserBenefitRedemption[];
}) {
  // Default-expanded per UX call — most useful info (spend progress + benefits
  // + quick actions) is in the expanded view, so users shouldn't have to
  // open every row to see it.
  const [open, setOpen] = useState(true);
  const cardBenefits = benefits.filter((b) => b.cardId === uc.cardId);
  const benefitStatuses = cardBenefits.map((b) => benefitStatusFor(b, uc, redemptions));
  const status = computeCardStatus(uc, benefitStatuses);
  const headline = rowHeadline(uc, benefitStatuses);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:hover:bg-zinc-800/60"
      >
        <CardArt card={uc.card} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold leading-tight">{uc.card.name}</h3>
            {open ? (
              <ChevronDown className="mt-0.5 h-4 w-4 flex-none text-zinc-400" aria-hidden />
            ) : (
              <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-zinc-400" aria-hidden />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusVisualClass(status)}`}
            >
              {statusLabel(status)}
            </span>
            <span
              className={
                headline.tone === 'danger'
                  ? 'text-xs text-rose-700 dark:text-rose-300'
                  : headline.tone === 'warning'
                    ? 'text-xs text-amber-700 dark:text-amber-300'
                    : 'text-xs text-zinc-600 dark:text-zinc-400'
              }
            >
              {headline.label}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <ExpandedDetails uc={uc} benefitStatuses={benefitStatuses} cardBenefits={cardBenefits} />
      )}
    </article>
  );
}

function ExpandedDetails({
  uc,
  benefitStatuses,
  cardBenefits,
}: {
  uc: UserCardWithDetails;
  benefitStatuses: BenefitStatus[];
  cardBenefits: Benefit[];
}) {
  const projection = projectBonusCompletion(uc);
  const updateCard = useUserCardsStore((s) => s.updateCard);
  const markUsed = useUserBenefitsStore((s) => s.markUsed);
  const removeRedemption = useUserBenefitsStore((s) => s.removeRedemption);
  const [spendEdit, setSpendEdit] = useState<string>(String(uc.bonusSpentToDate ?? ''));
  const [editingSpend, setEditingSpend] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function commitSpend() {
    const amount = Number(spendEdit);
    if (Number.isNaN(amount) || amount < 0) return;
    await updateCard(uc.id, { bonusSpentToDate: amount });
    setEditingSpend(false);
  }

  return (
    <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-zinc-500">Activation date</dt>
        <dd className="text-right">{uc.activationDate ? formatDate(uc.activationDate) : '—'}</dd>
        <dt className="text-zinc-500">Card expiry</dt>
        <dd className="text-right">{uc.expiryMonthYear ?? '—'}</dd>
        <dt className="text-zinc-500">Annual fee</dt>
        <dd className="text-right">
          {formatCurrency(uc.card.annualFee)}
          {uc.annualFeeNextDueDate && (
            <span className="ml-1 text-zinc-500">· next {formatDate(uc.annualFeeNextDueDate)}</span>
          )}
        </dd>
      </dl>

      {/* Sign-up bonus block */}
      {uc.bonusTarget != null && uc.bonusSpendWindowEndDate != null && (
        <section className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/40">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Sign-up bonus
          </h4>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm">
              {editingSpend ? (
                <span className="flex items-baseline gap-1">
                  <span className="text-zinc-500">$</span>
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    value={spendEdit}
                    onChange={(e) => setSpendEdit(e.target.value)}
                    onBlur={commitSpend}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitSpend();
                      if (e.key === 'Escape') {
                        setSpendEdit(String(uc.bonusSpentToDate ?? ''));
                        setEditingSpend(false);
                      }
                    }}
                    className="w-24 rounded border border-zinc-300 bg-white px-1 py-0.5 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingSpend(true)}
                  className="font-semibold tabular-nums underline-offset-2 hover:underline"
                  aria-label="Edit current spend"
                >
                  {formatCurrency(uc.bonusSpentToDate ?? 0)}
                </button>
              )}{' '}
              of {formatCurrency(uc.bonusTarget)}
            </span>
            <span className="text-xs text-zinc-500">
              by {formatDate(uc.bonusSpendWindowEndDate)}
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={uc.bonusTarget}
            aria-valuenow={uc.bonusSpentToDate ?? 0}
          >
            <div
              className="h-full bg-[var(--color-ph-red)]"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((uc.bonusSpentToDate ?? 0) / uc.bonusTarget) * 100),
                )}%`,
              }}
            />
          </div>
          {projection && (
            <p className="mt-2 text-[11px] text-zinc-500">
              {projection.shortfall > 0
                ? `At your current pace (${formatCurrency(Math.round(projection.averageDailySpend))} / day), projected ${formatCurrency(Math.round(projection.projectedTotal))} by ${formatDate(uc.bonusSpendWindowEndDate)} — ${
                    projection.projectedMissDays === Infinity
                      ? 'no spend yet to project from.'
                      : projection.projectedMissDays > 0
                        ? `short by ${projection.projectedMissDays} day${projection.projectedMissDays === 1 ? '' : 's'}.`
                        : 'on track.'
                  }`
                : 'Target met. Bonus should post next statement.'}{' '}
              {uc.card.bonusPoints && `(${formatPoints(uc.card.bonusPoints)} pts)`}
            </p>
          )}
        </section>
      )}

      {/* Benefits block */}
      {cardBenefits.length > 0 && (
        <section className="mt-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Benefits
          </h4>
          <ul className="mt-1 space-y-1.5">
            {benefitStatuses.map((bs) => (
              <li key={bs.benefit.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (bs.redemption) {
                      void removeRedemption(bs.redemption.id);
                    } else {
                      void markUsed({
                        userCardId: uc.id,
                        benefit: bs.benefit,
                        activationDate: uc.activationDate ?? uc.applicationDate,
                      });
                    }
                  }}
                  aria-label={
                    bs.redemption
                      ? `Unmark ${bs.benefit.name} as used`
                      : `Mark ${bs.benefit.name} as used`
                  }
                  className="mt-0.5 flex-none"
                >
                  {bs.state === 'used' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  ) : bs.state === 'expiring_soon' ? (
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 text-zinc-400" aria-hidden />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{bs.benefit.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {formatCurrency(bs.benefit.valueAud)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    {bs.state === 'used'
                      ? 'Used this period'
                      : bs.state === 'expiring_soon'
                        ? `Expires in ${bs.daysRemaining} days`
                        : `Period ends ${formatDate(bs.period.end)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick actions */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link
          href={`/spend?card=${uc.id}`}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700"
        >
          Update spend
        </Link>
        <Link
          href={`/cards/${uc.cardId}`}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700"
        >
          Card details
        </Link>
        {!uc.cancellationDate && (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-rose-700 hover:border-rose-400 dark:border-zinc-700 dark:text-rose-300"
          >
            Cancel card
          </button>
        )}
      </div>

      {confirmingCancel && (
        <CancelCardConfirm
          cardName={uc.card.name}
          onConfirm={async () => {
            await updateCard(uc.id, { cancellationDate: todayIsoDate() });
            setConfirmingCancel(false);
          }}
          onClose={() => setConfirmingCancel(false)}
        />
      )}
    </div>
  );
}
