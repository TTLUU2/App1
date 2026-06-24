'use client';

/**
 * /balances — Point balances editor. Reached from the top-right menu.
 * The same data feeds the Home stat-strip ("Pts pending") and the
 * Journeys landing ("Total points"), so any edit here propagates
 * immediately across the app via the shared zustand store.
 *
 * Manual entry only for v1. The architecture for auto-pulling
 * balances from a forwarded email is sketched in conversation but
 * not built yet — when it lands, it'll write to the same store.
 */

import { useState } from 'react';
import { Check, Coins, Plus, X } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';

/** Programs the user can add via the picker — superset of the seed. */
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
          Update your balances here — they feed the Journeys home and every insight.
        </p>
      </header>

      <section
        aria-label="Total points"
        className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Total points</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatPoints(total)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Across {programs.length} program{programs.length === 1 ? '' : 's'} · ≈ $
          {Math.round(valueAud).toLocaleString('en-AU')} value
        </p>
      </section>

      <ul className="space-y-2">
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

      <p className="mt-4 text-center text-[10px] text-zinc-400">
        Manual entry for now — auto-sync coming soon.
      </p>
    </main>
  );
}

function ProgramRow({ program }: { program: ProgramBalance }) {
  const updateBalance = useBalancesStore((s) => s.updateBalance);
  const removeProgram = useBalancesStore((s) => s.removeProgram);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(program.balance));

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
          {program.updatedAt && !editing && (
            <p className="mt-0.5 text-[11px] text-zinc-500">Updated {program.updatedAt}</p>
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
