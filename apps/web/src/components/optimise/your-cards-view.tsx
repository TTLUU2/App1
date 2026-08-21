'use client';

// Optimise · Your cards (HANDOFF § 2) — Phase 4b.
//
// Screen purpose: am I going to make the min spend, is anything
// unclaimed? The min-spend pace card is the anchor — everything above
// it exists to give it context, everything below is subordinate.
//
// v1 numbers are prescriptive mocks pulled from the spec so the
// screen reads correctly during design review. Real spend / benefit
// wiring lands in Phase 5 alongside the Log-a-spend consequence
// pipeline; the ACTIVE_CARD / MIN_SPEND / BENEFITS / SECONDARY_CARD
// constants become selectors then.

import Link from 'next/link';
import { AlertTriangle, Check, ChevronDown, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { CardArtFrame, LacquerChip } from '@/components/lacquer';

// Card names + art URLs mirror @ph/shared/data/cards.json entries so
// the plastic CDN images (https://plastic.pointhacks.com.au) render
// through the same paths the Matching / Deals surfaces already use.
const ACTIVE_CARD = {
  name: 'American Express Platinum Card',
  cardArtUrl:
    'https://plastic.pointhacks.com.au/api/files/q3s7m5x1/cjk2jnnoewycj09/amex_platinum_charge_2022_6xljjf9deh.jpg',
  approvedOn: '10 Jun',
  feeAud: 1_450,
};

const MIN_SPEND = {
  toGo: 6_500,
  target: 10_000,
  daysLeft: 19,
  dailyRequired: 342,
  dailyActual: 180,
};

const BENEFITS_UNCLAIMED = {
  count: 1,
  summary: '$400 dining',
};

const SECONDARY_CARD = {
  name: 'Qantas Premier Titanium',
  status: 'Bonus earned · nothing to do',
};

export function YourCardsView() {
  const progress = 1 - MIN_SPEND.toGo / MIN_SPEND.target;
  return (
    <section className="mt-4 space-y-3">
      <ActiveCardBlock />
      <MinSpendCard progress={progress} />
      <BenefitsSummaryRow />
      <SecondaryCardRow />
      <AddCardRow />
      <DetailsDisclosure />
    </section>
  );
}

function ActiveCardBlock() {
  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <div className="flex items-center gap-3">
        <CardArtFrame alt={ACTIVE_CARD.name} src={ACTIVE_CARD.cardArtUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] leading-tight text-ph-ink">{ACTIVE_CARD.name}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Approved {ACTIVE_CARD.approvedOn} · {formatCurrency(ACTIVE_CARD.feeAud)}/yr
          </p>
        </div>
        <LacquerChip variant="amber" Icon={AlertTriangle} size="sm">
          At risk
        </LacquerChip>
      </div>
    </div>
  );
}

function MinSpendCard({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card p-[18px]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Min spend
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-amber-figure">
          {MIN_SPEND.daysLeft} days left
        </p>
      </div>

      <p className="mt-2 font-serif text-[36px] leading-none text-ph-ink">
        {formatCurrency(MIN_SPEND.toGo)}
      </p>
      <p className="mt-1 text-[13px] text-ph-text-muted">
        to go of {formatCurrency(MIN_SPEND.target)}
      </p>

      {/* 10px hero progress track — the biggest bar in the app. */}
      <div className="mt-4 h-[10px] overflow-hidden rounded-full bg-ph-fill" aria-hidden>
        <div
          className="h-full rounded-full bg-ph-brick transition-[width] duration-500 ease-out"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>

      {/* Pace line — the point of the screen. HANDOFF § 2. */}
      <p className="mt-4 text-[15px] leading-snug text-ph-ink">
        You need{' '}
        <strong className="font-semibold">{formatCurrency(MIN_SPEND.dailyRequired)} a day</strong>.
        Last 30 days you averaged{' '}
        <span className="font-semibold text-ph-amber-figure">
          {formatCurrency(MIN_SPEND.dailyActual)}
        </span>
        .
      </p>

      <Link
        href="/spend"
        className="mt-4 flex items-center justify-center rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Log a spend
      </Link>
    </div>
  );
}

function BenefitsSummaryRow() {
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ph-text">
          <strong className="font-semibold">{BENEFITS_UNCLAIMED.count} benefit unclaimed</strong> ·{' '}
          {BENEFITS_UNCLAIMED.summary}
        </p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full bg-ph-pine-chip px-3 py-1 text-xs font-medium text-ph-pine-text"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Mark used
      </button>
    </div>
  );
}

function SecondaryCardRow() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px] text-left transition-colors hover:bg-ph-fill-warm"
    >
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[17px] leading-tight text-ph-ink">{SECONDARY_CARD.name}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-ph-pine">
          <Check className="h-3 w-3" aria-hidden />
          {SECONDARY_CARD.status}
        </p>
      </div>
      <ChevronDown className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
    </button>
  );
}

function AddCardRow() {
  return (
    <Link
      href="/add-card"
      className="flex items-center gap-3 rounded-ph-card border-2 border-dashed border-ph-border-strong p-[15px] text-ph-text-muted transition-colors hover:border-ph-brick hover:text-ph-brick"
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

function DetailsDisclosure() {
  return (
    <details className="rounded-ph-card border border-ph-border bg-ph-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-[15px] text-ph-text-muted">
        <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.14em]">
          Details · fees, dates
        </p>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-ph-border p-[15px] text-[13px] leading-relaxed text-ph-text-muted">
        Annual fee due 10 Jun 2027. Bonus points must post within 90 days of first eligible
        transaction. Referral crediting takes up to 8 weeks after the referred card is approved.
      </div>
    </details>
  );
}
