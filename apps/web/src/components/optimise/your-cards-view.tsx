'use client';

// Optimise · Your cards — big Copilot voice CTA at the top, then one
// expandable tile per active card. Multiple cards get multiple full
// tiles, so every card's approval/fee/bonus/benefits are equally
// discoverable — no "primary card + tiny secondary rows" second-class
// treatment.
//
// Data: selectUserCardsWithDetails (same Zustand v5 slice-then-memo
// pattern as NextCardView). Benefits from getBenefitsForCard().

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Hotel,
  Mic,
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
import { useCelebrationsStore } from '@/store/celebrations';
import { useJourneysStore } from '@/store/journeys';
import { CardArtFrame, LacquerChip, PerryMomentOverlay } from '@/components/lacquer';
import { CancelCardConfirm } from '@/components/cancel-card-confirm';
import { CardUpdateCard } from '@/components/tab3/card-update-card';
import { EditCardModal } from '@/components/tab3/edit-card-modal';
import { formatCurrency, formatPoints } from '@/lib/format';

// ── main ─────────────────────────────────────────────────────────────

export function YourCardsView() {
  const userCards = useUserCardsStore((s) => s.userCards);
  const loaded = useUserCardsStore((s) => s.loaded);
  const held = useMemo(() => {
    void userCards;
    void loaded;
    return selectUserCardsWithDetails(useUserCardsStore.getState());
  }, [userCards, loaded]);

  const active = held.filter((h) => !h.cancellationDate);
  const cancelled = held.filter((h) => h.cancellationDate);

  // Celebration surface: fully render-derived so we avoid setState-in
  // -effect. Subscribing to the persisted Set means dismissing (which
  // marks the id) re-renders and the pending overlay becomes null.
  // A held card is celebration-worthy when its bonus has cleared AND
  // the celebrations store hasn't recorded it yet.
  const celebrations = useCelebrationsStore();
  const hydrateCelebrations = celebrations.hydrate;
  useEffect(() => {
    hydrateCelebrations();
  }, [hydrateCelebrations]);
  const tracked = useJourneysStore((s) => s.tracked);
  const pendingBonus = active.find((uc) => {
    const s = computeStatus(uc);
    return s.bonusEarned && !celebrations.bonusCleared.has(uc.id);
  });
  const pendingCity = pendingBonus
    ? // Prefer a tracked-journey city over a generic "Bonus cleared."
      // The user already told us where they're aiming; naming it here
      // lands the moment ("That's Tokyo, booked.") without asking again.
      (tracked[0]?.destinationCity ?? null)
    : null;

  return (
    <section className="mt-4 space-y-3">
      {pendingBonus && (
        <PerryMomentOverlay
          tone="brick"
          headline="Bonus cleared."
          subhead={pendingCity ? `That's ${pendingCity}, booked.` : undefined}
          onDismiss={() => celebrations.markBonusCleared(pendingBonus.id)}
        />
      )}
      {/* Restores the pre-Lacquer intent-routing pipeline (parse
          utterance → spend / benefit / add_card / cancel_card /
          set_nickname / question / unknown, each routing to the right
          action). The old dedicated CopilotVoiceCard just navigated
          to /ask, which discarded that whole flow. */}
      <CardUpdateCard />

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
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const updateCard = useUserCardsStore((s) => s.updateCard);
  const status = computeStatus(uc);

  async function doCancel() {
    const today = new Date().toISOString().slice(0, 10);
    await updateCard(uc.id, { cancellationDate: today });
    setConfirmingCancel(false);
  }
  // Effective sign-up bonus — user's per-card override takes precedence
  // over the catalogue when set (captures historic offers that have
  // since changed in the catalogue).
  const effectiveBonus = uc.bonusPointsOverride ?? uc.card.bonusPoints;
  const summary = status.bonusEarned
    ? 'Bonus earned · nothing to do'
    : status.deadlineIso
      ? `${formatCurrency(status.spendToGo)} to go in ${status.daysRemaining} days`
      : effectiveBonus != null
        ? `${formatPoints(effectiveBonus)} pts sign-up`
        : `${formatCurrency(uc.card.annualFee)} annual fee`;

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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {status.atRisk ? (
              <LacquerChip variant="negative" Icon={AlertTriangle} size="sm">
                At risk
              </LacquerChip>
            ) : status.bonusEarned ? (
              <LacquerChip variant="pine" Icon={Check} size="sm">
                Bonus earned
              </LacquerChip>
            ) : null}
            <span className="text-[12px] text-ph-text-muted">{summary}</span>
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
          <BenefitsSection uc={uc} />
          <ActionRow
            onEdit={() => setEditing(true)}
            onCancelRequest={() => setConfirmingCancel(true)}
          />
          {confirmingCancel && (
            <div className="px-3 pb-3">
              <CancelCardConfirm
                cardName={uc.card.name}
                onConfirm={doCancel}
                onClose={() => setConfirmingCancel(false)}
              />
            </div>
          )}
        </div>
      )}
      {editing && <EditCardModal uc={uc} onClose={() => setEditing(false)} />}
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
    <dl className="space-y-1.5 p-4 pb-3 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="text-ph-text-muted">{k}</dt>
          <dd className="tabular-nums text-ph-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── sign-up bonus panel (single tight block) ────────────────────────

interface CardStatus {
  atRisk: boolean;
  bonusEarned: boolean;
  daysRemaining: number | null;
  spendToGo: number;
  spendTarget: number;
  spentToDate: number;
  deadlineIso: string | null;
  dailyRequired: number;
  dailyActual: number;
}

function SignUpBonusPanel({ uc, status }: { uc: UserCardWithDetails; status: CardStatus }) {
  // Prefer per-user override — the actual offer at time of application
  // is what matters for progress, not the current catalogue value.
  const effectiveBonus = uc.bonusPointsOverride ?? uc.card.bonusPoints;
  if (effectiveBonus == null) return null;
  const clamped =
    status.spendTarget > 0 ? Math.max(0, Math.min(1, status.spentToDate / status.spendTarget)) : 0;

  return (
    <section aria-label="Sign-up bonus" className="border-t border-ph-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Sign-up bonus
        </p>
        <p className="font-serif text-[17px] leading-none text-ph-red tabular-nums">
          {formatPoints(effectiveBonus)} pts
        </p>
      </div>

      {status.bonusEarned ? (
        <p className="mt-2 flex items-center gap-2 rounded-ph-inner bg-ph-pine-chip p-2.5 text-[13px] text-ph-pine-text">
          <Check className="h-4 w-4 flex-none" aria-hidden />
          Bonus already earned — nothing more to spend.
        </p>
      ) : status.deadlineIso ? (
        <div className="mt-2 rounded-ph-inner border border-ph-amber-chip bg-ph-amber-chip p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-serif leading-tight text-ph-amber-text">
              <span className="text-[26px] font-normal tabular-nums">
                {status.daysRemaining ?? '—'}
              </span>{' '}
              <span className="text-[13px]">days left</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-amber-text">
              by {formatDMY(status.deadlineIso)}
            </p>
          </div>
          <p className="mt-1 text-[12px] text-ph-amber-text">
            <strong className="font-semibold tabular-nums">
              {formatCurrency(status.spendToGo)}
            </strong>{' '}
            to spend for bonus
          </p>
          <div
            className="mt-2 h-[7px] w-full overflow-hidden rounded-full bg-white/40"
            role="progressbar"
            aria-valuenow={Math.round(clamped * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Min spend progress"
          >
            {/* HANDOFF § Motion: progress bars animate from 0 to their value
                on mount, 400ms ease-out. CSS keyframe `ph-progress-fill`
                (in globals.css) runs `from { width: 0 }` — the element's
                final width comes from the inline style, so the animation
                lands wherever the data puts it. Pure CSS keeps React out
                of the animation loop and avoids react-hooks/set-state-in
                -effect. Reduced motion skips the animation. */}
            <div
              className="h-full rounded-full bg-ph-amber-figure motion-reduce:animate-none"
              style={{
                width: `${clamped * 100}%`,
                animation: 'ph-progress-fill 400ms ease-out',
              }}
            />
          </div>
          <p className="mt-2 truncate text-[12px] text-ph-amber-text">
            Need{' '}
            <strong className="font-semibold tabular-nums">
              {formatCurrency(status.dailyRequired)}/day
            </strong>{' '}
            · Last 30d avg{' '}
            <span className="font-semibold tabular-nums">{formatCurrency(status.dailyActual)}</span>
          </p>
        </div>
      ) : null}

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[12px]">
        <MetaRow Icon={Receipt} tone="muted">
          <span className="italic">Unrecorded</span>
        </MetaRow>
        <MetaRow Icon={TrendingDown} tone="text">
          <strong className="font-semibold">
            {status.spentToDate > 0 ? formatCurrency(status.spentToDate) : 'No spend'}
          </strong>
        </MetaRow>
        <MetaRow Icon={Sparkles} tone="pine">
          <strong className="font-semibold tabular-nums">
            {formatPoints(Math.round(status.spentToDate * (uc.card.earnRatePer1Aud ?? 0)))} pts
          </strong>
        </MetaRow>
      </div>
    </section>
  );
}

function MetaRow({
  Icon,
  tone,
  children,
}: {
  Icon: typeof Receipt;
  tone: 'muted' | 'text' | 'pine';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'muted' ? 'text-ph-text-muted' : tone === 'pine' ? 'text-ph-pine' : 'text-ph-text';
  return (
    <div className={`flex items-center gap-1.5 ${cls}`}>
      <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="truncate">{children}</span>
    </div>
  );
}

// ── benefits with checkboxes ────────────────────────────────────────

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
    <section aria-label="Benefits" className="border-t border-ph-border px-4 py-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
        Benefits
      </p>
      <ul className="space-y-2">
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
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
                <Icon className="h-3.5 w-3.5" aria-hidden />
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
                  <p className="text-[13px] font-semibold text-ph-ink">{b.name}</p>
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

// ── compact action row — two equal pills. Log-spend is dropped
// intentionally: the Copilot voice hero at the top of Your Cards and
// the centre FAB both open the log-spend surface, so a per-card pill
// duplicated one of two more prominent affordances.

function ActionRow({
  onEdit,
  onCancelRequest,
}: {
  onEdit: () => void;
  onCancelRequest: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-ph-border p-3">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ph-border-strong bg-ph-card px-3 py-2 text-[13px] font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit details
      </button>
      <button
        type="button"
        onClick={onCancelRequest}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ph-red bg-ph-card px-3 py-2 text-[13px] font-medium text-ph-red transition-colors hover:bg-ph-red/5"
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
        Add a card you already hold and I&apos;ll tell you what you&apos;re leaving on the table.
      </p>
    </div>
  );
}

// ── derivations + formatters ────────────────────────────────────────

function computeStatus(uc: UserCardWithDetails): CardStatus {
  // Use the user's historic offer (bonusPointsOverride) when set for
  // the 5% min-spend fallback estimate — otherwise fall back to the
  // catalogue value. Same precedence as SignUpBonusPanel/CardTile.
  const effectiveBonus = uc.bonusPointsOverride ?? uc.card.bonusPoints ?? 0;
  const target = uc.bonusTarget ?? Math.round(effectiveBonus * 0.05);
  const spent = uc.bonusSpentToDate ?? 0;
  const toGo = Math.max(0, target - spent);
  const bonusEarned = uc.bonusReceived === true || (target > 0 && spent >= target);
  const deadlineIso = uc.bonusSpendWindowEndDate ?? null;
  const daysRemaining = deadlineIso
    ? Math.max(0, Math.round((new Date(deadlineIso).getTime() - Date.now()) / 86_400_000))
    : null;

  const atRisk = !bonusEarned && (daysRemaining ?? Infinity) <= 30 && toGo > target * 0.1;

  const dailyRequired = daysRemaining && daysRemaining > 0 ? Math.round(toGo / daysRemaining) : 0;
  // v1 mock — real "last 30 days" pace lands with Log-a-spend in Phase 5.
  const dailyActual = 180;

  return {
    atRisk,
    bonusEarned,
    daysRemaining,
    spendToGo: toGo,
    spendTarget: target,
    spentToDate: spent,
    deadlineIso,
    dailyRequired,
    dailyActual,
  };
}

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
  return `${now.getFullYear()}-12-31`;
}

function shortEnd(period: string): string {
  const iso = currentPeriodEnd(period);
  return formatDMY(iso);
}
