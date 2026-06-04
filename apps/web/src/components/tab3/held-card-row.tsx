'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Receipt,
  Pencil,
  Ban,
  DollarSign,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Plane,
  BedDouble,
  UtensilsCrossed,
  Shield,
} from 'lucide-react';
import type { BenefitCategory } from '@ph/shared';
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
import { EditCardModal } from '@/components/tab3/edit-card-modal';
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
  const [editingCard, setEditingCard] = useState(false);

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
          {/* Three info blocks on single lines: primary value (bold) + dot
              separator + secondary context (zinc-500). Order is Spent →
              Pace → Earned: spent is the action driver, pace is the
              direct consequence of spend, earned is a side metric (still
              useful but less chase-critical). Pace icon + primary stay
              color-coded with the same traffic system as the countdown
              bar (emerald = good, rose = trouble, zinc = no data). */}

          {/* Spent */}
          <div className="mt-3 flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 flex-none text-zinc-400" aria-hidden />
            <div className="min-w-0 flex-1">
              {editingSpend ? (
                <div className="flex items-baseline gap-1">
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
                </div>
              ) : (uc.bonusSpentToDate ?? 0) > 0 ? (
                <p className="text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingSpend(true)}
                    className="font-semibold tabular-nums text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                    aria-label="Edit current spend"
                  >
                    {formatCurrency(uc.bonusSpentToDate ?? 0)}
                  </button>
                  <span className="font-normal text-zinc-500">
                    {' '}
                    of {formatCurrency(uc.bonusTarget)}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {' · '}
                    {Math.round(((uc.bonusSpentToDate ?? 0) / uc.bonusTarget) * 100)}% of goal
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingSpend(true)}
                  className="text-xs italic text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
                >
                  Unrecorded — tap to log
                </button>
              )}
            </div>
          </div>

          {/* Pace — color-coded by state. Placed directly below Spent
              because it's the direct read of "am I on track with what I
              just logged?". */}
          {projection &&
            (() => {
              // Three honest states (was previously conflated into a single
              // "Target met" branch which fired on shortfall<=0 — false
              // positive for cards with strong run-rate but tiny spend).
              const actualMet = (uc.bonusSpentToDate ?? 0) >= (uc.bonusTarget ?? 0);
              const onPace = projection.shortfall <= 0;
              const noSpendYet =
                (uc.bonusSpentToDate ?? 0) === 0 || projection.projectedMissDays === Infinity;

              if (actualMet) {
                return (
                  <PaceBlock
                    icon={CheckCircle2}
                    tone="emerald"
                    primary="Target met"
                    secondary="Bonus should post next statement."
                  />
                );
              }
              if (noSpendYet) {
                return (
                  <PaceBlock
                    icon={TrendingDown}
                    tone="zinc"
                    primary="No spend yet"
                    secondary="Log spend to see projection."
                  />
                );
              }
              if (onPace) {
                // Date intentionally omitted — countdown bar above already
                // shows the deadline. Stays as a single short line.
                return (
                  <PaceBlock
                    icon={TrendingUp}
                    tone="emerald"
                    primary="On pace"
                    secondary={`${formatCurrency(Math.round(projection.averageDailySpend))}/day will hit target`}
                  />
                );
              }
              return (
                <PaceBlock
                  icon={TrendingDown}
                  tone="rose"
                  primary={`Short by ${projection.projectedMissDays} day${projection.projectedMissDays === 1 ? '' : 's'}`}
                  secondary={`at ${formatCurrency(Math.round(projection.averageDailySpend))}/day, projected ${formatCurrency(Math.round(projection.projectedTotal))}`}
                />
              );
            })()}

          {/* Earned — side metric, sits last because it's informational
              not action-driving. Only shown when we know the earn rate.
              Points value is emerald-bold to read as a positive gain (vs
              the neutral spend number above) and to visually echo the
              Pace block when both are healthy. */}
          {uc.card.earnRatePer1Aud != null && (
            <div className="mt-2 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-400" aria-hidden />
              <p className="min-w-0 flex-1 text-xs">
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {(uc.bonusSpentToDate ?? 0) > 0
                    ? `~${formatPoints(
                        Math.round((uc.bonusSpentToDate ?? 0) * uc.card.earnRatePer1Aud),
                      )} pts`
                    : '0 pts'}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {' · '}earning {uc.card.earnRatePer1Aud} pt per $1 spent
                </span>
              </p>
            </div>
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
            {benefitStatuses.map((bs) => {
              const CategoryIcon = benefitCategoryIcon(bs.benefit.category);
              return (
                <li key={bs.benefit.id} className="flex items-start gap-2">
                  {/* Category badge — instantly readable benefit type
                      (Plane = travel, BedDouble = hotel, etc.) Sits left of
                      the redemption-state toggle. */}
                  <span
                    className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    aria-hidden
                  >
                    <CategoryIcon className="h-3.5 w-3.5" />
                  </span>
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
              );
            })}
          </ul>
        </section>
      )}

      {/* Quick actions — primary (update spend, daily action) on the left,
          edit (occasional correction) in the middle, destructive (cancel)
          right-aligned and rose-tinted so it sits visually apart. Card
          catalogue info is still reachable via Tab 4 (Next card) where
          users browse cards they don't hold yet. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/spend?card=${uc.id}`}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ph-red)] px-3 py-1 font-medium text-white"
        >
          <Receipt className="h-3 w-3" aria-hidden />
          Update spend
        </Link>
        <button
          type="button"
          onClick={() => setEditingCard(true)}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          Edit details
        </button>
        {!uc.cancellationDate && (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-rose-700 hover:border-rose-400 dark:border-rose-900 dark:text-rose-300"
          >
            <Ban className="h-3 w-3" aria-hidden />
            Cancel
          </button>
        )}
      </div>

      {editingCard && <EditCardModal uc={uc} onClose={() => setEditingCard(false)} />}

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

// Color-coded pace block — icon + tinted headline + neutral secondary
// caption. Tones match the countdown bar's traffic system so the user
// reads the same signal across both surfaces.
function PaceBlock({
  icon: Icon,
  tone,
  primary,
  secondary,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'emerald' | 'amber' | 'rose' | 'zinc';
  primary: string;
  secondary: string;
}) {
  const tones: Record<typeof tone, { icon: string; primary: string }> = {
    emerald: {
      icon: 'text-emerald-500',
      primary: 'text-emerald-700 dark:text-emerald-300',
    },
    amber: { icon: 'text-amber-500', primary: 'text-amber-700 dark:text-amber-300' },
    rose: { icon: 'text-rose-500', primary: 'text-rose-700 dark:text-rose-300' },
    zinc: { icon: 'text-zinc-400', primary: 'text-zinc-700 dark:text-zinc-300' },
  };
  const t = tones[tone];
  return (
    <div className="mt-2 flex items-start gap-2">
      <Icon className={`mt-0.5 h-4 w-4 flex-none ${t.icon}`} aria-hidden />
      <p className="min-w-0 flex-1 text-xs">
        <span className={`font-semibold ${t.primary}`}>{primary}</span>
        <span className="text-[11px] text-zinc-500">
          {' · '}
          {secondary}
        </span>
      </p>
    </div>
  );
}

// Lucide icon per benefit category. Schema centralises the categories in
// packages/shared, so this map is exhaustive — TypeScript catches misses.
function benefitCategoryIcon(
  category: BenefitCategory,
): React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> {
  switch (category) {
    case 'travel_credit':
      return Plane;
    case 'hotel_credit':
      return BedDouble;
    case 'dining_credit':
      return UtensilsCrossed;
    case 'statement_credit':
      return Receipt;
    case 'insurance':
      return Shield;
  }
}
