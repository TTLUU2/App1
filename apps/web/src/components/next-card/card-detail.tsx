'use client';

// /cards/[id] — per-card overview (PRD §10.3), Lacquer rebuild.
//
// Reached from the Optimise · Next card ranked list, and from any Matching
// / Deals affordance that surfaces a specific catalogue card. Not a modal
// — dense content deserves its own scroll room.
//
// Sections (matches designer reference):
//   1. Back + hero (card art large + issuer + name + points/fee/program)
//   2. Card highlights — earn rate / bonus / annual fee tiles
//   3. Travel + benefits — one row per benefit (getBenefitsForCard)
//   4. Bonus eligibility — pine/amber/negative chip + confidence pill +
//      one-line reason from calculateEligibility
//   5. Issuer rules — Type / Scope / Wait period / Confidence label rows
//      + free-text description from the eligibility reason
//   6. Actions — Mark as applied (primary, red pill) + Read Point Hacks
//      guide (outline, opens the card's pointHacksUrl)
//
// Cancel-card affordance stays: when the user is currently holding the
// card, "Mark as applied" is swapped for a Cancel button that opens the
// existing CancelCardConfirm modal.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Hotel,
  Plane,
  Receipt,
  Shield,
  Utensils,
  X as XIcon,
} from 'lucide-react';
import type { BenefitCategory, CardWithIssuer, EligibilityStatus } from '@ph/shared';
import { getBenefitsForCard } from '@ph/shared';
import { catalogue, selectEligibilityForCard, useUserCardsStore } from '@/store/user-cards';
import { CancelCardConfirm } from '@/components/cancel-card-confirm';
import { LacquerChip } from '@/components/lacquer';
import { formatCurrency, formatPoints } from '@/lib/format';

// ── icon + label maps ────────────────────────────────────────────────

const BENEFIT_ICON: Record<BenefitCategory, typeof Plane> = {
  travel_credit: Plane,
  hotel_credit: Hotel,
  statement_credit: Receipt,
  dining_credit: Utensils,
  insurance: Shield,
};

const BENEFIT_EYEBROW: Record<BenefitCategory, string> = {
  travel_credit: 'Travel credit',
  hotel_credit: 'Hotel credit',
  statement_credit: 'Statement credit',
  dining_credit: 'Dining credit',
  insurance: 'Insurance',
};

const PERIOD_SUFFIX: Record<string, string> = {
  annual: 'per year',
  quarterly: 'per quarter',
  monthly: 'per month',
  one_time: 'one-time',
};

const PROGRAM_LABEL: Record<string, string> = {
  qantas: 'QANTAS',
  velocity: 'VELOCITY',
  flexible: 'AMEX MR',
  bank: 'BANK POINTS',
};

// ── route wrappers ───────────────────────────────────────────────────

/** Route wrapper used by /cards/[id]/page.tsx. Falls through when the
 *  id doesn't match a catalogue entry (stale bookmark / bad URL). */
export function CardDetailWithId({ id }: { id: string }) {
  const card = useMemo(() => catalogue.allCards().find((c) => c.id === id) ?? null, [id]);
  if (!card) {
    return (
      <main className="min-h-dvh bg-ph-paper text-ph-text">
        <div className="px-6 pt-6 pb-32">
          <p className="text-[13px] text-ph-text-muted">
            No card matches that link. It may have been retired from the catalogue.
          </p>
        </div>
      </main>
    );
  }
  return <CardDetail card={card} />;
}

// ── main ─────────────────────────────────────────────────────────────

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
      <main className="min-h-dvh bg-ph-paper text-ph-text">
        <div className="px-6 pt-6 pb-32">
          <p className="text-[13px] text-ph-text-muted">Loading…</p>
        </div>
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

  const benefits = getBenefitsForCard(card.id);
  const status = eligibility.status as EligibilityStatus;

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
        <div className="mb-2 flex items-center">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full text-ph-text-muted hover:bg-ph-fill-warm hover:text-ph-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Hero — real card art centred, issuer + name + points line. */}
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <div
            className={
              status === 'not_eligible'
                ? 'overflow-hidden rounded-2xl grayscale opacity-70'
                : 'overflow-hidden rounded-2xl'
            }
            style={{ width: 240, height: 152 }}
          >
            {card.cardArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external plastic CDN
              <img src={card.cardArtUrl} alt={card.name} className="h-full w-full object-cover" />
            ) : (
              <span
                aria-label={`${card.name} placeholder`}
                className="grid h-full w-full place-items-center bg-ph-fill text-ph-text-meta"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, var(--color-ph-fill) 0 8px, var(--color-ph-fill-warm) 8px 16px)',
                }}
              >
                card art
              </span>
            )}
          </div>

          <div>
            <p className="text-[13px] text-ph-text-muted">{card.issuer.name}</p>
            <h1 className="mt-1 font-serif text-[26px] leading-tight text-ph-ink">{card.name}</h1>
          </div>

          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            {card.bonusPoints != null && (
              <span className="font-serif text-[28px] leading-none text-ph-red tabular-nums">
                {formatPoints(card.bonusPoints)} pts
              </span>
            )}
            <span className="text-[13px] text-ph-text-muted">
              {formatCurrency(card.annualFee)} / yr
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              {PROGRAM_LABEL[card.rewardsProgram] ?? card.rewardsProgram}
            </span>
          </div>
        </div>

        {/* Card highlights */}
        <section
          aria-labelledby="highlights-heading"
          className="mt-6 rounded-ph-card border border-ph-border bg-ph-card p-4"
        >
          <h2 id="highlights-heading" className="text-[15px] font-semibold text-ph-ink">
            Card highlights
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <HighlightTile
              label="Earn rate"
              value={card.earnRatePer1Aud != null ? String(card.earnRatePer1Aud) : '—'}
              suffix={card.earnRatePer1Aud != null ? 'pt / $1' : undefined}
            />
            <HighlightTile
              label="Bonus"
              value={card.bonusPoints != null ? formatPoints(card.bonusPoints) : '—'}
              suffix={card.bonusPoints != null ? 'pts' : undefined}
            />
            <HighlightTile label="Annual fee" value={formatCurrency(card.annualFee)} />
          </div>
          <p className="mt-3 text-[12px] leading-snug text-ph-text-muted">
            Headline earn rate on everyday spend. Some cards have lower rates on government, BPAY,
            or specific category spend.
          </p>
        </section>

        {/* Travel + benefits */}
        {benefits.length > 0 && (
          <section
            aria-labelledby="benefits-heading"
            className="mt-4 rounded-ph-card border border-ph-border bg-ph-card p-4"
          >
            <h2 id="benefits-heading" className="text-[15px] font-semibold text-ph-ink">
              Travel + benefits
            </h2>
            <ul className="mt-3 divide-y divide-ph-border">
              {benefits.map((b) => {
                const Icon = BENEFIT_ICON[b.category] ?? Plane;
                const suffix = PERIOD_SUFFIX[b.period] ?? b.period;
                return (
                  <li key={b.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[15px] font-semibold text-ph-ink">{b.name}</p>
                        <p className="flex-none text-[13px] tabular-nums">
                          <span className="font-semibold text-ph-red">
                            {formatCurrency(b.valueAud)}
                          </span>
                          <span className="ml-1 text-ph-text-muted">{suffix}</span>
                        </p>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                        {BENEFIT_EYEBROW[b.category] ?? b.category}
                      </p>
                      {b.description && (
                        <p className="mt-1 text-[12px] leading-snug text-ph-text-muted">
                          {b.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Bonus eligibility */}
        <section
          aria-labelledby="eligibility-heading"
          className="mt-4 rounded-ph-card border border-ph-border bg-ph-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="eligibility-heading" className="text-[15px] font-semibold text-ph-ink">
              Bonus eligibility
            </h2>
            <ConfidencePill level={eligibility.confidenceLevel} />
          </div>
          <div className="mt-3">
            <StatusChipInline status={status} />
          </div>
          <p className="mt-3 text-[13px] leading-snug text-ph-text">{eligibility.reason}</p>
          {eligibility.greyAreaNotes && (
            <p className="mt-2 text-[12px] leading-snug text-ph-text-muted">
              {eligibility.greyAreaNotes}
            </p>
          )}
        </section>

        {/* Issuer rules */}
        <section
          aria-labelledby="rules-heading"
          className="mt-4 rounded-ph-card border border-ph-border bg-ph-card p-4"
        >
          <h2 id="rules-heading" className="text-[15px] font-semibold text-ph-ink">
            Issuer rules
          </h2>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            {(
              [
                ['Type', issuerRuleType(card.issuer.name)],
                ['Scope', issuerRuleScope(card.issuer.name)],
                [
                  'Wait period',
                  issuerRuleWaitMonths(card.issuer.name)
                    ? `${issuerRuleWaitMonths(card.issuer.name)} months`
                    : '—',
                ],
                ['Confidence', capitalise(eligibility.confidenceLevel)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="text-ph-text-muted">{k}</dt>
                <dd className="text-ph-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] leading-snug text-ph-text-muted">
            {issuerRuleBlurb(card.issuer.name)}
          </p>
        </section>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          {activeHeld ? (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-ph-red bg-ph-card px-4 py-3 text-sm font-medium text-ph-red transition-colors hover:bg-ph-red/5"
            >
              <XIcon className="h-4 w-4" aria-hidden />
              Mark as cancelled
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMarkAsApplied}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Mark as applied (today)
            </button>
          )}

          {card.pointHacksUrl && (
            <Link
              href={card.pointHacksUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ph-border-strong bg-ph-card px-4 py-3 text-sm font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Read Point Hacks guide
              <ExternalLink className="h-3.5 w-3.5 text-ph-text-meta" aria-hidden />
            </Link>
          )}
        </div>

        {confirmingCancel && (
          <CancelCardConfirm
            cardName={card.name}
            onConfirm={handleMarkAsCancelled}
            onClose={() => setConfirmingCancel(false)}
          />
        )}
      </div>
    </main>
  );
}

// ── local subcomponents + helpers ────────────────────────────────────

function HighlightTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-ph-inner border border-ph-border bg-ph-fill-warm/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">{label}</p>
      <p className="mt-1 font-serif text-[19px] leading-none tabular-nums text-ph-ink">
        {value}
        {suffix ? (
          <span className="ml-0.5 font-sans text-[11px] font-normal text-ph-text-muted">
            {' '}
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function ConfidencePill({ level }: { level: 'high' | 'medium' | 'low' }) {
  const label = `${level.toUpperCase()} CONFIDENCE`;
  const cls =
    level === 'high'
      ? 'bg-ph-pine-chip text-ph-pine-text'
      : level === 'medium'
        ? 'bg-ph-amber-chip text-ph-amber-text'
        : 'bg-ph-fill text-ph-text-muted';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}
    >
      {label}
    </span>
  );
}

function StatusChipInline({ status }: { status: EligibilityStatus }) {
  if (status === 'eligible') {
    return (
      <LacquerChip variant="pine" Icon={Check} size="sm">
        Bonus eligible
      </LacquerChip>
    );
  }
  if (status === 'grey_area') {
    return (
      <LacquerChip variant="amber" Icon={Clock} size="sm">
        Grey area
      </LacquerChip>
    );
  }
  if (status === 'waiting') {
    return (
      <LacquerChip variant="amber" Icon={Clock} size="sm">
        Waiting
      </LacquerChip>
    );
  }
  return (
    <LacquerChip variant="negative" Icon={XIcon} size="sm">
      Not eligible
    </LacquerChip>
  );
}

// ── issuer-rule table (v1 static; real IssuerEligibilityRule wiring
//    is a follow-up once the shared package exposes the rule struct
//    directly. For now these read from a small in-file map so the UI
//    shows realistic figures per issuer.) ─────────────────────────────

interface IssuerRule {
  type: 'Time Based' | 'Points Based' | 'No Restrictions';
  scope: 'Card Family' | 'Individual Card' | 'Issuer Wide';
  waitMonths: number | null;
  blurb: string;
}

const ISSUER_RULES: Record<string, IssuerRule> = {
  Amex: {
    type: 'Time Based',
    scope: 'Individual Card',
    waitMonths: 18,
    blurb: '18 months since last-cancelled Amex personal card. Business + personal pools separate.',
  },
  ANZ: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait per ANZ card family (Rewards / Frequent Flyer counted separately).',
  },
  NAB: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait per NAB card family. QF/Rewards/Velocity considered same family.',
  },
  Westpac: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 24,
    blurb:
      '24 month family-wide waiting for Altitude cards. QF/Rewards/Velocity considered same family.',
  },
  CBA: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait between CBA Awards products.',
  },
  Citi: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: 'Citi is now branded NAB — legacy Citi cards fold into NAB family rules.',
  },
  HSBC: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait per HSBC card family.',
  },
  Qantas: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait between Qantas Money products.',
  },
  Virgin: {
    type: 'Time Based',
    scope: 'Card Family',
    waitMonths: 12,
    blurb: '12-month wait between Virgin Money credit-card products.',
  },
};

function issuerRuleType(shortName: string): string {
  return ISSUER_RULES[shortName]?.type ?? 'Time Based';
}
function issuerRuleScope(shortName: string): string {
  return ISSUER_RULES[shortName]?.scope ?? 'Card Family';
}
function issuerRuleWaitMonths(shortName: string): number | null {
  return ISSUER_RULES[shortName]?.waitMonths ?? null;
}
function issuerRuleBlurb(shortName: string): string {
  return ISSUER_RULES[shortName]?.blurb ?? 'Standard issuer waiting rules apply.';
}
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
