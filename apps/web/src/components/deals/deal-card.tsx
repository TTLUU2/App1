'use client';

/**
 * DealCard — single offer tile.
 *
 * Lifted from points-deals/components/deal-card.tsx with these changes:
 *  - MaximisePanel removed (it was a Claude streaming surface tied to the
 *    upstream repo). Replaced with a small "Ask Copilot how to maximise"
 *    inline link that next/links to /ask.
 *  - Imports retargeted to PH Copilot paths (@/data/deals-types,
 *    @/lib/filter-deals).
 *  - cn helper colocated under components/deals/cn (no tailwind-merge dep).
 *  - No emoji glyphs in UI strings (PH Copilot strict rule).
 */

import Link from 'next/link';
import {
  ArrowUpRight,
  Building,
  Check,
  Gift,
  Heart,
  Hotel,
  Link2,
  Plane,
  Target,
  X,
} from 'lucide-react';
import { ProgramLogo } from './program-logo';
import { ProgramBadge } from './program-badge';
import { SweetSpotTag } from './sweet-spot-tag';
import { cn } from './cn';
import {
  dealRetailerLabel,
  estimateValueLabel,
  expiryStatus,
  formatBonus,
  formatDateRange,
} from '@/lib/filter-deals';
import { DEAL_TYPE_LABELS, FLYER_SUBTYPE_LABELS, type Deal } from '@/data/deals-types';

/* ─── Deal-type icon (Lucide) ─────────────────────────────────────────── */

const DEAL_ICON = {
  'gift-card': Gift,
  flyer: Plane,
  hotel: Hotel,
} as const;

function DealTypeIcon({ deal }: { deal: Deal }) {
  const Icon = DEAL_ICON[deal.dealType];
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper-warm ring-1 ring-line">
      <Icon size={15} className="text-ink-soft" strokeWidth={1.75} />
    </span>
  );
}

/* ─── Expiry label ────────────────────────────────────────────────────── */

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

/* ─── Props ───────────────────────────────────────────────────────────── */

interface DealCardProps {
  deal: Deal;
  now?: Date;
  isSaved?: boolean;
  onToggleSave?: () => void;
  /** 0–100: how far this deal closes the gap toward a points goal. */
  goalProgress?: number | null;
  /** Other currently-visible deals that complement this one. */
  stackingWith?: Array<{ id: string; title: string }>;
  isClaimed?: boolean;
  onClaim?: () => void;
  onUnclaim?: () => void;
}

/* ─── Main card ───────────────────────────────────────────────────────── */

export function DealCard({
  deal,
  now,
  isSaved = false,
  onToggleSave,
  goalProgress,
  stackingWith,
  isClaimed = false,
  onClaim,
  onUnclaim,
}: DealCardProps) {
  const subtypeLabel = deal.dealType === 'flyer' ? FLYER_SUBTYPE_LABELS[deal.flyerSubtype] : null;
  const valueLabel = estimateValueLabel(deal.bonus);
  // Primary program gets the logo; secondary programs stay as small badges
  const [primaryProgram, ...extraPrograms] = deal.programs;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-card border border-line bg-paper transition',
        'hover:border-brand/30 hover:shadow-[0_8px_24px_-12px_rgba(168,30,30,0.18)]',
      )}
    >
      {/* ── Body ── */}
      <div className="p-4 sm:p-5">
        {/* Row 1: deal-type icon + meta  |  program logo + heart */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <DealTypeIcon deal={deal} />
            <div className="min-w-0 text-[11px] uppercase tracking-wide text-ink-mute leading-[1.35]">
              <div>
                {DEAL_TYPE_LABELS[deal.dealType]}
                {subtypeLabel && <span className="mx-1 text-ink-mute/40">·</span>}
                {subtypeLabel}
              </div>
              <div className="mt-0.5 font-medium normal-case tracking-normal text-ink-soft truncate">
                {dealRetailerLabel(deal)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {primaryProgram && <ProgramLogo program={primaryProgram} size="md" />}
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave();
                }}
                aria-label={isSaved ? 'Unsave deal' : 'Save deal'}
                className={cn(
                  'grid size-7 place-items-center rounded-full transition',
                  isSaved ? 'text-rose' : 'text-ink-mute/40 hover:text-rose',
                )}
              >
                <Heart size={15} strokeWidth={1.75} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 font-serif text-lg leading-snug text-ink sm:text-xl">{deal.title}</h3>

        {/* Description */}
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft line-clamp-2">
          {deal.description}
        </p>

        {/* Hotel chain wordmark — only when a hotel deal has no program logo */}
        {deal.dealType === 'hotel' && !primaryProgram && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-mute">
            <Building size={11} strokeWidth={1.75} aria-hidden />
            <span>{deal.chain}</span>
          </div>
        )}

        {/* Secondary program badges (when a deal spans multiple programs) */}
        {extraPrograms.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {extraPrograms.map((p) => (
              <ProgramBadge key={p} program={p} />
            ))}
          </div>
        )}

        {/* Ask-Copilot link (replaces the upstream MaximisePanel) */}
        <div className="mt-3">
          <Link href="/ask" className="text-xs font-medium text-brand hover:underline">
            Ask Copilot how to maximise →
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-end justify-between gap-3 border-t border-line bg-paper-warm/40 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          {/* Bonus amount — primary value signal */}
          <div className="font-serif text-lg leading-none text-brand-deep tabular-nums sm:text-xl">
            {formatBonus(deal.bonus)}
          </div>
          {valueLabel && (
            <div className="mt-0.5 text-[11px] italic text-ink-mute">{valueLabel}</div>
          )}
          <SweetSpotTag bonus={deal.bonus} />

          {/* Date range + urgency */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-ink-mute">
            <span>{formatDateRange(deal.startDate, deal.endDate, now)}</span>
            <span aria-hidden>·</span>
            <ExpiryInline endDate={deal.endDate} now={now} />
          </div>

          {/* Goal progress chip */}
          {goalProgress != null && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-deep">
              <Target size={10} strokeWidth={2} />
              {goalProgress}% of your goal
            </div>
          )}

          {/* Stacking indicator */}
          {stackingWith && stackingWith.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1">
              {stackingWith.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700"
                >
                  <Link2 size={10} strokeWidth={2} />
                  Stacks with <span className="font-semibold">{s.title}</span>
                </span>
              ))}
            </div>
          )}

          {/* Claim / unclaim */}
          {onClaim && !isClaimed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClaim();
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <Check size={11} strokeWidth={2.5} />
              Mark as claimed
            </button>
          )}
          {isClaimed && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <Check size={11} strokeWidth={2.5} />
              {deal.bonus.kind === 'bonus-points'
                ? `+${deal.bonus.value.toLocaleString('en-AU')} pts · Claimed`
                : 'Claimed'}
              {onUnclaim && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnclaim();
                  }}
                  aria-label="Undo claim"
                  className="ml-0.5 text-emerald-500 hover:text-emerald-700"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* View source CTA */}
        <a
          href={deal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand px-3.5 py-1.5 text-xs font-medium text-paper transition hover:bg-brand-deep"
        >
          View
          <ArrowUpRight size={13} strokeWidth={2} />
        </a>
      </div>
    </article>
  );
}
