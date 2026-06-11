'use client';

// One-card-at-a-time view of the eligible recommendations. Counters the
// decision-fatigue of long lists by giving each card its full attention.
// Horizontal scroll-snap with native momentum on mobile; dots below give
// position context and let users jump to any card.
//
// Renders only eligible cards — Upcoming / Grey / Not-eligible aren't
// relevant when the user is in "focus mode" choosing what to apply for.

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Recommendation } from '@ph/shared';
import { CardArt } from '@/components/card-art';
import { StatusChip } from '@/components/status-chip';
import { formatCurrency, formatPoints } from '@/lib/format';

const PROGRAM_LABEL: Record<string, string> = {
  qantas: 'Qantas',
  velocity: 'Velocity',
  flexible: 'Amex',
  bank: 'bank points',
};

interface Props {
  items: Recommendation[];
}

export function SwiperView({ items }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which card is currently snapped in the viewport via scroll
  // position rather than IntersectionObserver — simpler and the snap
  // behaviour means we always have a clear "active" slide.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const slideWidth = el.clientWidth;
      const idx = Math.round(el.scrollLeft / slideWidth);
      setActiveIndex(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function jumpTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No bonus-eligible cards under your current preferences.
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Scroller — relative to give arrows absolute positioning context */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((rec, i) => (
            <SwiperCard key={rec.card.id} rec={rec} rank={i + 1} />
          ))}
        </div>

        {/* Prev / Next — visible on hover/focus + always tappable on
            mobile (small overlay buttons). Disable at ends. */}
        <button
          type="button"
          onClick={() => jumpTo(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          aria-label="Previous card"
          className="absolute left-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-zinc-700 shadow-md backdrop-blur transition-opacity hover:bg-white disabled:opacity-30 disabled:pointer-events-none dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => jumpTo(Math.min(items.length - 1, activeIndex + 1))}
          disabled={activeIndex >= items.length - 1}
          aria-label="Next card"
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-zinc-700 shadow-md backdrop-blur transition-opacity hover:bg-white disabled:opacity-30 disabled:pointer-events-none dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Position + dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-[11px] tabular-nums text-zinc-500">
          {activeIndex + 1} of {items.length}
        </span>
        <div className="flex items-center gap-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Go to card ${i + 1}`}
              className={
                i === activeIndex
                  ? 'h-1.5 w-4 rounded-full bg-[var(--color-ph-red)]'
                  : 'h-1.5 w-1.5 rounded-full bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700'
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SwiperCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const { card } = rec;
  const whyTags = buildWhyTags(rec, rank);
  return (
    <article className="w-full flex-none snap-center px-1">
      <div className="flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-start gap-3">
          <CardArt card={card} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight">{card.name}</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">{card.issuer.name}</p>
            <div className="mt-1.5">
              <StatusChip status={rec.eligibility.status} size="sm" />
            </div>
          </div>
        </header>

        {/* Headline stats — bonus pts is hero, fee + earn rate are
            supporting context. */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 text-center dark:bg-zinc-950/40">
          <Stat
            label="Bonus"
            value={card.bonusPoints != null ? formatPoints(card.bonusPoints) : '—'}
            suffix={card.bonusPoints != null ? 'pts' : ''}
            tone="emerald"
          />
          <Stat label="Annual fee" value={formatCurrency(card.annualFee)} tone="neutral" />
          <Stat
            label="Earn rate"
            value={card.earnRatePer1Aud != null ? String(card.earnRatePer1Aud) : '—'}
            suffix={card.earnRatePer1Aud != null ? 'pt/$1' : ''}
            tone="neutral"
          />
        </div>

        {whyTags.length > 0 && (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 flex-none" aria-hidden />
            <span>{whyTags.join(' · ')}</span>
          </p>
        )}

        {/* Actions — primary CTA opens the detail screen; secondary opens
            the Point Hacks guide in a new tab. */}
        <div className="mt-auto flex gap-2">
          <Link
            href={`/cards/${card.id}`}
            className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-center text-xs font-medium text-white"
          >
            See details
          </Link>
          {card.pointHacksUrl && (
            <a
              href={card.pointHacksUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Guide
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: 'emerald' | 'neutral';
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          tone === 'emerald'
            ? 'mt-0.5 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300'
            : 'mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100'
        }
      >
        {value}
        {suffix && <span className="text-[10px] font-normal text-zinc-500"> {suffix}</span>}
      </p>
    </div>
  );
}

function buildWhyTags(rec: Recommendation, rank: number): string[] {
  const tags: string[] = [];
  if (rank === 1 && rec.eligibility.status === 'eligible') {
    tags.push('Top pick this month');
  } else if (rank <= 3 && rec.eligibility.status === 'eligible') {
    tags.push(`Top ${rank} pick`);
  }
  if (rec.preferenceMatch?.programMatched) {
    const label = PROGRAM_LABEL[rec.card.rewardsProgram] ?? rec.card.rewardsProgram;
    tags.push(`matches your ${label} preference`);
  }
  return tags;
}
