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
import { MinSpendCountdown } from '@/components/tab3/min-spend-countdown';
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
        <dt className="text-zinc-500">Approval date</dt>
        <dd className="text-right">{uc.activationDate ? formatDate(uc.activationDate) : '—'}</dd>
        <dt className="text-zinc-500">Card expiry</dt>
        <dd className="text-right">{uc.expiryMonthYear ?? '—'}</dd>
        <dt className="text-zinc-500">Annual fee</dt>
        <dd className="text-right">{formatCurrency(uc.card.annualFee)}</dd>
        <dt className="text-zinc-500">Fee next charged</dt>
        <dd
          className={
            uc.annualFeeNextDueDate
              ? 'text-right font-medium tabular-nums'
              : 'text-right text-zinc-500'
          }
        >
          {uc.annualFeeNextDueDate ? formatDate(uc.annualFeeNextDueDate) : '—'}
        </dd>
      </dl>

      {/* Sign-up bonus block */}
      {uc.bonusTarget != null && uc.bonusSpendWindowEndDate != null && (
        <section className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/40">
          <h4 className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <span>Sign-up bonus</span>
            {uc.card.bonusPoints != null && (
              <span className="text-[11px] font-semibold normal-case tracking-normal text-[var(--color-ph-red)]">
                {formatPoints(uc.card.bonusPoints)} pts
              </span>
            )}
          </h4>
          {/* Time countdown — now carries the min-spend $ amount in its
              header (right-side date column), so the chase target is visible
              at a glance without a second progress bar. */}
          <div className="mt-2">
            <MinSpendCountdown
              startIso={uc.activationDate ?? uc.applicationDate}
              deadlineIso={uc.bonusSpendWindowEndDate}
              spentAud={uc.bonusSpentToDate}
              targetAud={uc.bonusTarget}
            />
          </div>

          {/* Amount-spent line — subtle, single row, inline-editable. Drops
              the dollar progress bar (a near-empty bar was discouraging
              users from logging spend). When no spend logged we say
              "Unrecorded" with a tap-to-log affordance so the call-to-action
              is the editor itself. */}
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="text-zinc-500">Amount spent: </span>
            {editingSpend ? (
              <span className="inline-flex items-baseline gap-1 align-baseline">
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
                  className="w-24 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
                />
              </span>
            ) : (uc.bonusSpentToDate ?? 0) > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditingSpend(true)}
                  className="font-semibold tabular-nums text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
                  aria-label="Edit current spend"
                >
                  {formatCurrency(uc.bonusSpentToDate ?? 0)}
                </button>
                <span className="text-zinc-500">
                  {' '}
                  / {formatCurrency(uc.bonusTarget)} ·{' '}
                  {Math.round(((uc.bonusSpentToDate ?? 0) / uc.bonusTarget) * 100)}% of goal
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditingSpend(true)}
                className="italic text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                Unrecorded — tap to log
              </button>
            )}
          </p>

          {/* Points context as a single secondary line — earn rate from the
              upstream catalogue (POINT_HACKS_EARN_RATES), and a soft estimate
              of points earned so far from logged spend × headline rate. Actual
              earn varies by category; this understates real earn for tiered
              cards during the min-spend chase. Bonus-on-offer lives in the
              section header, so it's not repeated here. */}
          {uc.card.earnRatePer1Aud != null && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Earning <span className="tabular-nums">{uc.card.earnRatePer1Aud}</span> pt/$1
              {(uc.bonusSpentToDate ?? 0) > 0 && (
                <>
                  {' · ~'}
                  <span className="tabular-nums">
                    {formatPoints(Math.round((uc.bonusSpentToDate ?? 0) * uc.card.earnRatePer1Aud))}
                  </span>{' '}
                  pts so far
                </>
              )}
            </p>
          )}
          {projection &&
            (() => {
              // Distinguish three states cleanly:
              //   1. Actually met — spent >= target. Done.
              //   2. On pace — current run-rate will hit target before deadline.
              //   3. Behind — won't hit target at current pace; show shortfall.
              // The previous code conflated (1) and (2) via projection.shortfall,
              // so a card with $500 spent and decent run-rate would falsely
              // claim "Target met".
              const actualMet = (uc.bonusSpentToDate ?? 0) >= uc.bonusTarget!;
              const onPace = projection.shortfall <= 0;
              if (actualMet) {
                return (
                  <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                    Target met. Bonus should post next statement.
                  </p>
                );
              }
              if (onPace) {
                return (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    On pace — at {formatCurrency(Math.round(projection.averageDailySpend))}/day
                    you&apos;ll hit {formatCurrency(uc.bonusTarget!)} before{' '}
                    {formatDate(uc.bonusSpendWindowEndDate!)}.
                  </p>
                );
              }
              return (
                <p className="mt-2 text-[11px] text-zinc-500">
                  At your current pace ({formatCurrency(Math.round(projection.averageDailySpend))}
                  /day), projected {formatCurrency(Math.round(projection.projectedTotal))} by{' '}
                  {formatDate(uc.bonusSpendWindowEndDate!)} —{' '}
                  {projection.projectedMissDays === Infinity
                    ? 'no spend yet to project from.'
                    : projection.projectedMissDays > 0
                      ? `short by ${projection.projectedMissDays} day${
                          projection.projectedMissDays === 1 ? '' : 's'
                        }.`
                      : 'on track.'}
                </p>
              );
            })()}
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
