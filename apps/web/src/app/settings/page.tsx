'use client';

/**
 * /settings — the header ☰ target. Two things live here:
 *
 *   1. Preferences  — voice output + theme (moved off the header
 *      cluster in Phase 3, HANDOFF § Header).
 *   2. Alert Centre — global quiet hours + pause-all + per-card alert
 *      toggles. Phase 4 polish: full Lacquer palette + Instrument
 *      Serif titles + mono eyebrows. Behaviour unchanged; the shared
 *      alerts store still owns the state.
 *
 * Preferences uses ph-fill-warm tiles to keep visual weight low —
 * these are per-user chrome, not the Alert Centre content. Alert
 * Centre proper reads as the main body.
 */

import { useState } from 'react';
import { Bell, ChevronDown, Sliders } from 'lucide-react';
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
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
        <header>
          <h1 className="font-serif text-[28px] leading-none text-ph-ink">Settings</h1>
        </header>

        {/* ── Preferences ─────────────────────────────────────────────── */}
        <h2 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Preferences
        </h2>
        <section
          aria-label="Preferences"
          className="overflow-hidden rounded-ph-card border border-ph-border bg-ph-card"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ph-border p-4">
            <div className="min-w-0">
              <p className="font-serif text-[17px] leading-tight text-ph-ink">Spoken voice</p>
              <p className="mt-1 text-[13px] text-ph-text-muted">
                Mute Copilot&apos;s spoken replies. Voice input (mic) stays on either way.
              </p>
            </div>
            <VoiceToggle />
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-serif text-[17px] leading-tight text-ph-ink">Appearance</p>
              <p className="mt-1 text-[13px] text-ph-text-muted">
                Follow system, or lock to light / dark.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* ── Alert Centre ────────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ph-brick" aria-hidden />
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">
              Alert Centre
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-ph-text-muted">
            Which nudges fire, and when. Conservative defaults — turn the high-value ones up first.
          </p>
        </div>

        <div className="mt-4">
          <GlobalSection global={global} onChange={setGlobal} />
        </div>

        <h3 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Per card
        </h3>
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.cardId}>
              <CardCard card={c} />
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-start gap-2 rounded-ph-inner border border-ph-tint-border bg-ph-tint p-3 text-[12px] leading-snug text-ph-text-muted">
          <Sliders className="mt-0.5 h-3.5 w-3.5 flex-none text-ph-brick" aria-hidden />
          <span>
            Real notifications switch on once you turn on push. For now your choices here decide
            which alerts show in the inbox.
          </span>
        </p>
      </div>
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
      className="overflow-hidden rounded-ph-card border border-ph-border bg-ph-card"
    >
      <div className="border-b border-ph-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[17px] leading-tight text-ph-ink">Quiet hours</p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-ph-text-muted">
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
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-serif text-[17px] leading-tight text-ph-ink">Pause all alerts</p>
          <p className="mt-1 text-[13px] text-ph-text-muted">
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
    <div className="overflow-hidden rounded-ph-card border border-ph-border bg-ph-card">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-ph-fill-warm"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[17px] leading-tight text-ph-ink">
            {card.cardName}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta tabular-nums">
            {enabledCount} of {totalCount} alerts on
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-none text-ph-text-meta transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <ul className="border-t border-ph-border">
          {(Object.keys(card.enabled) as AlertKind[]).map((kind, i, arr) => {
            const meta = ALERT_KIND_LABELS[kind];
            const isLast = i === arr.length - 1;
            return (
              <li
                key={kind}
                className={
                  isLast
                    ? 'flex items-center gap-3 px-4 py-3'
                    : 'flex items-center gap-3 border-b border-ph-border px-4 py-3'
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ph-ink">{meta.title}</p>
                  <p className="mt-0.5 text-[12px] text-ph-text-muted">{meta.sub}</p>
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

/** Lacquer toggle switch. Track flips to ph-red (action colour) when
 *  on; ph-fill when off. Uses flex centering + an INSET ring so the
 *  knob stays perfectly on the pill's vertical midline regardless of
 *  ring state (the previous absolute-top-0.5 + outset ring drifted
 *  ~1px above centre because the ring expanded the visual box but
 *  not the coordinate system the knob positioned against). */
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
        'relative inline-flex h-6 w-10 flex-none items-center rounded-full p-0.5 transition-colors ' +
        (checked ? 'bg-ph-red' : 'bg-ph-fill ring-1 ring-inset ring-ph-border-strong')
      }
    >
      <span
        className={
          'block h-5 w-5 rounded-full bg-white transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0')
        }
        style={{ boxShadow: 'var(--shadow-ph-thumb)' }}
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
    <label className="flex flex-1 items-center gap-2 rounded-full border border-ph-border-strong bg-ph-card px-3 py-1.5 text-[12px]">
      <span className="font-mono uppercase tracking-[0.14em] text-ph-text-meta">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-semibold text-ph-ink tabular-nums focus:outline-none"
      />
    </label>
  );
}
