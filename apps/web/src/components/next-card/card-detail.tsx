'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CancelCardConfirm } from '@/components/cancel-card-confirm';
import {
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  X,
  Info,
  ExternalLink,
  Plane,
  Hotel,
  Receipt,
  Utensils,
  Shield,
  TrendingUp,
} from 'lucide-react';
import type { CardWithIssuer, BenefitCategory } from '@ph/shared';
import { getBenefitsForCard } from '@ph/shared';
import { catalogue, selectEligibilityForCard, useUserCardsStore } from '@/store/user-cards';
import { CardArt } from '@/components/card-art';
import { StatusChip } from '@/components/status-chip';
import { formatCurrency, formatDate, formatPoints, formatRelativeDays } from '@/lib/format';

// Icon per benefit category so the list scans visually as well as
// reads textually. lucide icons keep us in the no-emoji house style.
const BENEFIT_ICON: Record<BenefitCategory, typeof Plane> = {
  travel_credit: Plane,
  hotel_credit: Hotel,
  statement_credit: Receipt,
  dining_credit: Utensils,
  insurance: Shield,
};

const BENEFIT_LABEL: Record<BenefitCategory, string> = {
  travel_credit: 'Travel credit',
  hotel_credit: 'Hotel credit',
  statement_credit: 'Statement credit',
  dining_credit: 'Dining credit',
  insurance: 'Insurance',
};

const PERIOD_LABEL: Record<string, string> = {
  annual: 'per year',
  quarterly: 'per quarter',
  monthly: 'per month',
  one_time: 'one-time',
};

/**
 * PRD §10.3 per-card detail. Always rendered as a Client Component because
 * eligibility depends on the in-memory user history (IndexedDB-backed).
 */
export function CardDetail({ card }: { card: CardWithIssuer }) {
  const router = useRouter();
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  const addCard = useUserCardsStore((s) => s.addCard);
  const updateCard = useUserCardsStore((s) => s.updateCard);

  const heldRecords = userCards.filter((uc) => uc.cardId === card.id);
  const activeHeld = heldRecords.find((uc) => !uc.cancellationDate);

  const eligibility = useMemo(
    () => selectEligibilityForCard({ userCards, loaded, error: null } as never, card.id),
    [userCards, loaded, card.id],
  );

  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!eligibility) {
    return (
      <main className="flex-1 p-4">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  const today = () => new Date().toISOString().slice(0, 10);

  async function handleMarkAsApplied() {
    await addCard({ cardId: card.id, applicationDate: today() });
  }
  async function handleMarkAsCancelled() {
    if (activeHeld) await updateCard(activeHeld.id, { cancellationDate: today() });
    setConfirmingCancel(false);
  }

  return (
    <main className="flex-1 px-4 pb-6">
      <div className="flex items-center pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Hero block */}
      <div className="mt-2 flex flex-col items-center gap-3 text-center">
        <CardArt card={card} size="lg" greyed={eligibility.status === 'not_eligible'} />
        <div>
          <p className="text-xs text-zinc-500">{card.issuer.name}</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight">{card.name}</h1>
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {card.bonusPoints != null && (
            <span className="text-2xl font-semibold text-[var(--color-ph-red)]">
              {formatPoints(card.bonusPoints)} pts
            </span>
          )}
          <span className="text-xs">{formatCurrency(card.annualFee)} / yr</span>
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {card.rewardsProgram}
          </span>
        </div>
      </div>

      {/* Card highlights — earn rate, bonus, fee laid out as a small
          stat grid so the user can read the headline numbers at a
          glance. Lives between the hero and the eligibility verdict
          since "what does this card actually do" is the most important
          detail after "can I get the bonus". */}
      <section
        aria-labelledby="highlights-heading"
        className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="highlights-heading" className="text-sm font-semibold">
          Card highlights
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/40">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Earn rate</dt>
            <dd className="mt-1 text-sm font-semibold">
              {card.earnRatePer1Aud != null ? (
                <>
                  {card.earnRatePer1Aud}
                  <span className="text-xs font-normal text-zinc-500"> pt / $1</span>
                </>
              ) : (
                <span className="text-zinc-400">—</span>
              )}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/40">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Bonus</dt>
            <dd className="mt-1 text-sm font-semibold">
              {card.bonusPoints != null ? (
                <>
                  {formatPoints(card.bonusPoints)}
                  <span className="text-xs font-normal text-zinc-500"> pts</span>
                </>
              ) : (
                <span className="text-zinc-400">—</span>
              )}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/40">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Annual fee</dt>
            <dd className="mt-1 text-sm font-semibold">{formatCurrency(card.annualFee)}</dd>
          </div>
        </dl>
        {/* Footnote — earn rate is the headline rate per issuer marketing.
            Tiered rates (groceries / gov / etc.) aren't modelled yet; on
            the TODO. */}
        <p className="mt-2 text-[10px] text-zinc-500">
          Headline earn rate on everyday spend. Some cards have lower rates on government, BPAY, or
          specific category spend.
        </p>
      </section>

      {/* Card benefits — travel credit, hotel credit, lounge access etc.
          Pulled from getBenefitsForCard(). Hidden when the card has no
          tracked benefits (most basic / no-fee cards). */}
      {(() => {
        const cardBenefits = getBenefitsForCard(card.id);
        if (cardBenefits.length === 0) return null;
        return (
          <section
            aria-labelledby="benefits-heading"
            className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 id="benefits-heading" className="text-sm font-semibold">
              Travel + benefits
            </h2>
            <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
              {cardBenefits.map((b) => {
                const Icon = BENEFIT_ICON[b.category] ?? TrendingUp;
                const periodSuffix = PERIOD_LABEL[b.period] ?? b.period;
                return (
                  <li key={b.id} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="flex-none text-xs font-semibold text-[var(--color-ph-red)]">
                          {formatCurrency(b.valueAud)}
                          <span className="font-normal text-zinc-500"> {periodSuffix}</span>
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
                        {BENEFIT_LABEL[b.category] ?? b.category}
                      </p>
                      {b.description && (
                        <p className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                          {b.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {/* Eligibility verdict */}
      <section
        aria-labelledby="eligibility-heading"
        className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="eligibility-heading" className="text-sm font-semibold">
            Eligibility
          </h2>
          <ConfidenceChip level={eligibility.confidenceLevel} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StatusChip status={eligibility.status} />
          {eligibility.status === 'waiting' && eligibility.daysRemaining != null && (
            <span className="text-xs text-zinc-500">
              eligible {eligibility.eligibleDate ? formatDate(eligibility.eligibleDate) : ''} ·{' '}
              {formatRelativeDays(eligibility.daysRemaining)}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{eligibility.reason}</p>
        {eligibility.greyAreaNotes && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold">
              <Info className="h-3 w-3" aria-hidden />
              Issuer note
            </div>
            <p className="mt-1 leading-relaxed">{eligibility.greyAreaNotes}</p>
          </div>
        )}
      </section>

      {/* Issuer rules summary */}
      <section
        aria-labelledby="rules-heading"
        className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="rules-heading" className="text-sm font-semibold">
          Issuer rules
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-zinc-500">Type</dt>
          <dd className="text-right capitalize">
            {card.issuer.eligibilityType.replace(/_/g, ' ')}
          </dd>
          <dt className="text-zinc-500">Scope</dt>
          <dd className="text-right capitalize">{card.issuer.scope.replace(/_/g, ' ')}</dd>
          <dt className="text-zinc-500">Wait period</dt>
          <dd className="text-right">
            {card.issuer.exclusionPeriodMonths
              ? `${card.issuer.exclusionPeriodMonths} months`
              : '—'}
          </dd>
          <dt className="text-zinc-500">Confidence</dt>
          <dd className="text-right capitalize">{card.issuer.confidenceLevel}</dd>
        </dl>
        {card.issuer.notes && (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{card.issuer.notes}</p>
        )}
      </section>

      {/* Your history with this card */}
      {heldRecords.length > 0 && (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Your history</h2>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
            {heldRecords
              .sort(
                (a, b) =>
                  new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime(),
              )
              .map((uc) => (
                <li key={uc.id} className="flex justify-between gap-2">
                  <span>
                    Applied {formatDate(uc.applicationDate)}
                    {uc.cancellationDate ? (
                      <>
                        {' → cancelled '}
                        {formatDate(uc.cancellationDate)}
                      </>
                    ) : (
                      <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Active
                      </span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* CTAs */}
      <div className="mt-5 flex flex-col gap-2">
        {!activeHeld ? (
          <button
            type="button"
            onClick={handleMarkAsApplied}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-ph-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Mark as applied (today)
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-rose-400 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <X className="h-4 w-4" aria-hidden />
              Mark as cancelled (today)
            </button>
            {confirmingCancel && (
              <CancelCardConfirm
                cardName={card.name}
                onConfirm={handleMarkAsCancelled}
                onClose={() => setConfirmingCancel(false)}
              />
            )}
          </>
        )}
        {/* "Add a different date / details" removed: redundant with the
            Edit details modal on Tab 3 (faster path), and the label was
            confusing — it created a second card record rather than
            editing the existing one. FAB → Add Card still handles the
            rare "want to re-add this card later" case. */}
        <ReadGuideButton card={card} />
      </div>
    </main>
  );
}

// Per PRD §10.3 (updated): deep-links to the canonical Point Hacks guide
// for this card. Falls back to the credit-cards index when the catalogue
// has no per-card URL (6 of 34 cards as of this commit — see the
// POINT_HACKS_URLS map in packages/shared/scripts/generate-catalogue.ts).
function ReadGuideButton({ card }: { card: CardWithIssuer }) {
  const url = card.pointHacksUrl ?? 'https://www.pointhacks.com.au/credit-cards/';
  const isFallback = card.pointHacksUrl == null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        isFallback
          ? 'Browse Point Hacks credit-card guides (opens in a new tab)'
          : `Read the Point Hacks guide for ${card.name} (opens in a new tab)`
      }
      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-300"
    >
      <BookOpen className="h-4 w-4" aria-hidden />
      {isFallback ? 'Browse Point Hacks guides' : 'Read Point Hacks guide'}
      <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
    </a>
  );
}

function ConfidenceChip({ level }: { level: 'high' | 'medium' | 'low' }) {
  const classes =
    level === 'high'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
      : level === 'medium'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classes}`}
    >
      {level} confidence
    </span>
  );
}

// Catalogue-not-found view used by the route page.
export function CardNotFound() {
  return (
    <main className="flex-1 p-6 text-center">
      <h1 className="text-lg font-semibold">Card not found</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        The catalogue doesn&apos;t contain this card id.
      </p>
      <Link
        href="/next-card"
        className="mt-4 inline-block text-sm text-[var(--color-ph-red)] underline"
      >
        Back to Next Card
      </Link>
    </main>
  );
}

export function CardDetailWithId({ id }: { id: string }) {
  const card = catalogue.allCards().find((c) => c.id === id);
  if (!card) return <CardNotFound />;
  return <CardDetail card={card} />;
}
