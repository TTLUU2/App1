'use client';

// Full-screen eligibility matrix. Per-issuer breakdown showing:
//
//   • The issuer's rule (eligibility type + scope + exclusion period)
//   • Which of your cards are held / cancelled with that issuer
//   • What's eligible right now from that issuer
//   • What's still blocked (and why) — with unlock dates where known
//
// Linked from the eligibility detail modal on Tab 4. Full page (not modal)
// because the content is information-dense and benefits from real scroll
// room.

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Grid3x3,
} from 'lucide-react';
import clsx from 'clsx';
import type { CardWithIssuer, EligibilityResult, Issuer } from '@ph/shared';
import { calculateEligibility, getCardsWithIssuer, getIssuers } from '@ph/shared';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { formatDate } from '@/lib/format';

interface CardWithEligibility {
  card: CardWithIssuer;
  eligibility: EligibilityResult;
}

interface IssuerBlock {
  issuer: Issuer;
  held: Array<{
    id: string;
    name: string;
    cancellationDate: string | null;
    activationDate: string | null | undefined;
  }>;
  eligible: CardWithEligibility[];
  grey: CardWithEligibility[];
  waiting: CardWithEligibility[];
  notEligible: CardWithEligibility[];
}

export default function EligibilityMatrixPage() {
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);

  const allUserCards = useMemo(
    () => selectUserCardsWithDetails({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );

  const blocks = useMemo<IssuerBlock[]>(() => {
    const issuers = getIssuers();
    const catalogue = getCardsWithIssuer();

    // Eligibility evaluated against the user's *active* cards. Cancelled
    // cards still feed exclusion windows via the engine's internal logic.
    const active = allUserCards.filter((c) => !c.cancellationDate);

    return issuers
      .map((issuer) => {
        const cards = catalogue.filter((c) => c.issuerId === issuer.id);
        const evaluated: CardWithEligibility[] = cards.map((card) => ({
          card,
          eligibility: calculateEligibility(card, active, issuers),
        }));

        const held = allUserCards
          .filter((uc) => uc.card.issuerId === issuer.id)
          .map((uc) => ({
            id: uc.id,
            name: uc.card.name,
            cancellationDate: uc.cancellationDate,
            activationDate: uc.activationDate,
          }));

        return {
          issuer,
          held,
          eligible: evaluated.filter((e) => e.eligibility.status === 'eligible'),
          grey: evaluated.filter((e) => e.eligibility.status === 'grey_area'),
          waiting: evaluated.filter((e) => e.eligibility.status === 'waiting'),
          notEligible: evaluated.filter((e) => e.eligibility.status === 'not_eligible'),
        };
      })
      .sort((a, b) => {
        // Sort: issuers with held cards first (most relevant), then by
        // number of eligible cards desc (most opportunity next).
        const aHeld = a.held.length > 0 ? 1 : 0;
        const bHeld = b.held.length > 0 ? 1 : 0;
        if (aHeld !== bHeld) return bHeld - aHeld;
        return b.eligible.length - a.eligible.length;
      });
  }, [allUserCards]);

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center">
        <Link
          href="/next-card"
          aria-label="Back to Next card"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <header className="mt-2 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Eligibility overview</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Per-issuer view. Issuers with cards you hold appear first.
      </p>

      {!loaded && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

      {loaded && (
        <>
          <div className="mt-4 space-y-3">
            {blocks.map((b) => (
              <IssuerCard key={b.issuer.id} block={b} />
            ))}
          </div>

          {/* Link to the all-vs-all rules grid — the comprehensive visual
              matrix. Sits at the bottom because power users will reach
              for it after the per-issuer overview above. */}
          <Link
            href="/eligibility-matrix"
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-900 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <span className="inline-flex items-center gap-1.5">
              <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
              View full rules matrix
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          </Link>
        </>
      )}
    </main>
  );
}

function IssuerCard({ block }: { block: IssuerBlock }) {
  const { issuer, held, eligible, grey, waiting, notEligible } = block;

  // Counts for the compact summary row at the top of each issuer card.
  const summary: Array<{
    label: string;
    count: number;
    tone: 'emerald' | 'amber' | 'zinc' | 'rose';
  }> = [
    { label: 'Held', count: held.filter((h) => !h.cancellationDate).length, tone: 'emerald' },
    { label: 'Eligible', count: eligible.length, tone: 'emerald' },
    { label: 'Grey', count: grey.length, tone: 'amber' },
    { label: 'Waiting', count: waiting.length, tone: 'amber' },
    { label: 'Blocked', count: notEligible.length, tone: 'rose' },
  ];

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{issuer.name}</h2>
        <span
          className={clsx(
            'text-[10px] font-medium uppercase tracking-wide',
            issuer.confidenceLevel === 'high'
              ? 'text-emerald-700 dark:text-emerald-300'
              : issuer.confidenceLevel === 'medium'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-zinc-500',
          )}
        >
          {issuer.confidenceLevel} confidence
        </span>
      </header>

      <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">{ruleDetail(issuer)}</p>

      {/* Summary matrix row — five counts, color-coded, no zero entries. */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {summary
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.label}
              className={clsx(
                'inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                s.tone === 'emerald' &&
                  'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                s.tone === 'amber' &&
                  'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                s.tone === 'rose' &&
                  'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
                s.tone === 'zinc' &&
                  'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
              )}
            >
              <span>{s.count}</span>
              <span className="font-normal opacity-80">{s.label}</span>
            </span>
          ))}
      </div>

      {/* Held — only show if user has any cards from this issuer */}
      {held.length > 0 && (
        <Block icon={CheckCircle2} tone="emerald" label="Your cards">
          <ul className="space-y-0.5 text-xs">
            {held.map((h) => (
              <li
                key={h.id}
                className={clsx(
                  'flex items-baseline justify-between gap-2',
                  h.cancellationDate && 'text-zinc-500',
                )}
              >
                <span className="truncate">{h.name}</span>
                <span className="flex-none text-[10px]">
                  {h.cancellationDate ? `cancelled ${formatDate(h.cancellationDate)}` : 'active'}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {eligible.length > 0 && (
        <Block icon={CheckCircle2} tone="emerald" label={`Eligible now (${eligible.length})`}>
          <CardList items={eligible} />
        </Block>
      )}

      {grey.length > 0 && (
        <Block icon={AlertCircle} tone="amber" label={`Grey area (${grey.length})`}>
          <CardList items={grey} />
        </Block>
      )}

      {waiting.length > 0 && (
        <Block icon={Clock} tone="amber" label={`Waiting (${waiting.length})`}>
          <ul className="space-y-0.5 text-xs">
            {waiting.map(({ card, eligibility }) => (
              <li key={card.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{card.name}</span>
                {eligibility.eligibleDate && (
                  <span className="flex-none text-[10px] text-zinc-500">
                    unlocks {formatDate(eligibility.eligibleDate)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {notEligible.length > 0 && (
        <Block icon={Ban} tone="rose" label={`Blocked (${notEligible.length})`}>
          <CardList items={notEligible} muted />
        </Block>
      )}
    </article>
  );
}

function Block({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'emerald' | 'amber' | 'rose';
  label: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-rose-700 dark:text-rose-300';
  return (
    <section className="mt-2.5">
      <h4
        className={clsx(
          'mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide',
          toneClass,
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </h4>
      {children}
    </section>
  );
}

function CardList({ items, muted }: { items: CardWithEligibility[]; muted?: boolean }) {
  return (
    <ul
      className={clsx(
        'space-y-0.5 text-xs',
        muted ? 'text-zinc-500' : 'text-zinc-700 dark:text-zinc-300',
      )}
    >
      {items.map(({ card }) => (
        <li key={card.id} className="truncate">
          {card.name}
        </li>
      ))}
    </ul>
  );
}

// More detailed rule description than the modal version — includes the
// notes field when present, so power users see the full rule context.
function ruleDetail(issuer: Issuer): string {
  const scope =
    issuer.scope === 'issuer_wide'
      ? `any ${issuer.shortName} card`
      : issuer.scope === 'card_family'
        ? `the same card family`
        : `the same specific card`;

  let rule = '';
  if (issuer.eligibilityType === 'first_time_only') {
    rule = `First-time bonuses only on ${scope}.`;
  } else if (issuer.eligibilityType === 'new_to_bank') {
    rule = `Must be new to ${scope}.`;
  } else if (issuer.eligibilityType === 'once_per_card') {
    rule = `Bonus only once per ${scope}.`;
  } else if (issuer.eligibilityType === 'time_based' && issuer.exclusionPeriodMonths) {
    rule = `Wait ${issuer.exclusionPeriodMonths} months between ${scope}.`;
  }

  return issuer.notes ? `${rule} ${issuer.notes}` : rule;
}
