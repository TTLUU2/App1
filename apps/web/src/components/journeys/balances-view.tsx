'use client';

// Journeys · Balances (HANDOFF § 5) — Phase 4e.
//
// Screen purpose: where the points sit and whether the numbers are
// trustworthy. Brick hero (total), per-program rows with sync
// status, plus one collapsed row for the auto-sync forwarding
// address. Manual + zero balance rows offer an inline `Add` pill.
//
// The auto-sync row calls /api/link-email on mount to mint (or
// return) the device's persistent forwarding slug — same slug across
// reloads, one per device. Three visible states so the row still
// renders sensibly if the backend blips: loading → ready (real slug
// with Copy button) → unavailable ("coming soon" pill).
//
// Per-program auto-sync telemetry (last-seen dates, which programs
// are actively sync'd) still mocks — that's a follow-up wiring to
// read from the balance_updates table.

import { useEffect, useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { HeroCard } from '@/components/lacquer';

const FORWARD_DOMAIN = 'pointhacks.app';

/** Relative-date helper — "just now", "2d ago", "3mo ago", "1y ago".
 *  Used on program rows to render `updatedAt` without importing a
 *  full formatting lib. En-AU friendly (no "an hour" oddities). */
function formatRelative(dateIso: string | null): string {
  if (!dateIso) return 'never';
  const then = new Date(dateIso + 'T00:00:00');
  if (Number.isNaN(then.getTime())) return dateIso;
  const now = new Date();
  const ms = now.getTime() - then.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export function BalancesView() {
  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const fundedCount = programs.filter((p) => p.balance > 0).length;

  // On mount, ask the server for the newest balances the email-sync
  // backend has captured and merge them into the local store. Silent
  // no-op when the endpoint returns 0 rows (fresh device) or when the
  // network is down. Runs once per mount — no interval polling.
  const syncFromServer = useBalancesStore((s) => s.syncFromServer);
  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;
    void syncFromServer(deviceId);
  }, [syncFromServer]);

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
            <ProgramRow program={p} />
          </li>
        ))}
      </ul>

      <AutoSyncCollapsedRow />
    </section>
  );
}

function ProgramRow({ program }: { program: ProgramBalance }) {
  const isNever = program.balance === 0 && program.updatedAt === null;
  const isSynced = program.source === 'sync';
  const relative = formatRelative(program.updatedAt);
  // Sub-line copy varies with state:
  //   never-touched → "No balance yet — input or sync"
  //   auto-synced   → "⚡ Auto-sync · 2w ago"
  //   manual entry  → "Manual · Updated 2w ago"
  const subline = isNever
    ? 'No balance yet · input or sync'
    : isSynced
      ? `⚡ Auto-sync · ${relative}`
      : `Manual · Updated ${relative}`;
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <ProgramLogo program={program} />
      <div className="min-w-0 flex-1">
        <p
          className={
            isNever
              ? 'truncate font-serif text-[17px] leading-tight text-ph-text-disabled'
              : 'truncate font-serif text-[17px] leading-tight text-ph-ink'
          }
        >
          {program.name}
        </p>
        <p
          className={
            isSynced
              ? 'mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ph-pine'
              : 'mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta'
          }
        >
          {subline}
        </p>
        {/* Tier + Status Credits sub-sub-line — only when the sync
            payload carried them. Keeps user-entered / empty rows
            visually simple. */}
        {(program.tier || typeof program.statusCredits === 'number') && (
          <p className="mt-0.5 truncate text-[11px] text-ph-text-muted">
            {program.tier ? program.tier.replace(/_/g, ' ') : null}
            {program.tier && typeof program.statusCredits === 'number' ? ' · ' : null}
            {typeof program.statusCredits === 'number'
              ? `${program.statusCredits} status credits`
              : null}
          </p>
        )}
      </div>
      {isNever ? (
        // Two-affordance stack — manual Input OR Sync. Both open the same
        // future onboarding wizard for now (Sync scrolls to the auto-sync
        // card, Input opens an inline number editor). Keeps the row's
        // right column visually balanced at two chips.
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-full bg-ph-red px-3 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-3 w-3" aria-hidden />
            Input
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-ph-border-strong bg-ph-card px-3 py-1 text-[11px] font-medium text-ph-text-muted transition-colors hover:bg-ph-fill-warm"
          >
            <span aria-hidden>⚡</span>
            Sync
          </button>
        </div>
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

// Three-state row keyed off the /api/link-email fetch:
//   loading    — waiting for the slug to come back
//   ready      — slug in hand, show + Copy button
//   unavailable — endpoint/network refused, show a graceful pill
type SlugState = { kind: 'loading' } | { kind: 'ready'; slug: string } | { kind: 'unavailable' };

function AutoSyncCollapsedRow() {
  const [state, setState] = useState<SlugState>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const deviceId = getOrCreateDeviceId();
        if (!deviceId) {
          if (!cancelled) setState({ kind: 'unavailable' });
          return;
        }
        const res = await fetch('/api/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
        if (!res.ok) {
          if (!cancelled) setState({ kind: 'unavailable' });
          return;
        }
        const json = (await res.json()) as { slug?: string };
        if (!json.slug) {
          if (!cancelled) setState({ kind: 'unavailable' });
          return;
        }
        if (!cancelled) setState({ kind: 'ready', slug: json.slug });
      } catch {
        if (!cancelled) setState({ kind: 'unavailable' });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-3 rounded-ph-card border border-ph-tint-border bg-ph-tint p-[13px]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ph-ink">Auto-sync</p>
          <p className="mt-0.5 font-mono text-[10px] text-ph-text-muted">Loading address…</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <div className="flex items-center gap-3 rounded-ph-card border border-ph-tint-border bg-ph-tint p-[13px]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ph-ink">Auto-sync coming soon</p>
          <p className="mt-0.5 text-[11px] leading-snug text-ph-text-muted">
            Forwarding will let Qantas &amp; Velocity emails top up your balances automatically.
          </p>
        </div>
      </div>
    );
  }

  const address = `${state.slug}@${FORWARD_DOMAIN}`;
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-tint-border bg-ph-tint p-[13px]">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ph-ink">Auto-sync is on</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-ph-text-muted">{address}</p>
      </div>
      <button
        type="button"
        onClick={() => void copyAddress(address)}
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
