'use client';

// Unified Add Card flow — photo-first, smart-defaulted review, no Q&A.
//
// 1. Photo step: take photo, upload, or "pick manually"
// 2. (Only if OCR fails to match) Card picker question
// 3. Review with smart defaults; every field editable inline; tap Save.
//
// Principle (per UX call): never ask the user for something we can extract
// from the photo or derive from sensible defaults. Approval date defaults
// to today, fee due derives from approval + 12 months (auto-updates when
// approval changes unless the user manually edited fee due), min-spend to
// ~bonusPoints/30 rounded, spend-by to +90 days, bonus received to false.
// Anything wrong → tap edit, or use the voice mic under approval date.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Sparkles, CheckCircle2, AlertTriangle, Pencil, Volume2 } from 'lucide-react';
import clsx from 'clsx';
import type { CardWithIssuer } from '@ph/shared';
import { catalogue, useUserCardsStore } from '@/store/user-cards';
import { CardArt } from '@/components/card-art';
import { VoiceInput } from '@/components/voice-input';
import { PhotoStep } from './photo-step';
import { CardPickerQuestion } from './card-picker-question';
import { VoiceReviewWalkthrough, type ReviewField } from './voice-review-walkthrough';
import { formatCurrency, formatDate, spokenDate } from '@/lib/format';
import { todayIsoDate } from '@/lib/time';
import { cancelSpeech, speak } from '@/lib/tts';

type Step = 'photo' | 'pick' | 'review';

interface Collected {
  cardId: string | null;
  last4: string | null;
  expiryMonthYear: string | null;
  activationDate: string;
  annualFeeNextDueDate: string;
  bonusReceived: boolean;
  bonusTarget: number;
  bonusSpendWindowEndDate: string;
}

interface AddCardFlowProps {
  onSaved?: (savedCardId: string) => void;
  onClose?: () => void;
}

export function AddCardFlow({ onSaved, onClose }: AddCardFlowProps = {}) {
  const router = useRouter();
  const addCard = useUserCardsStore((s) => s.addCard);
  const cards = useMemo(() => catalogue.allCards(), []);

  const [step, setStep] = useState<Step>('photo');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart defaults computed once, when entering the review.
  const [collected, setCollected] = useState<Collected>(() => emptyCollected());
  // Track which derived fields the user has manually overridden. Until they
  // do, we auto-recompute from approval date whenever it changes — so a
  // quick voice "last March" propagates to fee due AND spend-by too.
  // Default spend-by rule of thumb: 90 days from approval (most AU sign-up
  // bonuses use a 90-day window; swap with per-card data when available).
  const [feeDueDirty, setFeeDueDirty] = useState(false);
  const [spendByDirty, setSpendByDirty] = useState(false);

  function handleChange(patch: Partial<Collected>) {
    setCollected((c) => {
      const next = { ...c, ...patch };
      if (patch.activationDate) {
        if (!feeDueDirty) {
          next.annualFeeNextDueDate = addMonthsIso(patch.activationDate, 12);
        }
        if (!spendByDirty) {
          next.bonusSpendWindowEndDate = addDaysIso(patch.activationDate, 90);
        }
      }
      return next;
    });
    if (patch.annualFeeNextDueDate !== undefined) {
      setFeeDueDirty(true);
    }
    if (patch.bonusSpendWindowEndDate !== undefined) {
      setSpendByDirty(true);
    }
  }

  const matchedCard = useMemo(
    () => (collected.cardId ? (cards.find((c) => c.id === collected.cardId) ?? null) : null),
    [collected.cardId, cards],
  );

  function jumpToReviewFor(cardId: string, last4: string | null, expiry: string | null) {
    const card = cards.find((c) => c.id === cardId);
    setCollected((c) => ({
      ...c,
      cardId,
      last4: last4 ?? c.last4,
      expiryMonthYear: expiry ?? c.expiryMonthYear,
      // Recompute smart defaults that depend on the catalogue match.
      bonusTarget: smartMinSpend(card),
    }));
    setStep('review');
  }

  function handleCaptured(result: {
    matchedCardId: string | null;
    extracted: { last4: string | null; expiryMonthYear: string | null };
  }) {
    if (result.matchedCardId) {
      jumpToReviewFor(
        result.matchedCardId,
        result.extracted.last4,
        result.extracted.expiryMonthYear,
      );
    } else {
      // Photo OCR didn't pick a catalogue card — stash extracted last4/expiry
      // and route to the picker step so the user can choose.
      setCollected((c) => ({
        ...c,
        last4: result.extracted.last4 ?? c.last4,
        expiryMonthYear: result.extracted.expiryMonthYear ?? c.expiryMonthYear,
      }));
      setStep('pick');
    }
  }

  function handleManual() {
    setStep('pick');
  }

  function handlePicked(cardId: string) {
    jumpToReviewFor(cardId, collected.last4, collected.expiryMonthYear);
  }

  async function save() {
    if (!collected.cardId) return;
    setPending(true);
    setError(null);
    try {
      await addCard({
        cardId: collected.cardId,
        applicationDate: collected.activationDate,
        bonusReceived: collected.bonusReceived,
        last4: collected.last4,
        expiryMonthYear: collected.expiryMonthYear,
        activationDate: collected.activationDate,
        annualFeeNextDueDate: collected.annualFeeNextDueDate,
        bonusTarget: collected.bonusTarget,
        bonusSpendWindowEndDate: collected.bonusSpendWindowEndDate,
      });
      // Confirmation welcome — names the just-saved card so the user has
      // closure on what they added. Await before navigating so audio
      // plays out fully (next page's mount greeting otherwise cancels via
      // lib/tts cancelSpeech-on-entry).
      if (matchedCard?.name) {
        try {
          await speak(`Welcome to your ${matchedCard.name}.`);
        } catch {
          /* don't block navigation on TTS failure */
        }
      }
      if (onSaved) {
        onSaved(collected.cardId);
        setPending(false);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add card"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}
      </div>
      <header className="mt-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Add a card</h1>
      </header>

      <div className="mt-4">
        {step === 'photo' && (
          <PhotoStep onCaptured={handleCaptured} onManual={handleManual} onSpeak={handleManual} />
        )}

        {step === 'pick' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Pick your card from the list.
            </p>
            <CardPickerQuestion cards={cards} onPick={(id) => handlePicked(id)} />
          </div>
        )}

        {step === 'review' && matchedCard && (
          <ReviewForm
            card={matchedCard}
            collected={collected}
            spendByDirty={spendByDirty}
            onChange={handleChange}
            onChangeCard={() => setStep('pick')}
            onSave={save}
            pending={pending}
          />
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          {error}
        </div>
      )}
    </main>
  );
}

function ReviewForm({
  card,
  collected,
  spendByDirty,
  onChange,
  onChangeCard,
  onSave,
  pending,
}: {
  card: CardWithIssuer;
  collected: Collected;
  spendByDirty: boolean;
  onChange: (patch: Partial<Collected>) => void;
  onChangeCard: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Set when the most recent voice/text submission successfully updated the
  // approval date. Drives the green confirmation chip + the brief ring
  // highlight on the date input.
  const [voiceSuccess, setVoiceSuccess] = useState<string | null>(null);

  // Build the spoken summary text. Pulled out of the mount effect so the
  // "Hear summary again" button (rendered below) can reuse the exact same
  // copy. Uses the LATEST field values at call time — if the user has
  // already edited something, the replay reflects the change.
  function buildSummary(): string {
    const parts: string[] = [`Here's what I picked up for your ${card.name}.`];
    if (collected.activationDate) {
      parts.push(`Approval ${spokenDate(collected.activationDate)}.`);
    }
    if (collected.annualFeeNextDueDate) {
      parts.push(`Annual fee due ${spokenDate(collected.annualFeeNextDueDate)}.`);
    }
    if (collected.bonusTarget) {
      parts.push(`Min spend ${formatCurrency(collected.bonusTarget)}.`);
    }
    if (collected.bonusSpendWindowEndDate) {
      parts.push(`Spend-by ${spokenDate(collected.bonusSpendWindowEndDate)}.`);
    }
    parts.push(`Tap save if that looks right, or tell me what needs changing.`);
    return parts.join(' ');
  }

  // Spoken summary on mount — deferred via setTimeout so React 19
  // StrictMode's dev double-mount doesn't race two speak() calls (the
  // second was cancelling the first's in-flight audio and the result was
  // silence). Cleanup cancels the TIMER not the audio, so exactly one
  // speak() fires per real mount. Doesn't re-fire on value edits — the
  // voice walkthrough handles per-edit confirmations, and the "Hear
  // summary" button below covers explicit replays.
  useEffect(() => {
    const t = setTimeout(() => void speak(buildSummary()), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVoiceApprovalDate(utterance: string) {
    setVoiceParsing(true);
    setVoiceError(null);
    setVoiceSuccess(null);
    try {
      const res = await fetch('/api/onboard/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'date', answer: utterance, today: todayIsoDate() }),
      });
      const json = (await res.json()) as
        | { isoDate: string | null; skip: boolean }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'parse failed');
      }
      if (json.skip || !json.isoDate) {
        setVoiceError("Couldn't pick a date from that — try '12 May' or 'three weeks ago'.");
        return;
      }
      // Defensive: only accept strict yyyy-MM-dd (the schema requests it, but
      // models occasionally return ISO-with-time or other formats).
      const normalised = /^\d{4}-\d{2}-\d{2}$/.test(json.isoDate)
        ? json.isoDate
        : json.isoDate.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalised)) {
        setVoiceError(`Couldn't read the parsed date ("${json.isoDate}") — try again.`);
        return;
      }
      onChange({ activationDate: normalised });
      setVoiceSuccess(normalised);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : String(err));
    } finally {
      setVoiceParsing(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4"
    >
      {/* Card identity (from OCR + catalogue match). Visible, with a quick
          way to swap if the match was wrong. */}
      <section className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <CardArt card={card} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{card.name}</p>
          <p className="text-xs text-zinc-500">
            {card.issuer.name} · annual fee {formatCurrency(card.annualFee)}
          </p>
          {(collected.last4 || collected.expiryMonthYear) && (
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {collected.last4 && <>•••• {collected.last4}</>}
              {collected.last4 && collected.expiryMonthYear && ' · '}
              {collected.expiryMonthYear && <>exp {collected.expiryMonthYear}</>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onChangeCard}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-400"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          Change card
        </button>
      </section>

      {/* Smart defaults — every field editable. */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Defaults — edit anything wrong
        </p>

        {/* Approval date — promoted to a full-width row with a voice override
            underneath, because everything else (fee due, spend-by) derives
            from it and it's the field most likely to be wrong by default. */}
        <Field label="Approval date" hint="When the issuer approved your application.">
          <input
            type="date"
            value={collected.activationDate}
            onChange={(e) => {
              onChange({ activationDate: e.target.value });
              // Clear the voice-success chip when the user types in the
              // field directly — the chip would otherwise stay stale.
              setVoiceSuccess(null);
            }}
            // Brief ring highlight whenever the voice override just updated
            // the value, so the user can see what changed.
            className={clsx(
              'w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm transition-shadow dark:border-zinc-700 dark:bg-zinc-950',
              voiceSuccess === collected.activationDate &&
                'ring-2 ring-emerald-400/70 ring-offset-1 dark:ring-offset-zinc-900',
            )}
          />
          <div className="mt-2">
            <VoiceInput
              ariaLabel="Approval date — voice or text override"
              placeholder="Say 'last March', 'three weeks ago', '12 May'…"
              onSubmit={handleVoiceApprovalDate}
              disabled={voiceParsing}
              hint="Tap Send (or press Enter) after typing — the field above will update."
            />
            {voiceParsing && <p className="mt-1 text-[11px] text-zinc-500">Parsing…</p>}
            {voiceSuccess && voiceSuccess === collected.activationDate && !voiceError && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Approval date set to {formatDate(voiceSuccess)}
              </p>
            )}
            {voiceError && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{voiceError}</p>
            )}
          </div>
        </Field>

        {/* Min-spend target + spend-by deadline paired on one row — they're
            conceptually the same chase (target $ + deadline). Annual fee
            next due is auto-derived from approval + 12 months and shown
            on the held-card row, not here — keeps this screen focused on
            the chase, not on long-term tracking. Edit details modal on
            Tab 3 covers the rare case the auto-fee-date is wrong. */}
        <div className="grid grid-cols-[1fr,1.2fr] gap-3">
          <Field label="Min-spend target">
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={String(collected.bonusTarget)}
                onChange={(e) => onChange({ bonusTarget: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-5 pr-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          </Field>
          <Field
            label="Spend by"
            hint={spendByDirty ? 'Manually set.' : `Auto — approval + 90 days.`}
          >
            <input
              type="date"
              value={collected.bonusSpendWindowEndDate}
              onChange={(e) => onChange({ bonusSpendWindowEndDate: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950/60">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Sign-up bonus already received?
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={collected.bonusReceived}
            onClick={() => onChange({ bonusReceived: !collected.bonusReceived })}
            className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] ${
              collected.bonusReceived ? 'bg-[var(--color-ph-red)]' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                collected.bonusReceived ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Replay button — in case the mount summary was missed (autoplay
          blocked, user scrolled too fast, user wants to re-hear after
          editing). Cancels any in-flight audio via lib/tts. */}
      <button
        type="button"
        onClick={() => void speak(buildSummary())}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-medium text-zinc-600 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-400"
      >
        <Volume2 className="h-3 w-3" aria-hidden />
        Hear summary
      </button>

      {/* Conversational voice walkthrough — speaks back any field the user
          asks to change, or saves when they say "looks good". Visual
          editing above still works in parallel; this is the voice-first
          path for hands-busy users. */}
      <VoiceReviewWalkthrough
        cardName={card.name}
        current={{
          activationDate: collected.activationDate,
          annualFeeNextDueDate: collected.annualFeeNextDueDate,
          bonusTarget: collected.bonusTarget,
          bonusSpendWindowEndDate: collected.bonusSpendWindowEndDate,
        }}
        onUpdate={(field: ReviewField, value) => {
          if (field === 'bonusTarget') {
            onChange({ bonusTarget: Number(value) });
          } else {
            onChange({ [field]: String(value) } as Partial<Collected>);
          }
        }}
        onSave={onSave}
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        {pending ? 'Saving…' : 'Save card'}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[10px] text-zinc-500">{hint}</p>}
    </label>
  );
}

// ── Smart defaults ──────────────────────────────────────────────────────────

function emptyCollected(): Collected {
  const today = todayIsoDate();
  return {
    cardId: null,
    last4: null,
    expiryMonthYear: null,
    activationDate: today,
    annualFeeNextDueDate: addMonthsIso(today, 12),
    bonusReceived: false,
    bonusTarget: 3000,
    bonusSpendWindowEndDate: addDaysIso(today, 90),
  };
}

/** Heuristic min-spend default from the card's bonusPoints. ~30 points per
 * $1 typical; round to the nearest $500; floor at $1500. */
function smartMinSpend(card: CardWithIssuer | undefined): number {
  if (!card?.bonusPoints) return 3000;
  const raw = card.bonusPoints / 30;
  return Math.max(1500, Math.round(raw / 500) * 500);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
