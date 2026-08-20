'use client';

/**
 * /settings — Alert Centre. The control surface for which nudges fire
 * and when. Global toggles (quiet hours, pause-all) at the top, then a
 * per-card section where each card expands to four alert-type toggles
 * (min-spend deadline / annual fee / benefit expiring / 3m-to-bonus).
 *
 * v1 just persists preferences to the shared alerts store — no real
 * web-push wiring. When notifications are wired, they read from this
 * same store to decide what to send.
 */

import { useState } from 'react';
import { Bell, ChevronDown, Settings } from 'lucide-react';
import {
  useAlertsStore,
  type AlertKind,
  type CardAlertPrefs,
  type GlobalAlertPrefs,
} from '@/store/alerts';
import { VoiceToggle } from '@/components/voice-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

const ALERT_KIND_LABELS: Record<AlertKind, { title: string; sub: string }> = {
  'min-spend-deadline': {
    title: 'Min-spend deadline',
    sub: "Nudge before you'd lose the bonus.",
  },
  'annual-fee-renewal': {
    title: 'Annual fee renewal',
    sub: 'Heads-up before you get charged.',
  },
  'benefit-expiring': {
    title: 'Benefit expiring',
    sub: 'So a perk doesn’t go unused.',
  },
  'three-month-to-bonus': {
    title: '3-month-to-bonus',
    sub: 'Early signal you can apply soon.',
  },
};

export default function SettingsPage() {
  const global = useAlertsStore((s) => s.global);
  const cards = useAlertsStore((s) => s.cards);
  const setGlobal = useAlertsStore((s) => s.setGlobal);

  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bell className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Alert Centre
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Per-card alert toggles + global quiet hours. Conservative defaults — turn the high-value
          ones up first.
        </p>
      </header>

      {/* Preferences: voice output + theme toggles. Relocated here
          from the top-right cluster in Phase 3 (HANDOFF § Header) —
          the header carries only Today / Alerts / Settings now. */}
      <section
        aria-label="Preferences"
        className="mb-6 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 p-3 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Spoken voice</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Mute Copilot&apos;s spoken replies. Voice input (mic) stays on either way.
            </p>
          </div>
          <VoiceToggle />
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Appearance</p>
            <p className="mt-0.5 text-xs text-zinc-500">Follow system, or lock to light / dark.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <GlobalSection global={global} onChange={setGlobal} />

      <h2 className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Per card
      </h2>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.cardId}>
            <CardCard card={c} />
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900/60 dark:ring-zinc-800">
        <Settings className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
        <span>
          Real notifications switch on once you turn on push. For now your choices here decide which
          alerts show in the inbox.
        </span>
      </p>
    </main>
  );
}

function GlobalSection({
  global,
  onChange,
}: {
  global: GlobalAlertPrefs;
  onChange: (patch: Partial<GlobalAlertPrefs>) => void;
}) {
  return (
    <section
      aria-label="Global alert preferences"
      className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Quiet hours</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {global.quietStart} – {global.quietEnd}
            </p>
          </div>
          <Toggle
            checked={global.quietHoursEnabled}
            onChange={(v) => onChange({ quietHoursEnabled: v })}
            label="Quiet hours"
          />
        </div>
        {global.quietHoursEnabled && (
          <div className="mt-3 flex items-center gap-2">
            <TimeInput
              label="From"
              value={global.quietStart}
              onChange={(v) => onChange({ quietStart: v })}
            />
            <TimeInput
              label="To"
              value={global.quietEnd}
              onChange={(v) => onChange({ quietEnd: v })}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Pause all alerts</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Stop everything until you switch it back on.
          </p>
        </div>
        <Toggle
          checked={global.pauseAll}
          onChange={(v) => onChange({ pauseAll: v })}
          label="Pause all"
        />
      </div>
    </section>
  );
}

function CardCard({ card }: { card: CardAlertPrefs }) {
  const setCardAlert = useAlertsStore((s) => s.setCardAlert);
  const [expanded, setExpanded] = useState(card.cardId === 'amex-platinum');

  const enabledCount = Object.values(card.enabled).filter(Boolean).length;
  const totalCount = Object.keys(card.enabled).length;

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{card.cardName}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {enabledCount} of {totalCount} alerts on
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-none text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {expanded && (
        <ul className="border-t border-zinc-100 p-2 dark:border-zinc-800">
          {(Object.keys(card.enabled) as AlertKind[]).map((kind) => {
            const meta = ALERT_KIND_LABELS[kind];
            return (
              <li key={kind} className="flex items-center gap-3 px-1.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{meta.sub}</p>
                </div>
                <Toggle
                  checked={card.enabled[kind]}
                  onChange={(v) => setCardAlert(card.cardId, kind, v)}
                  label={`${card.cardName} ${meta.title}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'relative h-6 w-10 flex-none rounded-full bg-[var(--color-ph-red)] transition-colors'
          : 'relative h-6 w-10 flex-none rounded-full bg-zinc-300 transition-colors dark:bg-zinc-700'
      }
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700">
      <span className="font-medium text-zinc-500">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-semibold tabular-nums focus:outline-none"
      />
    </label>
  );
}
