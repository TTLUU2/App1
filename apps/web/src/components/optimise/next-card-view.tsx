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
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Grid2x2,
  List,
  Plane,
  SlidersHorizontal,
  Sparkles,
  User,
  X as XIcon,
} from 'lucide-react';
import type {
  CardTypePreference,
  EligibilityStatus,
  Recommendation,
  RewardsProgram,
} from '@ph/shared';
import { formatPoints, formatCurrency } from '@/lib/format';
import { selectRecommendations, useUserCardsStore } from '@/store/user-cards';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { BottomSheet, CardArtFrame, EvidencePanel, LacquerChip } from '@/components/lacquer';

// ── constants ────────────────────────────────────────────────────────

type ProgramFilter = 'all' | RewardsProgram;
type SortKey = 'best' | 'points' | 'fee';
type ViewMode = 'list' | 'carousel';

// Per-program active-chip colour. Matches the pre-Lacquer program-pill
// palette (rose for Qantas, purple for Velocity, sky for Bank) — the
// spec doesn't ban brand-adjacent colour here because these pills stand
// FOR the programs, they don't act as UI status. \"All\" stays on the
// ink token so the neutral option reads as chrome.
const PROGRAM_META: {
  key: ProgramFilter;
  label: string;
  program: RewardsProgram | null;
  activeBg: string;
  activeText: string;
}[] = [
  {
    key: 'all',
    label: 'All',
    program: null,
    activeBg: 'bg-ph-ink',
    activeText: 'text-ph-on-brick',
  },
  {
    key: 'qantas',
    label: 'Qantas',
    program: 'qantas',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
  },
  {
    key: 'velocity',
    label: 'Velocity',
    program: 'velocity',
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
  },
  {
    key: 'flexible',
    label: 'Bank',
    program: 'flexible',
    activeBg: 'bg-sky-600',
    activeText: 'text-white',
  },
];

// Value sort dropped — it depended on the net-value estimate the ranked
// rows no longer surface, so the option would sort by a number the user
// couldn't see. Best / Points / Fee cover the useful axes.
const SORT_LABELS: Record<SortKey, string> = {
  best: 'Best',
  points: 'Points',
  fee: 'Fee',
};

// ── main ─────────────────────────────────────────────────────────────

export function NextCardView() {
  // Subscribe to primitive slices only — Zustand v5 uses Object.is on the
  // selector's return value, so a selector that runs the whole engine
  // and returns a fresh array on every call causes an infinite render
  // loop (each render sees a new reference and triggers another). Pull
  // stable slices, then memoise the engine call over them.
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const userCards = useUserCardsStore((s) => s.userCards);
  const loaded = useUserCardsStore((s) => s.loaded);
  const recs = useMemo(() => {
    void userCards;
    void loaded;
    return selectRecommendations(useUserCardsStore.getState(), preferences);
  }, [userCards, loaded, preferences]);

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

  // Bonus-eligible counts per program feed the BonusEligibleGrid below
  // the best-move card. Only counts recs where eligibility.status is
  // exactly 'eligible'.
  const eligiblePerProgram = useMemo(() => {
    const c: Record<RewardsProgram, number> = { qantas: 0, velocity: 0, flexible: 0, bank: 0 };
    for (const r of recs) {
      if (r.eligibility.status !== 'eligible') continue;
      const p = r.card.rewardsProgram as RewardsProgram;
      if (c[p] !== undefined) c[p] += 1;
    }
    return c;
  }, [recs]);

  return (
    <section className="mt-4 space-y-4">
      <BonusEligibleGrid
        counts={eligiblePerProgram}
        onPickProgram={(p) => setProgram(p as ProgramFilter)}
      />

      <PreferencesBanner
        programs={preferences.preferredPrograms}
        cardType={preferences.cardType}
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
  cardType,
  onEdit,
}: {
  programs: RewardsProgram[];
  cardType: CardTypePreference;
  onEdit: () => void;
}) {
  const summaryBits: string[] = [];
  if (programs.length > 0) summaryBits.push(...programs.map((p) => PROGRAM_NAME[p] ?? p));
  summaryBits.push(CARD_TYPE_LABEL[cardType]);
  const summary = summaryBits.join(' · ');
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-ph-text-meta">Preferences:</p>
        <p className="mt-0.5 truncate text-[14px] text-ph-ink">{summary}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full bg-ph-fill px-3 py-1.5 text-xs font-medium text-ph-text-muted transition-colors hover:text-ph-text"
      >
        Edit
      </button>
    </div>
  );
}

const PROGRAM_NAME: Partial<Record<RewardsProgram, string>> = {
  qantas: 'Qantas',
  velocity: 'Velocity',
  flexible: 'Amex / Flexible',
  bank: 'Bank points',
};

const CARD_TYPE_LABEL: Record<CardTypePreference, string> = {
  personal: 'Personal',
  personal_and_business: 'Personal + Business',
  business: 'Business',
};

// ── bonus-eligible grid ─────────────────────────────────────────────

interface BonusEligibleTile {
  program: 'qantas' | 'velocity' | 'flexible';
  label: string;
  Icon: typeof Plane;
  bg: string;
  ink: string;
  count: number;
}

function BonusEligibleGrid({
  counts,
  onPickProgram,
}: {
  counts: Record<RewardsProgram, number>;
  onPickProgram: (p: 'qantas' | 'velocity' | 'flexible') => void;
}) {
  const tiles: BonusEligibleTile[] = [
    {
      program: 'qantas',
      label: 'Qantas',
      Icon: Plane,
      bg: 'bg-rose-50',
      ink: 'text-rose-700',
      count: counts.qantas,
    },
    {
      program: 'velocity',
      label: 'Velocity',
      Icon: Plane,
      bg: 'bg-purple-50',
      ink: 'text-purple-700',
      count: counts.velocity,
    },
    {
      program: 'flexible',
      label: 'Bank',
      Icon: Building2,
      bg: 'bg-sky-50',
      ink: 'text-sky-700',
      count: counts.flexible,
    },
  ];
  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card p-2.5">
      <p className="mb-1.5 px-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ph-text-meta">
        Bonus eligible
      </p>
      <ul className="grid grid-cols-3 gap-1.5">
        {tiles.map((t) => (
          <li key={t.program}>
            <button
              type="button"
              onClick={() => onPickProgram(t.program)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-full ${t.bg} px-2 py-1.5 transition-colors hover:brightness-95`}
            >
              <t.Icon className={`h-3.5 w-3.5 flex-none ${t.ink}`} aria-hidden />
              <span className={`font-serif text-[15px] leading-none tabular-nums ${t.ink}`}>
                {t.count}
              </span>
              <span className={`text-[11px] font-medium ${t.ink}`}>{t.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreferencesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const setPrograms = useUserPreferencesStore((s) => s.setPrograms);
  const setCardType = useUserPreferencesStore((s) => s.setCardType);

  function toggleProgram(program: RewardsProgram) {
    const cur = new Set(preferences.preferredPrograms);
    if (cur.has(program)) cur.delete(program);
    else cur.add(program);
    setPrograms(Array.from(cur));
  }

  const PROGRAM_OPTIONS: { key: RewardsProgram; label: string }[] = [
    { key: 'qantas', label: 'Qantas' },
    { key: 'velocity', label: 'Velocity' },
    { key: 'flexible', label: 'Amex / Flexible' },
    { key: 'bank', label: 'Bank points' },
  ];

  const CARD_TYPE_OPTIONS: {
    key: CardTypePreference;
    label: string;
    blurb: string;
    Icon: typeof User;
  }[] = [
    { key: 'personal', label: 'Personal only', blurb: "I don't have an ABN", Icon: User },
    {
      key: 'personal_and_business',
      label: 'Personal + Business',
      blurb: 'I have an ABN',
      Icon: SlidersHorizontal,
    },
    { key: 'business', label: 'Business only', blurb: 'Business cards only', Icon: Building2 },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Your preferences">
      <p className="mb-4 text-[13px] leading-snug text-ph-text-muted">
        We&apos;ll boost matching cards in Next Card and hide ones you can&apos;t apply for.
        You&apos;ll still see the absolute best move regardless of program preference.
      </p>

      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
        Preferred rewards programs
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {PROGRAM_OPTIONS.map((opt) => {
          const on = preferences.preferredPrograms.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleProgram(opt.key)}
              aria-pressed={on}
              className={
                on
                  ? 'inline-flex items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90'
                  : 'inline-flex items-center justify-center gap-1.5 rounded-full border border-ph-border-strong bg-ph-card px-4 py-2.5 text-sm font-medium text-ph-text-muted transition-colors hover:text-ph-text'
              }
            >
              <Plane className="h-4 w-4" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-ph-text-meta">
        Leave all unselected to treat every program equally.
      </p>

      <h3 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
        Card type
      </h3>
      <ul className="space-y-2">
        {CARD_TYPE_OPTIONS.map((opt) => {
          const on = preferences.cardType === opt.key;
          return (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => setCardType(opt.key)}
                aria-pressed={on}
                className={
                  on
                    ? 'flex w-full items-center gap-3 rounded-ph-card border-[1.5px] border-ph-brick bg-ph-red/5 p-3 text-left'
                    : 'flex w-full items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-3 text-left transition-colors hover:bg-ph-fill-warm'
                }
              >
                <span
                  className={
                    on
                      ? 'grid h-10 w-10 flex-none place-items-center rounded-full bg-ph-red text-white'
                      : 'grid h-10 w-10 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-text-muted'
                  }
                >
                  <opt.Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ph-ink">{opt.label}</p>
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
        className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Check className="h-4 w-4" aria-hidden />
        Save preferences
      </button>
    </BottomSheet>
  );
}

// ── best-move card ───────────────────────────────────────────────────

function BestMoveCard({ rec }: { rec: Recommendation }) {
  const card = rec.card;
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
                  ? `inline-flex flex-none items-center gap-1.5 rounded-full ${chip.activeBg} px-3 py-1.5 text-xs font-medium ${chip.activeText}`
                  : 'inline-flex flex-none items-center gap-1.5 rounded-full bg-ph-fill px-3 py-1.5 text-xs font-medium text-ph-text-muted hover:text-ph-text'
              }
            >
              <span>{chip.label}</span>
              <span
                className={
                  isActive
                    ? `${chip.activeText} opacity-80 tabular-nums`
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
  return (
    <Link
      href={`/cards/${card.id}`}
      className="block rounded-ph-card border border-ph-border bg-ph-card p-[15px] transition-colors hover:bg-ph-fill-warm"
    >
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
            <LacquerChip variant="pine" Icon={Check} size="sm">
              Eligible
            </LacquerChip>
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
    </Link>
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
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex h-full flex-col overflow-hidden rounded-ph-card border border-ph-border bg-ph-card transition-colors hover:bg-ph-fill-warm"
    >
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
            <LacquerChip variant="pine" Icon={Check} size="sm">
              Eligible
            </LacquerChip>
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
    </Link>
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
