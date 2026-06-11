'use client';

/**
 * DealMatcher — 3-step "Card Match" wizard for /deals.
 *
 * Lifted from points-deals/components/deal-matcher.tsx with these PH-Copilot
 * adaptations:
 *  - MaximisePanel replaced with a simple next/link "Ask Copilot how to
 *    maximise" affordance (the upstream version was a Claude streaming
 *    surface tied to the source repo's storage layer).
 *  - ClaimedSummary removed — claimed-deal tracking needs a Zustand slice
 *    we haven't built yet. All claim/unclaim wiring is therefore stubbed
 *    out (no useClaimedDeals hook here).
 *  - Saved-deal state + points-goal state also stubbed for now — those
 *    relied on upstream useSavedDeals / usePointsGoal hooks that don't
 *    exist in this app. The matcher still renders the goal CTA shape so
 *    the UI is wired for a future state slice without breaking the layout.
 *  - DealCard, ProgramLogo, SweetSpotTag imported from our local
 *    components/deals barrel.
 *  - Types come from @/data/deals-types, filter helpers from
 *    @/lib/filter-deals (filterAndSortDeals instead of upstream filterDeals).
 *  - cn from ./cn (local clsx-only joiner).
 *  - Emoji glyphs stripped per CLAUDE.md's no-emoji-in-UI rule.
 *
 * View-Transitions animation: each chip option carries `viewTransitionName:
 * vt-pick-${stepIndex}-${value}` so when a chip is picked, the browser
 * FLIP-morphs it from the question row up to the picks chip row.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Gift,
  Globe,
  Heart,
  LayoutGrid,
  Link2,
  Plane,
  RotateCcw,
  Search,
  ShoppingBag,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { DealCard } from './deal-card';
import { EmptyState } from './empty-state';
import { ProgramLogo } from './program-logo';
import { SweetSpotTag } from './sweet-spot-tag';
import { cn } from './cn';
import {
  DEAL_TYPE_LABELS,
  FLYER_SUBTYPE_LABELS,
  PROGRAM_CATEGORY,
  PROGRAM_SHORT,
  type Deal,
  type DealType,
  type ExpiringWindow,
  type FilterState,
  type LoyaltyProgram,
  type ProgramCategory,
} from '@/data/deals-types';
import { filterAndSortDeals } from '@/lib/filter-deals';
import {
  dealRetailerLabel,
  estimateValueLabel,
  expiryStatus,
  formatBonus,
  formatDateRange,
} from '@/lib/filter-deals';

/* ─── Local stand-ins for upstream storage hooks ─────────────────────────
 * The upstream matcher pulled `useSavedDeals`, `usePointsGoal`, and
 * `useClaimedDeals` from `@/lib/storage`. PH Copilot doesn't have those
 * yet (see CLAUDE.md note about a future Zustand slice). For the demo we
 * render with sensible inert defaults: nothing is saved/claimed and there
 * is no goal. The UI shapes that depend on those fields are still
 * present — only the state mutations are no-ops. */

interface PointsGoal {
  program: LoyaltyProgram;
  currentBalance: number;
  targetBalance: number;
}

/* ─── Step data ─────────────────────────────────────────────────────────── */

interface ChipOption<TValue extends string> {
  value: TValue | 'any';
  label: string;
  chipLabel: string;
  icon: React.ElementType;
}

interface StepConfig<TValue extends string> {
  index: 1 | 2 | 3;
  eyebrow: string;
  question: string;
  options: ChipOption<TValue>[];
}

const STEP_1: StepConfig<DealType> = {
  index: 1,
  eyebrow: 'Step 1 of 3',
  question: 'What kind of deal interests you?',
  options: [
    { value: 'gift-card', label: 'Gift cards', chipLabel: 'Gift cards', icon: Gift },
    { value: 'flyer', label: 'Frequent flyer', chipLabel: 'Frequent flyer', icon: Plane },
    { value: 'hotel', label: 'Hotels', chipLabel: 'Hotels', icon: Building2 },
    { value: 'any', label: 'All', chipLabel: 'Any type', icon: LayoutGrid },
  ],
};

const STEP_2: StepConfig<ProgramCategory> = {
  index: 2,
  eyebrow: 'Step 2 of 3',
  question: 'Where do you collect points?',
  options: [
    { value: 'airline', label: 'Airlines', chipLabel: 'Airlines', icon: Plane },
    { value: 'hotel', label: 'Hotels', chipLabel: 'Hotels', icon: Building2 },
    { value: 'retail', label: 'Retail', chipLabel: 'Retail', icon: ShoppingBag },
    { value: 'any', label: 'Any', chipLabel: 'Any program', icon: Globe },
  ],
};

const STEP_3: StepConfig<ExpiringWindow> = {
  index: 3,
  eyebrow: 'Step 3 of 3',
  question: 'How soon do you need it?',
  options: [
    { value: 'all', label: 'Anytime', chipLabel: 'Anytime', icon: Calendar },
    { value: '30d', label: 'Within 30 days', chipLabel: 'Within 30 days', icon: Clock },
    { value: '7d', label: 'Within 7 days', chipLabel: 'Within 7 days', icon: Zap },
  ],
};

const TOTAL_QUESTIONS = 3;

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Pick {
  stepIndex: 1 | 2 | 3;
  value: string;
  chipLabel: string;
  icon: React.ElementType;
}

function vtName(stepIndex: number, value: string) {
  return `vt-pick-${stepIndex}-${value.replace(/[^a-z0-9-]/gi, '-')}`;
}

const ALL_PROGRAMS: LoyaltyProgram[] = [
  'qantas',
  'velocity',
  'kris-flyer',
  'asia-miles',
  'marriott-bonvoy',
  'hilton-honors',
  'ihg-one',
  'accor-all',
  'flybuys',
  'everyday-rewards',
];

function picksToFilters(picks: Pick[]): FilterState {
  const byStep: Record<number, Pick> = {};
  for (const p of picks) byStep[p.stepIndex] = p;

  const dealTypes: DealType[] =
    byStep[1] && byStep[1].value !== 'any' ? [byStep[1].value as DealType] : [];

  const categoryPick = byStep[2]?.value;
  const programs: LoyaltyProgram[] =
    categoryPick && categoryPick !== 'any'
      ? ALL_PROGRAMS.filter((p) => PROGRAM_CATEGORY[p] === (categoryPick as ProgramCategory))
      : [];

  const expiringWindow: ExpiringWindow = (byStep[3]?.value as ExpiringWindow | undefined) ?? 'all';

  return { dealTypes, programs, flyerSubtypes: [], expiringWindow };
}

interface BrowserViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
}
type StartViewTransition = (cb: () => void) => BrowserViewTransition;

function runWithTransition(update: () => void) {
  if (typeof document === 'undefined') {
    update();
    return;
  }
  const startVT = (document as { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof startVT === 'function') {
    const transition = startVT.call(document, () => {
      flushSync(update);
    });
    transition.finished.catch(() => {});
    transition.ready.catch(() => {});
  } else {
    update();
  }
}

/* ─── Deal-type icon helper (used in LivePreview) ────────────────────────── */

const DEAL_ICON: Record<Deal['dealType'], React.ElementType> = {
  'gift-card': Gift,
  flyer: Plane,
  hotel: Building2,
};

function DealTypeIconSm({ dealType }: { dealType: Deal['dealType'] }) {
  const Icon = DEAL_ICON[dealType];
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper-warm ring-1 ring-line">
      <Icon size={15} strokeWidth={1.75} className="text-ink-soft" />
    </span>
  );
}

/* ─── Expiry inline (used in LivePreview) ────────────────────────────────── */

function ExpiryInline({ endDate, now }: { endDate: string; now?: Date }) {
  const status = expiryStatus(endDate, now);
  if (status.kind === 'expired') return <span className="font-medium text-ink-mute">Ended</span>;
  if (status.kind === 'ending-soon')
    return (
      <span className="font-medium text-rose">
        {status.daysLeft === 0
          ? 'Ends today'
          : status.daysLeft === 1
            ? 'Ends tomorrow'
            : `${status.daysLeft}d left`}
      </span>
    );
  return <span className="font-medium text-ink-soft">{status.daysLeft}d left</span>;
}

/* ─── Root component ─────────────────────────────────────────────────────── */

interface DealMatcherProps {
  deals: Deal[];
  /**
   * Set of loyalty programs the user actually earns into based on their
   * held cards (derived from card.rewardsProgram in the user-cards
   * store). Used to pick the personalised "Top Match" — a deal in this
   * set scored at the top of the wizard-filtered list. Empty set means
   * the user has no cards yet; matcher falls back to a non-personalised
   * top-by-weight result.
   */
  userPrograms?: Set<LoyaltyProgram>;
}

export function DealMatcher({ deals, userPrograms }: DealMatcherProps) {
  const [picks, setPicks] = useState<Pick[]>([]);
  // Saved-state stub — see file header. A future Zustand slice will back this.
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);
  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Points-goal stub — same future-Zustand story as saved deals.
  const [goal, setGoal] = useState<PointsGoal | null>(null);

  const skipNextSync = useRef(true);

  // Restore picks from URL on mount (shareable links).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('t');
    const p = sp.get('p');
    const w = sp.get('w');
    const initial: Pick[] = [];
    if (t) {
      const opt = STEP_1.options.find((o) => o.value === t);
      if (opt)
        initial.push({ stepIndex: 1, value: opt.value, chipLabel: opt.chipLabel, icon: opt.icon });
    }
    if (p && initial.length === 1) {
      const opt = STEP_2.options.find((o) => o.value === p);
      if (opt)
        initial.push({ stepIndex: 2, value: opt.value, chipLabel: opt.chipLabel, icon: opt.icon });
    }
    if (w && initial.length === 2) {
      const opt = STEP_3.options.find((o) => o.value === w);
      if (opt)
        initial.push({ stepIndex: 3, value: opt.value, chipLabel: opt.chipLabel, icon: opt.icon });
    }
    if (initial.length > 0) setPicks(initial);
  }, []);

  // Sync picks → URL.
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const byStep: Record<number, Pick> = {};
    for (const p of picks) byStep[p.stepIndex] = p;
    const params = new URLSearchParams();
    if (byStep[1]) params.set('t', byStep[1].value);
    if (byStep[2]) params.set('p', byStep[2].value);
    if (byStep[3]) params.set('w', byStep[3].value);
    const search = params.toString();
    window.history.replaceState(
      null,
      '',
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }, [picks]);

  const step = (picks.length + 1) as 1 | 2 | 3 | 4;
  const done = picks.length >= TOTAL_QUESTIONS;
  const filters = useMemo(() => picksToFilters(picks), [picks]);
  const visible = useMemo(
    () => filterAndSortDeals(deals, filters, 'ending-soonest'),
    [deals, filters],
  );

  // Stable string hash of the current picks. Used as part of each deal
  // card's React key so changing picks re-mounts the cards and the
  // .reveal-up stagger animation plays on every transition.
  const picksKey = useMemo(() => picks.map((p) => `${p.stepIndex}:${p.value}`).join('|'), [picks]);

  // Top Match — best-by-program-overlap when the user has cards, else
  // just the first visible deal (graceful fallback). visible[] is
  // already sorted by ending-soonest.
  const hasPrograms = !!userPrograms && userPrograms.size > 0;
  const topMatch = useMemo(() => {
    if (!hasPrograms || !userPrograms) return visible[0] ?? null;
    return visible.find((d) => d.programs.some((p) => userPrograms.has(p))) ?? visible[0] ?? null;
  }, [visible, userPrograms, hasPrograms]);
  const restDeals = useMemo(
    () => (topMatch ? visible.filter((d) => d.id !== topMatch.id) : visible),
    [visible, topMatch],
  );
  // Names of the programs that drove the Top Match (used in the "Why
  // this match" microcopy). Only matters when the match is actually
  // personalised (hasPrograms + at least one program overlap).
  const topMatchReasonPrograms = useMemo(() => {
    if (!hasPrograms || !userPrograms || !topMatch) return [] as LoyaltyProgram[];
    return topMatch.programs.filter((p) => userPrograms.has(p));
  }, [topMatch, userPrograms, hasPrograms]);

  const stackingByDealId = useMemo(() => {
    const byId = new Map(visible.map((d) => [d.id, d]));
    const result = new Map<string, Array<{ id: string; title: string }>>();
    for (const deal of visible) {
      if (!deal.stacksWith?.length) continue;
      const partners = deal.stacksWith
        .filter((id) => id !== deal.id && byId.has(id))
        .map((id) => ({ id, title: byId.get(id)!.title }));
      if (partners.length) result.set(deal.id, partners);
    }
    return result;
  }, [visible]);

  const pickOption = <T extends string>(stepIndex: 1 | 2 | 3, option: ChipOption<T>) => {
    const pick: Pick = {
      stepIndex,
      value: option.value,
      chipLabel: option.chipLabel,
      icon: option.icon,
    };
    runWithTransition(() => {
      setPicks((prev) => [...prev.filter((p) => p.stepIndex < stepIndex), pick]);
    });
  };

  const removePickFrom = (stepIndex: number) => {
    runWithTransition(() => setPicks((prev) => prev.filter((p) => p.stepIndex < stepIndex)));
  };

  const reset = () => runWithTransition(() => setPicks([]));

  const currentStep: StepConfig<string> | null = done
    ? null
    : ([STEP_1, STEP_2, STEP_3][step - 1] as StepConfig<string>);

  return (
    <section className="mx-auto max-w-2xl">
      {/* Page-level header (Gift icon + "Deals" + subtitle) is rendered
          by /deals/page.tsx. The picks summary used to sit here above
          the wizard but felt out of place — it now lives inside each
          step/done container under the eyebrow as a subtle PicksLine. */}

      {currentStep && (
        <QuestionView
          key={currentStep.index}
          config={currentStep}
          picks={picks}
          totalSteps={TOTAL_QUESTIONS}
          onPick={pickOption}
          onRemovePick={removePickFrom}
        />
      )}

      {done && (
        <DonePanel
          picks={picks}
          totalSteps={TOTAL_QUESTIONS}
          onAdjust={() => removePickFrom(TOTAL_QUESTIONS)}
          onRemovePick={removePickFrom}
        />
      )}

      {/* Top Match — highlighted card surfaced above the rest of the
          list. Personalised by the user's held-card programs when
          available (passed in from the page). Falls back to the top
          visible deal when the user has no cards. */}
      {topMatch && (
        <div className="mt-6">
          <div
            key={`top-${topMatch.id}-${picksKey}`}
            className="reveal-up rounded-card border border-brand/30 bg-brand-soft/40 p-3 shadow-sm"
            style={{ animationDelay: '0ms' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Top match
              </span>
              {hasPrograms && topMatchReasonPrograms.length > 0 && (
                <span className="text-[10px] uppercase tracking-wide text-ink-mute">
                  Picked for your{' '}
                  {topMatchReasonPrograms
                    .slice(0, 2)
                    .map((p) => PROGRAM_SHORT[p])
                    .join(' + ')}{' '}
                  card{topMatchReasonPrograms.length > 1 ? 's' : ''}
                </span>
              )}
              {!hasPrograms && (
                <span className="text-[10px] uppercase tracking-wide text-ink-mute">
                  Add cards on Optimise for personalised matches
                </span>
              )}
            </div>
            <DealCard deal={topMatch} />
          </div>
        </div>
      )}

      {/* Rest of the matched deals — standard DealCard list with the
          staggered .reveal-up animation when picks change. */}
      {restDeals.length === 0 && !topMatch ? (
        <div className="mt-6">
          <EmptyState onClear={reset} />
        </div>
      ) : restDeals.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {restDeals.map((d, i) => (
            <div
              key={`${d.id}-${picksKey}`}
              className="reveal-up"
              style={{ animationDelay: `${Math.min((i + 1) * 35, 350)}ms` }}
            >
              <DealCard deal={d} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ─── Chip row ──────────────────────────────────────────────────────────── */

// Subtle picks row — sits under the step eyebrow inside QuestionView /
// DonePanel rather than as its own block above the wizard. Renders
// nothing when there are no picks yet (no "your picks land here..."
// placeholder). Picked chips are smaller + lower-contrast than the
// option chips so they read as already-chosen context, not as the
// active choice.
function PicksLine({
  picks,
  totalSteps,
  onRemove,
}: {
  picks: Pick[];
  totalSteps: number;
  onRemove: (stepIndex: number) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {picks.map((pick) => {
        const Icon = pick.icon;
        return (
          <button
            key={`${pick.stepIndex}-${pick.value}`}
            type="button"
            onClick={() => onRemove(pick.stepIndex)}
            style={{ viewTransitionName: vtName(pick.stepIndex, pick.value) } as CSSProperties}
            className={cn(
              'vt-pick group inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft/60 px-2 py-0.5 text-[10px] font-medium text-brand-deep transition',
              'hover:border-brand hover:bg-brand hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
            )}
            aria-label={`Remove ${pick.chipLabel}`}
          >
            <Icon size={10} strokeWidth={2} />
            <span>{pick.chipLabel}</span>
            <X size={9} strokeWidth={2.5} className="opacity-50 group-hover:opacity-100" />
          </button>
        );
      })}
      <span className="ml-auto text-[10px] font-medium tracking-wide text-ink-mute">
        {picks.length}/{totalSteps}
      </span>
    </div>
  );
}

/* ─── Question view ─────────────────────────────────────────────────────── */

function QuestionView<T extends string>({
  config,
  picks,
  totalSteps,
  onPick,
  onRemovePick,
}: {
  config: StepConfig<T>;
  picks: Pick[];
  totalSteps: number;
  onPick: (stepIndex: 1 | 2 | 3, option: ChipOption<T>) => void;
  onRemovePick: (stepIndex: number) => void;
}) {
  return (
    <div
      className="mb-8 step-enter-left"
      style={{ viewTransitionName: `vt-question-step-${config.index}` } as CSSProperties}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{config.eyebrow}</p>
      {/* Subtle picks line under the step eyebrow — shows what's been
          chosen so far without competing with the active question. */}
      <PicksLine picks={picks} totalSteps={totalSteps} onRemove={onRemovePick} />
      <h2 className="mt-3 font-serif text-2xl leading-tight text-ink sm:text-[1.65rem]">
        {config.question}
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {config.options.map((opt) => (
          <ChipButton
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            vtName={vtName(config.index, opt.value)}
            onClick={() => onPick(config.index, opt)}
          />
        ))}
      </div>
    </div>
  );
}

function ChipButton({
  label,
  icon: Icon,
  vtName,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  vtName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ viewTransitionName: vtName } as CSSProperties}
      className={cn(
        'vt-pick inline-flex items-center gap-2 rounded-full border-2 border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-shadow duration-200',
        'hover:border-brand hover:shadow-[0_8px_20px_-12px_rgba(168,30,30,0.35)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      )}
    >
      <Icon size={15} strokeWidth={1.75} className="shrink-0 text-ink-soft" />
      <span>{label}</span>
    </button>
  );
}

/* ─── Done panel ────────────────────────────────────────────────────────── */

function DonePanel({
  picks,
  totalSteps,
  onAdjust,
  onRemovePick,
}: {
  picks: Pick[];
  totalSteps: number;
  onAdjust: () => void;
  onRemovePick: (stepIndex: number) => void;
}) {
  return (
    <div className="mb-8" style={{ viewTransitionName: 'vt-question-done' } as CSSProperties}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">All set</p>
      {/* Picks under the eyebrow — same subtle treatment as during steps. */}
      <PicksLine picks={picks} totalSteps={totalSteps} onRemove={onRemovePick} />
      <h2 className="mt-3 font-serif text-2xl leading-tight text-ink sm:text-[1.65rem]">
        Here&apos;s your top match
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Tap a chip above to refine, or{' '}
        <button
          type="button"
          onClick={onAdjust}
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          adjust your last answer
        </button>
        .
      </p>
    </div>
  );
}

/* ─── Toolbar ───────────────────────────────────────────────────────────── */

function Toolbar({
  visibleCount,
  savedCount,
  onReset,
  hasPicks,
}: {
  visibleCount: number;
  savedCount: number;
  onReset: () => void;
  hasPicks: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between border-y border-line py-2.5 text-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-ink-mute tabular-nums">
          <span className="font-semibold text-ink">{visibleCount}</span>{' '}
          {visibleCount === 1 ? 'deal' : 'deals'}
        </span>
        {savedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose/10 px-2 py-0.5 text-[11px] font-medium text-rose">
            <Heart size={10} fill="currentColor" />
            {savedCount} saved
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={!hasPicks}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium transition',
          hasPicks ? 'text-brand hover:text-brand-deep' : 'cursor-not-allowed text-ink-mute/50',
        )}
      >
        <RotateCcw size={13} strokeWidth={2} />
        Reset
      </button>
    </div>
  );
}

/* ─── Goal bar ──────────────────────────────────────────────────────────── */

const GOAL_PROGRAMS: LoyaltyProgram[] = [
  'qantas',
  'velocity',
  'kris-flyer',
  'asia-miles',
  'marriott-bonvoy',
  'hilton-honors',
  'ihg-one',
  'accor-all',
  'flybuys',
  'everyday-rewards',
];

function GoalBar({
  goal,
  onSetGoal,
}: {
  goal: PointsGoal | null;
  onSetGoal: (g: PointsGoal | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    program: 'velocity' as LoyaltyProgram,
    current: '',
    target: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        program: goal?.program ?? 'velocity',
        current: goal?.currentBalance?.toString() ?? '',
        target: goal?.targetBalance?.toString() ?? '',
      });
    }
    // We deliberately only refresh the form when the drawer opens, not on
    // every goal change. Reopening with a fresh snapshot is the desired UX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = parseInt(form.current) || 0;
    const target = parseInt(form.target) || 0;
    if (target > 0)
      onSetGoal({ program: form.program, currentBalance: current, targetBalance: target });
    setOpen(false);
  };

  if (goal && !open) {
    const pct = Math.min(100, Math.round((goal.currentBalance / goal.targetBalance) * 100));
    return (
      <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-brand-soft px-3 py-2 text-sm">
        <Target size={14} strokeWidth={2} className="shrink-0 text-brand" />
        <span className="font-medium text-ink">{PROGRAM_SHORT[goal.program]}</span>
        <span className="text-ink-mute tabular-nums">
          {goal.currentBalance.toLocaleString('en-AU')}
          {' / '}
          {goal.targetBalance.toLocaleString('en-AU')}
        </span>
        <div className="min-w-[48px] flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-1.5 rounded-full bg-brand transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-semibold tabular-nums text-brand-deep">{pct}%</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] text-ink-mute underline-offset-2 hover:text-ink hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onSetGoal(null)}
          aria-label="Remove goal"
          className="text-ink-mute hover:text-ink"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (open) {
    return (
      <form
        onSubmit={handleSubmit}
        className="mb-4 rounded-lg border border-line bg-paper-warm/50 p-3.5 text-sm"
      >
        <div className="mb-3 flex items-center gap-1.5 font-medium text-ink">
          <Target size={14} strokeWidth={2} className="text-brand" />
          Set a points goal
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={form.program}
            onChange={(e) => setForm((f) => ({ ...f, program: e.target.value as LoyaltyProgram }))}
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          >
            {GOAL_PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {PROGRAM_SHORT[p]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Current balance"
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <input
            type="number"
            min={1}
            placeholder="Target balance"
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-brand px-3.5 py-1 text-xs font-medium text-paper hover:bg-brand-deep"
          >
            Save goal
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-line px-3.5 py-1 text-xs text-ink-mute hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mb-4 flex items-center gap-1.5 text-xs text-ink-mute transition hover:text-ink-soft"
    >
      <Target size={13} strokeWidth={2} className="shrink-0" />
      <span>Track a points goal</span>
      <ChevronRight size={12} strokeWidth={2} className="text-ink-mute/50" />
    </button>
  );
}

/* ─── Goal progress (replaces upstream cpp.computeGoalProgress) ─────────── */

function computeGoalProgress(bonus: Deal['bonus'], goal: PointsGoal | null): number | null {
  if (!goal) return null;
  if (bonus.kind !== 'bonus-points') return null;
  if (bonus.program !== goal.program) return null;
  const remaining = goal.targetBalance - goal.currentBalance;
  if (remaining <= 0) return 100;
  return Math.min(100, Math.round((bonus.value / remaining) * 100));
}

/* ─── Live preview (Top match) ───────────────────────────────────────────── */

function LivePreview({
  deal,
  goal,
  isSaved,
  onToggleSave,
  stackingWith,
}: {
  deal: Deal;
  goal: PointsGoal | null;
  isSaved: boolean;
  onToggleSave: () => void;
  stackingWith?: Array<{ id: string; title: string }>;
}) {
  const valueLabel = estimateValueLabel(deal.bonus);
  const goalProgress = goal ? computeGoalProgress(deal.bonus, goal) : null;
  const subtypeLabel = deal.dealType === 'flyer' ? FLYER_SUBTYPE_LABELS[deal.flyerSubtype] : null;
  const [primaryProgram] = deal.programs;

  return (
    <div
      style={{ viewTransitionName: `vt-top-${deal.id}` } as CSSProperties}
      className="mb-8 overflow-hidden rounded-card border-2 border-brand/20 bg-paper shadow-[0_12px_32px_-18px_rgba(20,30,60,0.22)]"
    >
      {/* ── Top-match label strip ── */}
      <div className="flex items-center justify-between border-b border-brand/10 bg-brand-soft/60 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
          Top match
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-mute">
          Best for your picks
        </span>
      </div>

      {/* ── Body ── */}
      <div className="p-5">
        {/* Row 1: type icon + meta | program logo + heart */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <DealTypeIconSm dealType={deal.dealType} />
            <div className="min-w-0 text-[11px] uppercase tracking-wide text-ink-mute leading-[1.35]">
              <div>
                {DEAL_TYPE_LABELS[deal.dealType]}
                {subtypeLabel && (
                  <>
                    <span className="mx-1 text-ink-mute/40">·</span>
                    {subtypeLabel}
                  </>
                )}
              </div>
              <div className="mt-0.5 font-medium normal-case tracking-normal text-ink-soft truncate">
                {dealRetailerLabel(deal)}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {primaryProgram && <ProgramLogo program={primaryProgram} size="lg" />}
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={isSaved ? 'Unsave deal' : 'Save deal'}
              className={cn(
                'grid size-8 place-items-center rounded-full transition',
                isSaved ? 'text-rose' : 'text-ink-mute/40 hover:text-rose',
              )}
            >
              <Heart size={16} strokeWidth={1.75} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Title — bigger than list cards */}
        <h3 className="mt-4 font-serif text-2xl leading-snug text-ink sm:text-3xl">{deal.title}</h3>

        {/* Description — 3 lines for top match */}
        <p className="mt-2 text-sm leading-relaxed text-ink-soft line-clamp-3">
          {deal.description}
        </p>

        {/* Stats block */}
        <div className="mt-4 rounded-xl bg-paper-warm px-4 py-3.5">
          <div className="font-serif text-2xl leading-none text-brand-deep tabular-nums sm:text-3xl">
            {formatBonus(deal.bonus)}
          </div>
          {valueLabel && (
            <div className="mt-0.5 text-[11px] italic text-ink-mute">{valueLabel}</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-mute">
            <span>{formatDateRange(deal.startDate, deal.endDate)}</span>
            <span aria-hidden>·</span>
            <ExpiryInline endDate={deal.endDate} />
          </div>
          {goalProgress != null && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-medium text-brand-deep">
              <Target size={10} strokeWidth={2} />
              {goalProgress}% of your goal
            </div>
          )}
          <div className="mt-2">
            <SweetSpotTag bonus={deal.bonus} variant="hero" />
          </div>
        </div>

        {/* Stacking */}
        {stackingWith && stackingWith.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {stackingWith.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm"
              >
                <Link2 size={13} strokeWidth={2} className="shrink-0 text-emerald-600" />
                <span className="text-ink-soft">
                  Stacks with <span className="font-medium text-emerald-800">{s.title}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Replaces upstream MaximisePanel — routes to /ask. */}
        <div className="mt-4">
          <Link href="/ask" className="text-xs font-medium text-brand hover:underline">
            Ask Copilot how to maximise →
          </Link>
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper-warm/40 px-5 py-3.5">
        {/* Claim/unclaim wiring deferred — see file header. */}
        <div />

        {/* View deal (right) */}
        <a
          href={deal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-medium text-paper transition hover:bg-brand-deep"
        >
          View deal
          <ArrowUpRight size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

/* ─── No match ──────────────────────────────────────────────────────────── */

function NoMatch({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper-warm/50 p-8 text-center">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-paper ring-1 ring-line">
        <Search size={18} strokeWidth={1.75} className="text-ink-mute" />
      </div>
      <p className="font-serif text-lg text-ink">No deals match those picks.</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
        Try widening the urgency window, or pick a different program family.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep"
      >
        Reset picks
      </button>
    </div>
  );
}

/* ─── More matches ──────────────────────────────────────────────────────── */

function MoreMatches({
  deals,
  goal,
  isSaved,
  toggleSaved,
  stackingByDealId,
}: {
  deals: Deal[];
  goal: PointsGoal | null;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  stackingByDealId: Map<string, Array<{ id: string; title: string }>>;
}) {
  return (
    <div className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-ink">More matches</h3>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-mute tabular-nums">
          {deals.length} more
        </span>
      </div>
      <ul className="space-y-3">
        {deals.map((deal, i) => (
          <li
            key={deal.id}
            className="reveal-up"
            style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
          >
            <DealCard
              deal={deal}
              isSaved={isSaved(deal.id)}
              onToggleSave={() => toggleSaved(deal.id)}
              goalProgress={computeGoalProgress(deal.bonus, goal)}
              stackingWith={stackingByDealId.get(deal.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
