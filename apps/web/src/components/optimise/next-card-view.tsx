'use client';

// Optimise · Next card (HANDOFF § 3) — Phase 4c.
//
// Screen purpose: what should I apply for, and why should I believe
// you? The best-move card + EvidencePanel is the anchor — the
// ranked list underneath is the runner-up context.
//
// Behaviour rules honoured here:
//   #3 Every recommendation shows its reasoning — three evidence
//      bullets on the best-move card, and a serif net-value figure
//      on every ranked row (points minus fee, in pine).
//   #5 One control set per list — filter chips on the top row, sort
//      in the header, nothing else above the first result.
//   #6 Ineligible items stay visible with the reason attached.
//
// v1 catalogue is a prescriptive mock so the screen reads correctly
// under design review. Real ranking + eligibility surfaces from
// @ph/shared land alongside the deck integration in a later phase —
// the shape below matches what the ranker will return.

import { useState } from 'react';
import { Check, ChevronDown, Sparkles, X as XIcon } from 'lucide-react';
import { formatPoints, formatCurrency } from '@/lib/format';
import { CardArtFrame, EvidencePanel, LacquerChip } from '@/components/lacquer';

type ProgramFilter = 'all' | 'qantas' | 'velocity' | 'bank';

const PROGRAM_CHIPS: { id: ProgramFilter; label: string; count: number }[] = [
  { id: 'all', label: 'All', count: 25 },
  { id: 'qantas', label: 'Qantas', count: 9 },
  { id: 'velocity', label: 'Velocity', count: 5 },
  { id: 'bank', label: 'Bank', count: 11 },
];

interface RankedCard {
  rank: number;
  name: string;
  issuerLogo: string;
  pointsBonus: number;
  feeAud: number;
  netValueAud: number;
  eligible: boolean;
  ineligibleReason?: string;
}

// Mock catalogue — swap in the ranker's output when it wires. Issuer
// logos must correspond to a file under /public/images/banks/.
const RANKED: RankedCard[] = [
  {
    rank: 2,
    name: 'ANZ Frequent Flyer Black',
    issuerLogo: 'anz',
    pointsBonus: 120_000,
    feeAud: 375,
    netValueAud: 2_205,
    eligible: true,
  },
  {
    rank: 3,
    name: 'Westpac Altitude Platinum',
    issuerLogo: 'westpac',
    pointsBonus: 100_000,
    feeAud: 420,
    netValueAud: 1_780,
    eligible: true,
  },
  {
    rank: 4,
    name: 'NAB Qantas Signature',
    issuerLogo: 'nab',
    pointsBonus: 130_000,
    feeAud: 395,
    netValueAud: 2_010,
    eligible: false,
    ineligibleReason: 'Held in 2025',
  },
];

export function NextCardView() {
  const [filter, setFilter] = useState<ProgramFilter>('all');
  return (
    <section className="mt-4 space-y-4">
      <ProgramFilterRow active={filter} onChange={setFilter} />
      <BestMoveCard />
      <RankedList cards={RANKED} />
    </section>
  );
}

function ProgramFilterRow({
  active,
  onChange,
}: {
  active: ProgramFilter;
  onChange: (id: ProgramFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {PROGRAM_CHIPS.map((chip) => {
        const isActive = chip.id === active;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(chip.id)}
            className={
              isActive
                ? 'inline-flex flex-none items-center gap-1.5 rounded-full bg-ph-ink px-3 py-1.5 text-xs font-medium text-ph-on-brick'
                : 'inline-flex flex-none items-center gap-1.5 rounded-full bg-ph-fill px-3 py-1.5 text-xs font-medium text-ph-text-muted hover:text-ph-text'
            }
          >
            <span>{chip.label}</span>
            <span
              className={
                isActive
                  ? 'text-ph-on-brick-secondary tabular-nums'
                  : 'text-ph-text-meta tabular-nums'
              }
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BestMoveCard() {
  return (
    <article className="rounded-ph-card border border-ph-border bg-ph-card p-[18px]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">
          Your best move
        </p>
        <LacquerChip variant="pine" Icon={Check} size="sm">
          Bonus eligible
        </LacquerChip>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <CardArtFrame alt="Amex MR Business Explorer" issuerLogo="amex" size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] leading-tight text-ph-ink">
            Amex MR Business Explorer
          </p>
          <p className="mt-2 font-serif text-[26px] leading-none text-ph-brick tabular-nums">
            {formatPoints(150_000)}
          </p>
          <p className="mt-1 text-[13px] text-ph-text-muted">pts · {formatCurrency(370)}/yr</p>
        </div>
      </div>

      <div className="mt-4">
        <EvidencePanel
          bullets={[
            {
              tone: 'pine',
              children: 'Eligible now — no matching card held in the last 24 months.',
            },
            {
              tone: 'pine',
              children: (
                <>
                  <strong>Realistic at your rate</strong>: last 30 days averaged{' '}
                  {formatCurrency(2_400)}
                  /mo; spec asks {formatCurrency(6_000)} in 90 days.
                </>
              ),
            },
            {
              tone: 'amber-brown',
              children: (
                <>
                  Net <strong className="font-semibold">{formatCurrency(2_930)}</strong> after the{' '}
                  {formatCurrency(370)} fee.
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          See the play
        </button>
        <button
          type="button"
          className="rounded-full border border-ph-border-strong bg-ph-card px-4 py-3 text-sm font-medium text-ph-text-muted transition-colors hover:text-ph-text"
        >
          Later
        </button>
      </div>
    </article>
  );
}

function RankedList({ cards }: { cards: RankedCard[] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          The rest
        </h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-muted"
        >
          Sort: best
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {cards.map((c) => (
          <li key={c.rank}>
            <RankedRow card={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankedRow({ card }: { card: RankedCard }) {
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <span className="w-5 font-mono text-[13px] font-medium text-ph-text-meta tabular-nums">
        {card.rank}
      </span>
      <CardArtFrame alt={card.name} issuerLogo={card.issuerLogo} size="xxs" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[17px] leading-tight text-ph-ink">{card.name}</p>
        <p className="mt-0.5 text-[12px] text-ph-text-muted tabular-nums">
          {formatPoints(card.pointsBonus)} pts · {formatCurrency(card.feeAud)}/yr
        </p>
      </div>
      {card.eligible ? (
        <p className="flex-none font-serif text-[19px] leading-none text-ph-pine tabular-nums">
          +{formatCurrency(card.netValueAud)}
        </p>
      ) : (
        <LacquerChip variant="negative" Icon={XIcon} size="sm">
          {card.ineligibleReason ?? 'Ineligible'}
        </LacquerChip>
      )}
    </div>
  );
}
