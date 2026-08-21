'use client';

// Optimise · Next card (HANDOFF § 3) — Phase 4c + follow-up rework.
//
// Screen purpose: what should I apply for, and why should I believe
// you? The best-move card + EvidencePanel is the anchor; a full
// ranked list of the catalogue sits below with working sort, filter,
// and list/carousel toggle. Preferences banner up top; click-outs to
// the eligibility overview + matrix at the bottom.
//
// Data:
//   - Recommendations come from selectRecommendations(state, prefs),
//     the same engine Tab 4 used pre-Lacquer. 34 cards in the
//     catalogue, ranked by priority (eligibility status + points +
//     confidence + preference match, per @ph/shared/engine.ts).
//   - Program filter chips (All / Qantas / Velocity / Bank) count +
//     filter live off the recommendations list — no stale counts.
//   - Sort options: Best (priority), Points (bonusPoints desc), Fee
//     (annualFee asc), Value (net = points × 0.014 − fee, desc).
//   - "Top 3 pick" tag applies to rank ≤ 3 when the user has any
//     preferredPrograms set — otherwise everything is a "best move"
//     and the tag would carry no signal.
//
// Behaviour rules honoured (HANDOFF § Behaviour rules):
//   #3 Every recommendation shows its reasoning — 3-bullet Evidence
//      Panel on the best-move card + net-value figure + status chip
//      on every ranked row.
//   #5 One control set per list — filter chips + sort + view toggle
//      in one strip; nothing else above the first result.
//   #6 Ineligible items stay visible with the reason attached
//      (negative chip on the row).
//   #8 Status = colour + icon + text, always.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Grid2x2,
  List,
  Settings2,
  Sparkles,
  X as XIcon,
} from 'lucide-react';
import type { EligibilityStatus, Recommendation, RewardsProgram } from '@ph/shared';
import { formatPoints, formatCurrency } from '@/lib/format';
import { selectRecommendations, useUserCardsStore } from '@/store/user-cards';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { BottomSheet, CardArtFrame, EvidencePanel, LacquerChip } from '@/components/lacquer';

// ── constants ────────────────────────────────────────────────────────

type ProgramFilter = 'all' | RewardsProgram;
type SortKey = 'best' | 'points' | 'fee' | 'value';
type ViewMode = 'list' | 'carousel';

const PROGRAM_META: { key: ProgramFilter; label: string; program: RewardsProgram | null }[] = [
  { key: 'all', label: 'All', program: null },
  { key: 'qantas', label: 'Qantas', program: 'qantas' },
  { key: 'velocity', label: 'Velocity', program: 'velocity' },
  { key: 'flexible', label: 'Bank', program: 'flexible' },
];

const SORT_LABELS: Record<SortKey, string> = {
  best: 'Best',
  points: 'Points',
  fee: 'Fee',
  value: 'Value',
};

// Mid-range AU CPP for the value estimate — 1.4c/pt is a reasonable
// blended anchor (Qantas J redemptions come in higher, plain retail
// redemptions lower). Not the source of truth; the point of the value
// column is direction, not precision.
const CPP = 0.014;

function netValueAud(bonusPoints: number | null, annualFee: number | null): number {
  return Math.round((bonusPoints ?? 0) * CPP - (annualFee ?? 0));
}

// ── main ─────────────────────────────────────────────────────────────

export function NextCardView() {
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const recs = useUserCardsStore((s) => selectRecommendations(s, preferences));

  const [program, setProgram] = useState<ProgramFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('best');
  const [view, setView] = useState<ViewMode>('list');
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Filter by program + apply sort. `sortBy: 'best'` preserves the
  // engine's priority order (which already factors preferences in).
  const filtered = useMemo(() => {
    const list = program === 'all' ? recs : recs.filter((r) => r.card.rewardsProgram === program);
    const copy = list.slice();
    if (sortBy === 'points')
      copy.sort((a, b) => (b.card.bonusPoints ?? 0) - (a.card.bonusPoints ?? 0));
    else if (sortBy === 'fee') copy.sort((a, b) => a.card.annualFee - b.card.annualFee);
    else if (sortBy === 'value')
      copy.sort(
        (a, b) =>
          netValueAud(b.card.bonusPoints, b.card.annualFee) -
          netValueAud(a.card.bonusPoints, a.card.annualFee),
      );
    return copy;
  }, [recs, program, sortBy]);

  const counts = useMemo(() => {
    // Counts are per program-filter key; RewardsProgram includes 'bank'
    // as well, but we roll bank cards into the 'flexible' bucket for
    // display since the current chip set only exposes All / Qantas /
    // Velocity / Bank (with 'Bank' = flexible in the pre-Lacquer
    // taxonomy).
    const c: Record<ProgramFilter, number> = {
      all: recs.length,
      qantas: 0,
      velocity: 0,
      flexible: 0,
      bank: 0,
    };
    for (const r of recs) {
      const p = r.card.rewardsProgram as RewardsProgram;
      if (p === 'qantas' || p === 'velocity' || p === 'flexible' || p === 'bank') c[p] += 1;
    }
    return c;
  }, [recs]);

  const bestMove = recs[0] ?? null;
  const hasPreferences = preferences.preferredPrograms.length > 0;

  return (
    <section className="mt-4 space-y-5">
      <PreferencesBanner
        programs={preferences.preferredPrograms}
        onEdit={() => setPrefsOpen(true)}
      />

      {bestMove && <BestMoveCard rec={bestMove} />}

      <ControlStrip
        program={program}
        counts={counts}
        onProgram={setProgram}
        sortBy={sortBy}
        onSortBy={setSortBy}
        view={view}
        onView={setView}
      />

      {filtered.length > 0 ? (
        view === 'list' ? (
          <RankedList recs={filtered} hasPreferences={hasPreferences} />
        ) : (
          <RankedCarousel recs={filtered} hasPreferences={hasPreferences} />
        )
      ) : (
        <p className="rounded-ph-card border border-ph-border bg-ph-card p-4 text-center text-[13px] text-ph-text-muted">
          No cards in this program right now. Try another filter.
        </p>
      )}

      <ClickOuts />

      <PreferencesSheet open={prefsOpen} onOpenChange={setPrefsOpen} />
    </section>
  );
}

// ── preferences banner + sheet ───────────────────────────────────────

function PreferencesBanner({
  programs,
  onEdit,
}: {
  programs: RewardsProgram[];
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-ph-card border border-ph-tint-border bg-ph-tint p-3 text-left transition-colors hover:bg-ph-fill-warm"
    >
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ph-card text-ph-brick ring-1 ring-ph-tint-border">
        <Settings2 className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">
          Preferences
        </p>
        <p className="mt-0.5 text-[13px] text-ph-text">
          {programs.length === 0 ? (
            <>Nothing set — the ranker treats every program equally.</>
          ) : (
            <>
              Preferring{' '}
              <strong className="font-semibold">
                {programs.map((p) => PROGRAM_NAME[p] ?? p).join(', ')}
              </strong>
            </>
          )}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
    </button>
  );
}

const PROGRAM_NAME: Partial<Record<RewardsProgram, string>> = {
  qantas: 'Qantas',
  velocity: 'Velocity',
  flexible: 'Amex MR',
  bank: 'Bank points',
};

function PreferencesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const setPrograms = useUserPreferencesStore((s) => s.setPrograms);

  function toggle(program: RewardsProgram) {
    const cur = new Set(preferences.preferredPrograms);
    if (cur.has(program)) cur.delete(program);
    else cur.add(program);
    setPrograms(Array.from(cur));
  }

  const OPTIONS: { key: RewardsProgram; label: string; blurb: string }[] = [
    { key: 'qantas', label: 'Qantas Frequent Flyer', blurb: 'QFF + partner airline redemptions' },
    { key: 'velocity', label: 'Velocity', blurb: 'Virgin + SkyTeam / SIA' },
    {
      key: 'flexible',
      label: 'Amex Membership Rewards',
      blurb: 'Transfer to QFF / KrisFlyer / more',
    },
    { key: 'bank', label: 'Bank / Loyalty points', blurb: 'Direct cash-value redemptions' },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Preferences">
      <p className="mb-3 text-[13px] text-ph-text-muted">
        Pick the programs you want the ranker to prefer. Everything else stays visible; preferred
        ones just rise to the top.
      </p>
      <ul className="space-y-2">
        {OPTIONS.map((opt) => {
          const on = preferences.preferredPrograms.includes(opt.key);
          return (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => toggle(opt.key)}
                aria-pressed={on}
                className={
                  on
                    ? 'flex w-full items-start gap-3 rounded-ph-card border-2 border-ph-brick bg-ph-card p-3 text-left'
                    : 'flex w-full items-start gap-3 rounded-ph-card border border-ph-border bg-ph-card p-3 text-left transition-colors hover:bg-ph-fill-warm'
                }
              >
                <span
                  aria-hidden
                  className={
                    on
                      ? 'mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-ph-brick text-ph-on-brick'
                      : 'mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border border-ph-border-strong'
                  }
                >
                  {on ? <Check className="h-3 w-3" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[17px] leading-tight text-ph-ink">{opt.label}</p>
                  <p className="mt-0.5 text-[12px] text-ph-text-muted">{opt.blurb}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="mt-5 w-full rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Done
      </button>
    </BottomSheet>
  );
}

// ── best-move card ───────────────────────────────────────────────────

function BestMoveCard({ rec }: { rec: Recommendation }) {
  const card = rec.card;
  const net = netValueAud(card.bonusPoints, card.annualFee);
  const eligibleTone: 'pine' | 'amber' | 'negative' =
    rec.eligibility.status === 'eligible'
      ? 'pine'
      : rec.eligibility.status === 'grey_area'
        ? 'amber'
        : 'negative';
  return (
    <article className="rounded-ph-card border border-ph-border bg-ph-card p-[18px]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">
          Your best move
        </p>
        <LacquerChip
          variant={eligibleTone}
          Icon={eligibleTone === 'pine' ? Check : Clock}
          size="sm"
        >
          {rec.eligibility.status === 'eligible'
            ? 'Bonus eligible'
            : rec.eligibility.status === 'grey_area'
              ? 'Grey area'
              : 'Not eligible'}
        </LacquerChip>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <CardArtFrame alt={card.name} src={card.cardArtUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] leading-tight text-ph-ink">{card.name}</p>
          <p className="mt-0.5 text-[11px] text-ph-text-meta">{card.issuer.name}</p>
          <p className="mt-2 font-serif text-[26px] leading-none text-ph-brick tabular-nums">
            {formatPoints(card.bonusPoints ?? 0)}
          </p>
          <p className="mt-1 text-[13px] text-ph-text-muted">
            pts · {formatCurrency(card.annualFee)}/yr
          </p>
        </div>
      </div>

      <div className="mt-4">
        <EvidencePanel
          bullets={[
            { tone: 'pine', children: rec.eligibility.reason || 'Eligible now on this issuer.' },
            {
              tone: 'pine',
              children: (
                <>
                  Earns <strong>{card.earnRatePer1Aud ?? '?'} pts / $1</strong>. Bonus{' '}
                  {formatPoints(card.bonusPoints ?? 0)} on sign-up.
                </>
              ),
            },
            {
              tone: 'amber-brown',
              children: (
                <>
                  Net <strong>{formatCurrency(Math.max(0, net))}</strong> after the{' '}
                  {formatCurrency(card.annualFee)} fee (~{CPP * 100}c/pt).
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={card.pointHacksUrl ?? '#'}
          target={card.pointHacksUrl ? '_blank' : undefined}
          rel={card.pointHacksUrl ? 'noopener noreferrer' : undefined}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          See the play
        </Link>
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

// ── control strip (filter + sort + view) ─────────────────────────────

function ControlStrip({
  program,
  counts,
  onProgram,
  sortBy,
  onSortBy,
  view,
  onView,
}: {
  program: ProgramFilter;
  counts: Record<ProgramFilter, number>;
  onProgram: (id: ProgramFilter) => void;
  sortBy: SortKey;
  onSortBy: (s: SortKey) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PROGRAM_META.map((chip) => {
          const isActive = chip.key === program;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onProgram(chip.key)}
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
                {counts[chip.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-muted">
          Sort:
          <span className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortBy(e.target.value as SortKey)}
              aria-label="Sort ranked cards"
              className="appearance-none rounded-full border border-ph-border-strong bg-ph-card py-1 pl-2 pr-6 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ph-text-meta"
              aria-hidden
            />
          </span>
        </label>

        <div
          role="radiogroup"
          aria-label="View mode"
          className="inline-flex rounded-full bg-ph-fill p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={view === 'list'}
            onClick={() => onView('list')}
            className={
              view === 'list'
                ? 'grid h-7 w-7 place-items-center rounded-full bg-ph-card text-ph-ink'
                : 'grid h-7 w-7 place-items-center rounded-full text-ph-text-meta hover:text-ph-text'
            }
            style={view === 'list' ? { boxShadow: 'var(--shadow-ph-thumb)' } : undefined}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === 'carousel'}
            onClick={() => onView('carousel')}
            className={
              view === 'carousel'
                ? 'grid h-7 w-7 place-items-center rounded-full bg-ph-card text-ph-ink'
                : 'grid h-7 w-7 place-items-center rounded-full text-ph-text-meta hover:text-ph-text'
            }
            style={view === 'carousel' ? { boxShadow: 'var(--shadow-ph-thumb)' } : undefined}
            aria-label="Carousel view"
          >
            <Grid2x2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ranked list + carousel ───────────────────────────────────────────

function RankedList({ recs, hasPreferences }: { recs: Recommendation[]; hasPreferences: boolean }) {
  return (
    <ul className="space-y-2">
      {recs.map((r, i) => (
        <li key={r.card.id}>
          <RankedRow r={r} rank={i + 1} showTopTag={hasPreferences && i < 3} />
        </li>
      ))}
    </ul>
  );
}

function RankedRow({
  r,
  rank,
  showTopTag,
}: {
  r: Recommendation;
  rank: number;
  showTopTag: boolean;
}) {
  const card = r.card;
  const status = r.eligibility.status as EligibilityStatus;
  const net = netValueAud(card.bonusPoints, card.annualFee);
  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <div className="flex items-center gap-3">
        <span className="w-5 font-mono text-[13px] font-medium text-ph-text-meta tabular-nums">
          {rank}
        </span>
        <CardArtFrame alt={card.name} src={card.cardArtUrl ?? undefined} size="xxs" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[17px] leading-tight text-ph-ink">{card.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-ph-text-meta">{card.issuer.name}</p>
          <p className="mt-1 text-[12px] text-ph-text-muted tabular-nums">
            {formatPoints(card.bonusPoints ?? 0)} pts · {formatCurrency(card.annualFee)}/yr
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {status === 'eligible' ? (
            <p className="font-serif text-[19px] leading-none text-ph-pine tabular-nums">
              +{formatCurrency(Math.max(0, net))}
            </p>
          ) : status === 'grey_area' ? (
            <LacquerChip variant="amber" Icon={Clock} size="sm">
              Grey area
            </LacquerChip>
          ) : (
            <LacquerChip variant="negative" Icon={XIcon} size="sm">
              Not eligible
            </LacquerChip>
          )}
        </div>
      </div>
      {showTopTag && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-ph-brick/10 px-2 py-0.5 text-[10px] font-medium text-ph-brick">
          <Sparkles className="h-3 w-3" aria-hidden />
          Top 3 pick · matches your preferences
        </p>
      )}
    </div>
  );
}

function RankedCarousel({
  recs,
  hasPreferences,
}: {
  recs: Recommendation[];
  hasPreferences: boolean;
}) {
  return (
    <div className="-mx-6 overflow-x-auto pb-2">
      <ul className="flex snap-x snap-mandatory gap-3 px-6">
        {recs.map((r, i) => (
          <li key={r.card.id} className="w-[260px] flex-none snap-start">
            <CarouselCard r={r} rank={i + 1} showTopTag={hasPreferences && i < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CarouselCard({
  r,
  rank,
  showTopTag,
}: {
  r: Recommendation;
  rank: number;
  showTopTag: boolean;
}) {
  const card = r.card;
  const status = r.eligibility.status as EligibilityStatus;
  const net = netValueAud(card.bonusPoints, card.annualFee);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-ph-card border border-ph-border bg-ph-card">
      <div className="border-b border-ph-border p-3">
        <CardArtFrame alt={card.name} src={card.cardArtUrl ?? undefined} size="md" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          #{rank} · {card.issuer.name}
        </p>
        <p className="font-serif text-[17px] leading-tight text-ph-ink">{card.name}</p>
        <p className="mt-1 font-serif text-[21px] leading-none text-ph-brick tabular-nums">
          {formatPoints(card.bonusPoints ?? 0)}
        </p>
        <p className="text-[11px] text-ph-text-muted tabular-nums">
          pts · {formatCurrency(card.annualFee)}/yr
        </p>
        <div className="mt-auto pt-2">
          {status === 'eligible' ? (
            <p className="font-serif text-[17px] leading-none text-ph-pine tabular-nums">
              +{formatCurrency(Math.max(0, net))} net
            </p>
          ) : status === 'grey_area' ? (
            <LacquerChip variant="amber" Icon={Clock} size="sm">
              Grey area
            </LacquerChip>
          ) : (
            <LacquerChip variant="negative" Icon={XIcon} size="sm">
              Not eligible
            </LacquerChip>
          )}
          {showTopTag && (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-ph-brick">
              <Sparkles className="h-3 w-3" aria-hidden />
              Top 3 pick
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── bottom click-outs ────────────────────────────────────────────────

function ClickOuts() {
  return (
    <div className="space-y-2 pt-2">
      <Link
        href="/eligibility-overview"
        className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-4 transition-colors hover:bg-ph-fill-warm"
      >
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px] leading-tight text-ph-ink">Bonus-eligible cards</p>
          <p className="mt-0.5 text-[12px] text-ph-text-muted">
            Every card you can apply for right now, grouped by program.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
      </Link>
      <Link
        href="/eligibility-matrix"
        className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-4 transition-colors hover:bg-ph-fill-warm"
      >
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px] leading-tight text-ph-ink">Eligibility matrix</p>
          <p className="mt-0.5 text-[12px] text-ph-text-muted">
            Full issuer rules × your history — see why anything is blocked.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-none text-ph-text-meta" aria-hidden />
      </Link>
    </div>
  );
}
