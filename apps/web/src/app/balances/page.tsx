'use client';

/**
 * /balances — Point balances editor. Reached from the top-right menu.
 * The same data feeds the Home stat-strip ("Pts pending") and the
 * Journeys landing ("Total points"), so any edit here propagates
 * immediately across the app via the shared zustand store.
 *
 * Two ways in:
 *   1. Manual edit — tap a balance row, type a number, save
 *   2. Auto-sync via email forwarding — each user gets a unique
 *      address (mocked slug for now); they create a Gmail filter
 *      forwarding Qantas/Velocity/Amex MR balance emails to it, the
 *      backend parses and writes back. The "Auto-sync" section
 *      shows the setup steps + per-program status.
 *
 * For v1 the email address is a deterministic placeholder; the real
 * backend (Postmark inbound + Claude parser + Neon-backed balances)
 * is staged separately. The UI is real now so the onboarding story
 * is preview-ready before the pipeline lights up.
 */

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Coins, Copy, Mail, Plus, X, Zap } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';

const CDN = 'https://pointhacks-spa-tools.fly.dev/images/programs-small';

const ADDABLE: ProgramBalance[] = [
  {
    id: 'altitude',
    name: 'Westpac Altitude Rewards',
    shortName: 'Altitude',
    logoUrl: `${CDN}/altitude.png`,
    cpp: 0.5,
    balance: 0,
    updatedAt: null,
  },
  {
    id: 'anz-rewards',
    name: 'ANZ Rewards',
    shortName: 'ANZ Rewards',
    logoUrl: `${CDN}/anz-rewards.png`,
    cpp: 0.6,
    balance: 0,
    updatedAt: null,
  },
  {
    id: 'amplify',
    name: 'Amplify Rewards',
    shortName: 'Amplify',
    logoUrl: `${CDN}/amplify.png`,
    cpp: 0.5,
    balance: 0,
    updatedAt: null,
  },
  {
    id: 'nab-rewards',
    name: 'NAB Rewards',
    shortName: 'NAB Rewards',
    logoUrl: `${CDN}/nab-rewards.png`,
    cpp: 0.55,
    balance: 0,
    updatedAt: null,
  },
];

/** Placeholder slug — real backend will generate one per user on sign-up. */
const FORWARD_DOMAIN = 'phcopilot.app';
const FORWARD_SLUG = 'aurora-fox-7301';
const FORWARD_ADDRESS = `${FORWARD_SLUG}@${FORWARD_DOMAIN}`;

/** Sender domains we know how to parse. UI uses this to show
 *  per-program filter instructions. */
const PROGRAM_SENDERS: Record<string, { from: string; subjectHint: string }> = {
  'qantas-ff': {
    from: 'noreply@email.qantas.com',
    subjectHint: 'Your Qantas Points balance',
  },
  velocity: {
    from: 'memberservices@velocityfrequentflyer.com',
    subjectHint: 'Your Velocity Points balance',
  },
  'amex-mr': {
    from: 'AmericanExpress@member.americanexpress.com',
    subjectHint: 'Your Membership Rewards statement',
  },
};

export default function BalancesPage() {
  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addable = ADDABLE.filter((a) => !programs.some((p) => p.id === a.id));

  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Coins className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Point balances
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Auto-sync from your frequent-flyer emails, or edit any balance by hand.
        </p>
      </header>

      <AutoSyncCard />

      <section
        aria-label="Total points"
        className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Total points</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatPoints(total)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Across {programs.length} program{programs.length === 1 ? '' : 's'} · ≈ $
          {Math.round(valueAud).toLocaleString('en-AU')} value
        </p>
      </section>

      <ul className="mt-2 space-y-2">
        {programs.map((p) => (
          <li key={p.id}>
            <ProgramRow program={p} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setPickerOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-200"
        aria-expanded={pickerOpen}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add a program
      </button>

      {pickerOpen && <ProgramPicker addable={addable} onClose={() => setPickerOpen(false)} />}
    </main>
  );
}

function AutoSyncCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(FORWARD_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <section
      aria-labelledby="auto-sync-heading"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-white ring-1 ring-[var(--color-ph-red)]/20 dark:from-red-500/10 dark:to-zinc-900 dark:ring-red-500/20"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-white">
            <Zap className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="auto-sync-heading" className="text-sm font-semibold">
              Auto-sync your balances
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Forward your monthly balance emails to your unique address — Qantas, Velocity and Amex
              MR update automatically.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
          <Mail className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
          <code className="flex-1 truncate font-mono text-xs">{FORWARD_ADDRESS}</code>
          <button
            type="button"
            onClick={copyAddress}
            aria-label="Copy forwarding address"
            className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1 text-[11px] font-semibold text-[var(--color-ph-red)] hover:text-red-700"
        >
          <span>{open ? 'Hide setup steps' : 'Show setup steps'}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200/70 bg-white/60 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/40">
          <ol className="space-y-3 text-xs">
            <SetupStep n={1} title="Open Gmail filters">
              In Gmail desktop, go to{' '}
              <span className="rounded bg-zinc-100 px-1 font-mono text-[10px] dark:bg-zinc-800">
                Settings → Filters and Blocked Addresses → Create a new filter
              </span>
              .
            </SetupStep>
            <SetupStep n={2} title="Match each program's sender">
              Create one filter per program using its From: address. For each filter, choose{' '}
              <strong>Forward it to</strong> and pick the address above (you'll need to add it as a
              verified forwarding address once — Gmail will email a code; the system intercepts and
              confirms automatically).
            </SetupStep>
            <SetupStep n={3} title="Done">
              Whenever Qantas / Velocity / Amex MR emails your balance, your wallet updates in
              minutes. You can keep editing manually too — manual entries always win over auto.
            </SetupStep>
          </ol>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Senders to filter on
          </p>
          <ul className="mt-2 space-y-1.5">
            {Object.entries(PROGRAM_SENDERS).map(([id, meta]) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md bg-white p-2 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-700"
              >
                <ProgramLogoById programId={id} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] tabular-nums">{meta.from}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    Subject contains: {meta.subjectHint}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[10px] text-zinc-400">
            Outlook + iCloud Mail use the same idea — Rules / Mail Rules. Pipeline goes live once we
            wire the inbound endpoint; UI is preview-ready now.
          </p>
        </div>
      )}
    </section>
  );
}

function SetupStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-[10px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          {children}
        </p>
      </div>
    </li>
  );
}

function ProgramRow({ program }: { program: ProgramBalance }) {
  const updateBalance = useBalancesStore((s) => s.updateBalance);
  const removeProgram = useBalancesStore((s) => s.removeProgram);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(program.balance));

  const autoSyncEligible = PROGRAM_SENDERS[program.id] !== undefined;

  function startEdit() {
    setDraft(String(program.balance));
    setEditing(true);
  }
  function commit() {
    const next = Math.max(0, Math.round(Number(draft.replace(/[,\s]/g, '')) || 0));
    updateBalance(program.id, next);
    setEditing(false);
  }
  function cancel() {
    setDraft(String(program.balance));
    setEditing(false);
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-center gap-3">
        <ProgramLogo program={program} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{program.name}</p>
          {!editing && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
              {autoSyncEligible ? (
                <>
                  <Zap className="h-3 w-3 text-[var(--color-ph-red)]" aria-hidden />
                  <span>Auto-sync ready</span>
                </>
              ) : (
                <span>Manual only</span>
              )}
              {program.updatedAt && <span aria-hidden> · </span>}
              {program.updatedAt && <span>Updated {program.updatedAt}</span>}
            </div>
          )}
        </div>
        {editing ? null : program.balance > 0 ? (
          <button
            type="button"
            onClick={startEdit}
            className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
            aria-label={`Edit ${program.name} balance`}
          >
            {formatPoints(program.balance)}
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-full bg-[var(--color-ph-red)] px-3 py-1 text-[11px] font-bold text-white"
          >
            Add
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="0"
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            autoFocus
          />
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="flex items-center gap-1 rounded-lg bg-[var(--color-ph-red)] px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Save
          </button>
        </div>
      )}

      {editing && program.balance > 0 && (
        <button
          type="button"
          onClick={() => removeProgram(program.id)}
          className="mt-2 text-[11px] text-zinc-400 underline-offset-2 hover:text-[var(--color-ph-red)] hover:underline"
        >
          Remove this program
        </button>
      )}
    </div>
  );
}

function ProgramLogo({ program }: { program: ProgramBalance }) {
  if (program.logoUrl) {
    return (
      <img
        src={program.logoUrl}
        alt=""
        aria-hidden
        className="h-8 w-8 flex-none rounded-md object-contain ring-1 ring-zinc-100 dark:ring-zinc-800"
      />
    );
  }
  const initials = program.shortName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
      {initials}
    </span>
  );
}

function ProgramLogoById({ programId }: { programId: string }) {
  const programs = useBalancesStore((s) => s.programs);
  const program = useMemo(
    () => programs.find((p) => p.id === programId) ?? null,
    [programs, programId],
  );
  if (!program) return null;
  return <ProgramLogo program={program} />;
}

function ProgramPicker({ addable, onClose }: { addable: ProgramBalance[]; onClose: () => void }) {
  const addProgram = useBalancesStore((s) => s.addProgram);
  if (addable.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-center text-xs text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900/60 dark:ring-zinc-800">
        You've added every program we know about. More coming.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {addable.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => {
              addProgram(p);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200 transition-colors hover:bg-white dark:bg-zinc-900/60 dark:ring-zinc-800 dark:hover:bg-zinc-900"
          >
            <ProgramLogo program={p} />
            <span className="flex-1 text-left text-sm font-semibold">{p.name}</span>
            <Plus className="h-4 w-4 text-zinc-400" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
