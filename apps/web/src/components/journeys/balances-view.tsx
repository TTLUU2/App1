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

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, Check, Plus } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  SYNC_ELIGIBLE_PROGRAMS,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { BottomSheet, HeroCard, PerryAvatar } from '@/components/lacquer';

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
  const updateBalance = useBalancesStore((s) => s.updateBalance);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const fundedCount = programs.filter((p) => p.balance > 0).length;
  // Wizard placeholder — replaced by the proper 4-step onboarding
  // wizard component (see docs/TODO.md "Onboarding wizard for email-
  // sync setup"). For now, tapping Sync surfaces a Perry-narrated
  // instructions sheet inline; the real wizard subsumes this later.
  const [syncSheetProgramId, setSyncSheetProgramId] = useState<string | null>(null);
  // Manual input sheet — window.prompt() is silently blocked on iOS
  // WKWebView (Capacitor doesn't wire the UIDelegate for it), which
  // meant the Input button was a no-op on device. This BottomSheet-
  // based editor works everywhere.
  const [inputSheet, setInputSheet] = useState<{ id: string; currentBalance: number } | null>(null);

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

  function handleInput(id: string, currentBalance: number) {
    setInputSheet({ id, currentBalance });
  }
  const inputSheetProgram = inputSheet
    ? (programs.find((p) => p.id === inputSheet.id) ?? null)
    : null;

  function handleSync(id: string) {
    setSyncSheetProgramId(id);
  }
  const syncSheetProgram = syncSheetProgramId
    ? programs.find((p) => p.id === syncSheetProgramId)
    : null;

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
            <ProgramRow program={p} onInput={handleInput} onSync={handleSync} />
          </li>
        ))}
      </ul>
      {syncSheetProgram && (
        <SyncSetupSheet program={syncSheetProgram} onClose={() => setSyncSheetProgramId(null)} />
      )}
      {inputSheetProgram && inputSheet && (
        <InputBalanceSheet
          program={inputSheetProgram}
          currentBalance={inputSheet.currentBalance}
          onSave={(v) => {
            updateBalance(inputSheet.id, v);
            setInputSheet(null);
          }}
          onClose={() => setInputSheet(null)}
        />
      )}

      <AutoSyncCollapsedRow />
    </section>
  );
}

function ProgramRow({
  program,
  onInput,
  onSync,
}: {
  program: ProgramBalance;
  onInput: (id: string, currentBalance: number) => void;
  onSync: (id: string) => void;
}) {
  const isNever = program.balance === 0 && program.updatedAt === null;
  const isSynced = program.source === 'sync';
  const canSync = SYNC_ELIGIBLE_PROGRAMS.has(program.id);
  const relative = formatRelative(program.updatedAt);
  const subline = isNever
    ? canSync
      ? 'No balance yet · input or sync'
      : 'No balance yet · tap to input'
    : isSynced
      ? `⚡ Auto-sync · ${relative}`
      : `Manual · Updated ${relative}`;

  // Accordion: rows collapse by default. Only rows with more data than
  // the single-line summary can carry (tier / status credits / member
  // id / real snapshot date) are expandable — never-touched rows and
  // plain manual-entry rows without extras stay a static line.
  const hasExtras =
    !!program.tier || typeof program.statusCredits === 'number' || !!program.memberId || isSynced;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-ph-card border border-ph-border bg-ph-card">
      {/* Header row — same visual layout as before. The row body is a
          button when the accordion has extras to show, so the whole
          left side is the tap target. Chevron flips on open. */}
      <div className="flex items-center gap-3 p-[15px]">
        <ProgramLogo program={program} />
        <button
          type="button"
          disabled={!hasExtras}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={hasExtras ? open : undefined}
          className="min-w-0 flex-1 text-left"
        >
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
        </button>
        {isNever ? (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onInput(program.id, 0)}
              className="inline-flex items-center justify-center gap-1 rounded-full bg-ph-red px-3 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Input
            </button>
            {canSync && (
              <button
                type="button"
                onClick={() => onSync(program.id)}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-ph-border-strong bg-ph-card px-3 py-1 text-[11px] font-medium text-ph-text-muted transition-colors hover:bg-ph-fill-warm"
              >
                <span aria-hidden>⚡</span>
                Sync
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => onInput(program.id, program.balance)}
              disabled={isSynced}
              className={
                isSynced
                  ? 'cursor-default font-serif text-[19px] leading-none text-ph-ink tabular-nums'
                  : 'font-serif text-[19px] leading-none text-ph-ink tabular-nums hover:text-ph-brick'
              }
              aria-label={isSynced ? undefined : `Edit ${program.name} balance`}
            >
              {formatPoints(program.balance)}
            </button>
            {hasExtras && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Collapse details' : 'Expand details'}
                aria-expanded={open}
                className="grid h-6 w-6 place-items-center rounded-full text-ph-text-meta hover:bg-ph-fill-warm hover:text-ph-text"
              >
                <ChevronDown
                  className={
                    open
                      ? 'h-3.5 w-3.5 rotate-180 transition-transform'
                      : 'h-3.5 w-3.5 transition-transform'
                  }
                  aria-hidden
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accordion body — closed by default. Only fields the parser
          extracted (or the store carries) appear; missing fields are
          skipped so a manual-entry row doesn't show empty slots. */}
      {open && hasExtras && (
        <div className="border-t border-ph-border px-[15px] py-2.5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            {program.tier && (
              <>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                  Tier
                </dt>
                <dd className="text-right text-ph-text">{program.tier.replace(/_/g, ' ')}</dd>
              </>
            )}
            {typeof program.statusCredits === 'number' && (
              <>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                  Status credits
                </dt>
                <dd className="text-right text-ph-text tabular-nums">{program.statusCredits}</dd>
              </>
            )}
            {program.memberId && (
              <>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                  Member no.
                </dt>
                <dd className="text-right font-mono text-[11px] text-ph-text tabular-nums">
                  {program.memberId}
                </dd>
              </>
            )}
            {program.updatedAt && (
              <>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
                  {isSynced ? 'Snapshot' : 'Entered'}
                </dt>
                <dd className="text-right text-ph-text">{program.updatedAt}</dd>
              </>
            )}
          </dl>
        </div>
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

// Placeholder wizard — three-step instructions inside a bottom sheet.
// Replaced by the proper 4-step onboarding wizard (see docs/TODO.md
// "Onboarding wizard for email-sync setup"). Kept intentionally
// simple so the Sync button on Qantas/Velocity rows lands somewhere
// real even before the full wizard ships.
function SyncSetupSheet({ program, onClose }: { program: ProgramBalance; onClose: () => void }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const deviceId = getOrCreateDeviceId();
        if (!deviceId) return;
        const res = await fetch('/api/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { slug?: string };
        if (!cancelled && json.slug) setSlug(json.slug);
      } catch {
        /* silent — sheet still renders instructions with a note */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const address = slug ? `${slug}@${FORWARD_DOMAIN}` : null;
  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      /* clipboard blocked */
    }
  }

  const senderHint =
    program.id === 'qantas-ff'
      ? 'qantas.com OR qantasfrequentflyer.com'
      : 'velocityfrequentflyer.com OR virginaustralia.com';

  return (
    <BottomSheet
      open={true}
      onOpenChange={(v) => !v && onClose()}
      title={`Set up ${program.shortName} auto-sync`}
    >
      <div className="flex items-center gap-2.5">
        <PerryAvatar size={26} />
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Perry&apos;s 90-second guide
        </p>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-ph-text-muted">
        Forward {program.name} emails to your unique address — I&apos;ll parse them and keep your
        balance fresh.
      </p>

      <ol className="mt-4 space-y-3 text-[13px] leading-snug text-ph-text">
        <li>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Step 1
          </p>
          <p className="mt-1">Copy your unique address:</p>
          <div className="mt-2 flex items-center gap-2 rounded-ph-inner border border-ph-border bg-ph-fill-warm p-2.5">
            <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-ph-ink">
              {address ?? 'Loading…'}
            </p>
            <button
              type="button"
              onClick={() => void copyAddress()}
              disabled={!address}
              className="inline-flex items-center gap-1 rounded-full bg-ph-brick px-3 py-1 text-[11px] font-medium text-ph-on-brick transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {copied ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <Copy className="h-3 w-3" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </li>
        <li>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Step 2
          </p>
          <p className="mt-1">
            In Gmail: <strong>Settings → Filters and Blocked Addresses → Create new filter</strong>.
          </p>
          <p className="mt-1 text-ph-text-muted">
            <strong>From:</strong> <span className="font-mono text-[11px]">{senderHint}</span>
            <br />
            Leave the To / Subject fields blank. Click <strong>Create filter</strong>.
          </p>
        </li>
        <li>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Step 3
          </p>
          <p className="mt-1">
            Tick <strong>Forward it to</strong> and select the address you copied. Click{' '}
            <strong>Create filter</strong>.
          </p>
          <p className="mt-1 text-ph-text-muted">
            Next time {program.shortName} emails you a balance, it&apos;ll flow through
            automatically.
          </p>
        </li>
      </ol>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Got it
      </button>
    </BottomSheet>
  );
}

// Inline balance editor — replaces the iOS-broken window.prompt() with
// a proper BottomSheet + inputMode=numeric text field. Formats the
// input as the user types (thousands separators) so a big balance
// stays legible; strips commas before saving.
function InputBalanceSheet({
  program,
  currentBalance,
  onSave,
  onClose,
}: {
  program: ProgramBalance;
  currentBalance: number;
  onSave: (value: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState<string>(currentBalance > 0 ? String(currentBalance) : '');
  const displayValue = useMemo(() => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    // Reformat with en-AU thousands separators as the user types.
    return Number(cleaned).toLocaleString('en-AU');
  }, [raw]);
  const parsed = Number(raw.replace(/[^0-9]/g, ''));
  const canSave = Number.isFinite(parsed) && parsed >= 0;

  function submit() {
    if (!canSave) return;
    onSave(Math.round(parsed));
  }

  return (
    <BottomSheet
      open={true}
      onOpenChange={(v) => !v && onClose()}
      title={`Update ${program.shortName}`}
    >
      <p className="mt-1 text-[13px] leading-snug text-ph-text-muted">
        Enter the current points balance for {program.name}. Comma formatting is added
        automatically.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-3"
      >
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Balance (points)
          </span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            pattern="[0-9,\s]*"
            value={displayValue}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="e.g. 145,230"
            className="mt-1 w-full rounded-ph-inner border border-ph-border-strong bg-ph-card px-3 py-3 text-[18px] font-serif tabular-nums text-ph-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-ph-border-strong bg-ph-card px-4 py-3 text-sm font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
