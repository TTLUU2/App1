'use client';

// Optimise · Your cards — rich expandable-tile view. One tile per held
// card. The active card auto-expands; secondary cards start collapsed.
// Matches the designer reference (Amex Platinum tile) — card art thumb
// + At-risk chip + summary line as the collapsed header, then attribute
// grid + sign-up bonus amber panel + spend/earn meta rows + benefit
// checkbox rows + action-button row on expand.
//
// Data source: the shared user-cards store (Dexie via IndexedDB) joined
// with the bundled @ph/shared catalogue. Benefits come from
// getBenefitsForCard(); redemptions from useUserBenefitsStore.
//
// v1 pace derivations live inside computeStatus() below — real spend
// wiring lands with Log-a-spend in Phase 5.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Hotel,
  Pencil,
  Plane,
  Plus,
  Receipt,
  Shield,
  Sparkles,
  TrendingDown,
  Utensils,
} from 'lucide-react';
import type { BenefitCategory, UserCardWithDetails } from '@ph/shared';
import { getBenefitsForCard } from '@ph/shared';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { CardArtFrame, LacquerChip } from '@/components/lacquer';
import { formatCurrency, formatPoints } from '@/lib/format';

// ── main ─────────────────────────────────────────────────────────────

export function YourCardsView() {
  // Same Zustand v5 slice-then-memo pattern as NextCardView — avoids
  // the infinite-render loop selectors would otherwise trigger.
  const userCards = useUserCardsStore((s) => s.userCards);
  const loaded = useUserCardsStore((s) => s.loaded);
  const held = useMemo(() => {
    void userCards;
    void loaded;
    return selectUserCardsWithDetails(useUserCardsStore.getState());
  }, [userCards, loaded]);

  const active = held.filter((h) => !h.cancellationDate);
  const cancelled = held.filter((h) => h.cancellationDate);

  return (
    <section className="mt-4 space-y-3">
      {active.length === 0 ? (
        <EmptyState />
      ) : (
        active.map((uc, i) => <CardTile key={uc.id} uc={uc} defaultOpen={i === 0} />)
      )}

      <AddCardRow />

      {cancelled.length > 0 && (
        <details className="rounded-ph-card border border-ph-border bg-ph-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-ph-text-muted">
            <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              Cancelled · {cancelled.length}
            </p>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </summary>
          <ul className="divide-y divide-ph-border">
            {cancelled.map((uc) => (
              <li key={uc.id} className="flex items-center gap-3 p-3">
                <CardArtFrame alt={uc.card.name} src={uc.card.cardArtUrl ?? undefined} size="xxs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ph-text-muted">{uc.card.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                    Cancelled {uc.cancellationDate}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ── one tile per held card ──────────────────────────────────────────

interface CardTileProps {
  uc: UserCardWithDetails;
  defaultOpen: boolean;
}

function CardTile({ uc, defaultOpen }: CardTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  const status = computeStatus(uc);
  return (
    <article className="overflow-hidden rounded-ph-card border border-ph-border bg-ph-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-ph-fill-warm"
      >
        <CardArtFrame alt={uc.card.name} src={uc.card.cardArtUrl ?? undefined} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[19px] leading-tight text-ph-ink">
            {uc.card.name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {status.atRisk ? (
              <LacquerChip variant="negative" Icon={AlertTriangle} size="sm">
                At risk
              </LacquerChip>
            ) : status.bonusEarned ? (
              <LacquerChip variant="pine" Icon={Check} size="sm">
                Bonus earned
              </LacquerChip>
            ) : null}
            <span className="text-[13px] text-ph-text-muted">{status.summaryLine}</span>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
        )}
      </button>

      {open && (
        <div className="border-t border-ph-border">
          <AttributeGrid uc={uc} />
          <SignUpBonusPanel uc={uc} status={status} />
          <SpendMetaRows uc={uc} status={status} />
          <BenefitsSection uc={uc} />
          <ActionRow uc={uc} />
        </div>
      )}
    </article>
  );
}

// ── attribute grid ──────────────────────────────────────────────────

function AttributeGrid({ uc }: { uc: UserCardWithDetails }) {
  const rows: [string, string][] = [
    ['Approval date', uc.activationDate ? formatDMY(uc.activationDate) : '—'],
    ['Card expiry', uc.expiryMonthYear ?? '—'],
    ['Annual fee', formatCurrency(uc.card.annualFee)],
    ['Fee next charged', uc.annualFeeNextDueDate ? formatDMY(uc.annualFeeNextDueDate) : '—'],
  ];
  return (
    <dl className="space-y-2 px-4 pt-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 text-[14px]">
          <dt className="text-ph-text-muted">{k}</dt>
          <dd className="tabular-nums text-ph-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── sign-up bonus + amber deadline panel ────────────────────────────

interface CardStatus {
  atRisk: boolean;
  bonusEarned: boolean;
  daysRemaining: number | null;
  spendToGo: number;
  spendTarget: number;
  spentToDate: number;
  summaryLine: string;
  deadlineIso: string | null;
}

function SignUpBonusPanel({ uc, status }: { uc: UserCardWithDetails; status: CardStatus }) {
  if (uc.card.bonusPoints == null) return null;
  const progress =
    status.spendTarget > 0 ? Math.max(0, Math.min(1, status.spentToDate / status.spendTarget)) : 0;
  return (
    <section aria-label="Sign-up bonus" className="mt-4 px-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Sign-up bonus
        </p>
        <p className="font-serif text-[19px] leading-none text-ph-red tabular-nums">
          {formatPoints(uc.card.bonusPoints)} pts
        </p>
      </div>

      {status.deadlineIso && !status.bonusEarned && (
        <div className="mt-2 rounded-ph-inner border border-ph-amber-chip bg-ph-amber-chip p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-serif text-[21px] leading-tight text-ph-amber-text">
              <strong className="font-semibold tabular-nums">{status.daysRemaining ?? '—'}</strong>{' '}
              <span className="text-[13px] font-normal">days left</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-amber-text">
              by {formatDMY(status.deadlineIso)}
            </p>
          </div>
          <p className="mt-1 text-[12px] text-ph-amber-text">
            to spend{' '}
            <strong className="font-semibold tabular-nums">
              {formatCurrency(status.spendToGo)}
            </strong>{' '}
            for bonus
          </p>
          <div className="mt-2 h-[7px] w-full overflow-hidden rounded-full bg-white/40" aria-hidden>
            <div
              className="h-full rounded-full bg-ph-amber-figure transition-[width] duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ── spend + earn meta rows ──────────────────────────────────────────

function SpendMetaRows({ uc, status }: { uc: UserCardWithDetails; status: CardStatus }) {
  const earnRate = uc.card.earnRatePer1Aud ?? 0;
  return (
    <ul className="mt-3 space-y-2 px-4 text-[13px]">
      <li className="flex items-start gap-2 text-ph-text-muted">
        <Receipt className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
        <span className="italic">Unrecorded — tap to log</span>
      </li>
      <li className="flex items-start gap-2 text-ph-text">
        <TrendingDown className="mt-0.5 h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
        <span>
          <strong className="font-semibold">
            {status.spentToDate > 0
              ? `${formatCurrency(status.spentToDate)} spent`
              : 'No spend yet'}
          </strong>{' '}
          · Log spend to see projection.
        </span>
      </li>
      <li className="flex items-start gap-2 text-ph-pine-text">
        <Sparkles className="mt-0.5 h-4 w-4 flex-none text-ph-amber-figure" aria-hidden />
        <span>
          <strong className="font-semibold text-ph-pine tabular-nums">
            {formatPoints(Math.round(status.spentToDate * earnRate))} pts
          </strong>{' '}
          · earning {earnRate} pt per $1 spent
        </span>
      </li>
    </ul>
  );
}

// ── benefits section ────────────────────────────────────────────────

const BENEFIT_ICON: Record<BenefitCategory, typeof Plane> = {
  travel_credit: Plane,
  hotel_credit: Hotel,
  statement_credit: Receipt,
  dining_credit: Utensils,
  insurance: Shield,
};

function BenefitsSection({ uc }: { uc: UserCardWithDetails }) {
  const benefits = useMemo(() => getBenefitsForCard(uc.card.id), [uc.card.id]);
  const redemptions = useUserBenefitsStore((s) => s.redemptions);
  const markUsed = useUserBenefitsStore((s) => s.markUsed);
  const removeRedemption = useUserBenefitsStore((s) => s.removeRedemption);
  if (benefits.length === 0) return null;

  const anchorDate = uc.activationDate ?? new Date().toISOString().slice(0, 10);

  return (
    <section aria-label="Benefits" className="mt-5 px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
        Benefits
      </p>
      <ul className="mt-2 space-y-2">
        {benefits.map((b) => {
          const Icon = BENEFIT_ICON[b.category] ?? Plane;
          const existing = redemptions.find((r) => r.userCardId === uc.id && r.benefitId === b.id);
          const used = Boolean(existing);
          function toggle() {
            if (existing) void removeRedemption(existing.id);
            else void markUsed({ userCardId: uc.id, benefit: b, activationDate: anchorDate });
          }
          return (
            <li key={b.id} className="flex items-start gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <button
                type="button"
                onClick={toggle}
                aria-pressed={used}
                className="flex flex-1 items-start gap-2 text-left"
              >
                <span
                  className={
                    used
                      ? 'mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-ph-pine text-white'
                      : 'mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full border border-ph-border-strong'
                  }
                  aria-hidden
                >
                  {used ? <Check className="h-2.5 w-2.5" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ph-ink">{b.name}</p>
                  <p className="mt-0.5 text-[11px] text-ph-text-muted">
                    Period ends {shortEnd(b.period)}
                  </p>
                </div>
              </button>
              <p className="flex-none text-[13px] font-semibold text-ph-ink tabular-nums">
                {formatCurrency(b.valueAud)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── action row ──────────────────────────────────────────────────────

function ActionRow({ uc }: { uc: UserCardWithDetails }) {
  const updateCard = useUserCardsStore((s) => s.updateCard);
  function cancel() {
    const today = new Date().toISOString().slice(0, 10);
    void updateCard(uc.id, { cancellationDate: today });
  }
  return (
    <div className="mt-5 flex items-center gap-2 p-4 pt-0">
      <Link
        href={`/spend?cardId=${encodeURIComponent(uc.id)}`}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Receipt className="h-4 w-4" aria-hidden />
        Update spend
      </Link>
      <Link
        href={`/cards/${uc.card.id}`}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ph-border-strong bg-ph-card px-3.5 py-2.5 text-sm font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit details
      </Link>
      <button
        type="button"
        onClick={cancel}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ph-red bg-ph-card px-3.5 py-2.5 text-sm font-medium text-ph-red transition-colors hover:bg-ph-red/5"
      >
        <Ban className="h-3.5 w-3.5" aria-hidden />
        Cancel
      </button>
    </div>
  );
}

// ── shared row (add-a-card) + empty state ───────────────────────────

function AddCardRow() {
  return (
    <Link
      href="/add-card"
      className="flex items-center gap-3 rounded-ph-card border-2 border-dashed border-ph-border-strong p-4 text-ph-text-muted transition-colors hover:border-ph-brick hover:text-ph-brick"
    >
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ph-fill-warm">
        <Plus className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Add a card you already hold</p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card p-6 text-center">
      <p className="font-serif text-[19px] leading-tight text-ph-ink">No cards on file yet</p>
      <p className="mt-1 text-[13px] text-ph-text-muted">
        Add a card you already hold and Perry will tell you what you&apos;re leaving on the table.
      </p>
    </div>
  );
}

// ── derivations ─────────────────────────────────────────────────────

function computeStatus(uc: UserCardWithDetails): CardStatus {
  const target = uc.bonusTarget ?? Math.round((uc.card.bonusPoints ?? 0) * 0.05);
  const spent = uc.bonusSpentToDate ?? 0;
  const toGo = Math.max(0, target - spent);
  const bonusEarned = uc.bonusReceived === true || (target > 0 && spent >= target);
  const deadlineIso = uc.bonusSpendWindowEndDate ?? null;
  const daysRemaining = deadlineIso
    ? Math.max(0, Math.round((new Date(deadlineIso).getTime() - Date.now()) / 86_400_000))
    : null;

  // "At risk" heuristic: not yet earned + <30 days + more than 10% still
  // outstanding. Real spend + pace projection lands with Phase 5.
  const atRisk = !bonusEarned && (daysRemaining ?? Infinity) <= 30 && toGo > target * 0.1;

  const summaryLine = bonusEarned
    ? 'Bonus earned · nothing to do'
    : deadlineIso
      ? `${formatCurrency(toGo)} to go in ${daysRemaining} days`
      : uc.card.bonusPoints != null
        ? `${formatPoints(uc.card.bonusPoints)} pts sign-up`
        : `${formatCurrency(uc.card.annualFee)} annual fee`;

  return {
    atRisk,
    bonusEarned,
    daysRemaining,
    spendToGo: toGo,
    spendTarget: target,
    spentToDate: spent,
    summaryLine,
    deadlineIso,
  };
}

// ── format helpers ──────────────────────────────────────────────────

function formatDMY(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function currentPeriodEnd(period: string): string {
  const now = new Date();
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  if (period === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
  }
  // annual / one_time — end of the current calendar year is a reasonable
  // default until real anniversary tracking lands
  return `${now.getFullYear()}-12-31`;
}

function shortEnd(period: string): string {
  const iso = currentPeriodEnd(period);
  return formatDMY(iso);
}
