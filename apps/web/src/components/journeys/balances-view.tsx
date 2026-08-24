'use client';

// Journeys · Balances (HANDOFF § 5) — Phase 4e.
//
// Screen purpose: where the points sit and whether the numbers are
// trustworthy. Brick hero (total), per-program rows with sync
// status, plus one collapsed row for the auto-sync forwarding
// address. Manual + zero balance rows offer an inline `Add` pill.
//
// v1 pulls balances from useBalancesStore and mocks the sync-status
// pill: two of the seed programs pretend to be on auto-sync (last
// seen 2 months ago) and the others read as MANUAL. Real sync
// telemetry lands with the email-sync backend v1 currently parked at
// commit 69a9985.

import { useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import { HeroCard } from '@/components/lacquer';

const FORWARD_DOMAIN = 'pointhacks.app';
const FORWARD_SLUG = 'aurora-fox-7301';
const FORWARD_ADDRESS = `${FORWARD_SLUG}@${FORWARD_DOMAIN}`;

// Programs currently on auto-sync (mocked until the backend at
// commit 69a9985 goes live). Everything else reads as MANUAL.
const AUTO_SYNCED = new Set(['qantas-ff', 'velocity']);

export function BalancesView() {
  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const fundedCount = programs.filter((p) => p.balance > 0).length;

  return (
    <section className="mt-4 space-y-5">
      <HeroCard aria-labelledby="balances-heading" style={{ padding: 20, gap: 18 }}>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-on-brick-meta">
            Total points
          </p>
          <p
            id="balances-heading"
            className="mt-1 font-serif text-[48px] leading-none tracking-[-0.02em] text-ph-on-brick tabular-nums"
          >
            {formatPoints(total)}
          </p>
          <p className="mt-1 text-[13px] text-ph-on-brick-secondary">
            {fundedCount} program{fundedCount === 1 ? '' : 's'} · ≈{' '}
            {new Intl.NumberFormat('en-AU', {
              style: 'currency',
              currency: 'AUD',
              maximumFractionDigits: 0,
            }).format(Math.round(valueAud))}{' '}
            of value
          </p>
        </div>
      </HeroCard>

      <ul className="space-y-2">
        {programs.map((p) => (
          <li key={p.id}>
            <ProgramRow program={p} autoSync={AUTO_SYNCED.has(p.id)} />
          </li>
        ))}
      </ul>

      <AutoSyncCollapsedRow />
    </section>
  );
}

function ProgramRow({ program, autoSync }: { program: ProgramBalance; autoSync: boolean }) {
  const isZero = program.balance === 0;
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <ProgramLogo program={program} />
      <div className="min-w-0 flex-1">
        <p
          className={
            isZero
              ? 'truncate font-serif text-[17px] leading-tight text-ph-text-disabled'
              : 'truncate font-serif text-[17px] leading-tight text-ph-ink'
          }
        >
          {program.name}
        </p>
        <p
          className={
            autoSync
              ? 'mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-pine'
              : 'mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta'
          }
        >
          {autoSync ? '⚡ Auto-sync · 2mo ago' : 'Manual'}
        </p>
      </div>
      {isZero ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-ph-red px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </button>
      ) : (
        <p className="flex-none font-serif text-[19px] leading-none text-ph-ink tabular-nums">
          {formatPoints(program.balance)}
        </p>
      )}
    </div>
  );
}

/** 34px program logo tile. Loads the CDN image when available,
 *  otherwise falls back to a two-letter monogram in ph-fill. */
function ProgramLogo({ program }: { program: ProgramBalance }) {
  if (program.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external CDN images, not next/image-optimised
      <img
        src={program.logoUrl}
        alt=""
        aria-hidden
        className="h-[34px] w-[34px] flex-none rounded-[9px] object-contain ring-1 ring-ph-border"
      />
    );
  }
  return (
    <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] bg-ph-fill font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ph-text-meta ring-1 ring-ph-border">
      {program.shortName.slice(0, 2)}
    </span>
  );
}

function AutoSyncCollapsedRow() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(FORWARD_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-tint-border bg-ph-tint p-[13px]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ph-ink">Auto-sync is on</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-ph-text-muted">
          {FORWARD_ADDRESS}
        </p>
      </div>
      <button
        type="button"
        onClick={copyAddress}
        aria-label="Copy forwarding address"
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ph-brick ring-1 ring-ph-tint-border transition-colors hover:bg-ph-fill-warm"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copy
          </>
        )}
      </button>
    </div>
  );
}
