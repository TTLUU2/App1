'use client';

// Government-spend deduction step.
//
// AU credit-card sign-up bonuses typically exclude direct payments to
// government agencies (ATO, council rates, car rego, Australia Post). Banks
// don't count those toward the min-spend target. So between parsing a spend
// update and applying it, we ask: "Was any of that a government payment?"
//
// Voice-first by design — the mic + text input sits at the top, ahead of
// the buttons. A single utterance can answer both questions ("no",
// "fifty was ATO", "$200"). Buttons are the secondary affordance for
// users who prefer tapping.

import { useState } from 'react';
import { Send, AlertTriangle, CheckCircle2, Landmark } from 'lucide-react';
import { VoiceInput } from '@/components/voice-input';
import { formatCurrency } from '@/lib/format';

type Phase = 'asking' | 'amount_only' | 'parsing' | 'confirming';

// Match leading "no/none/zero/nothing" to short-circuit.
const NO_PHRASE = /^\s*(no|nope|none|nothing|zero|nil|nada)\b/i;

export function SpendGovCheck({
  amount,
  cardName,
  onConfirm,
  onCancel,
}: {
  /** Original spend amount the user reported. */
  amount: number;
  cardName: string;
  /** Called with the adjusted amount (= amount − govExclusion). */
  onConfirm: (adjusted: number) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('asking');
  const [govAmount, setGovAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function interpretGovUtterance(utterance: string) {
    const trimmed = utterance.trim();
    if (!trimmed) return;
    if (NO_PHRASE.test(trimmed)) {
      void apply(0);
      return;
    }
    await parseAmount(trimmed);
  }

  async function parseAmount(utterance: string) {
    setPhase('parsing');
    setError(null);
    try {
      // Reuse the spend parser with an empty heldCards list — we only want
      // the `amount` field; cardId always comes back null and is ignored.
      const res = await fetch('/api/parse/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance, heldCards: [] }),
      });
      const json = (await res.json()) as { amount: number | null } | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'parse failed');
      }
      if (json.amount == null) {
        setError("Couldn't pick out an amount — try '$50', 'fifty', or 'no'.");
        setPhase('amount_only');
        return;
      }
      if (json.amount < 0) {
        setError("Government spend can't be negative.");
        setPhase('amount_only');
        return;
      }
      if (json.amount > amount) {
        setError(
          `Government portion (${formatCurrency(json.amount)}) can't be more than the total (${formatCurrency(amount)}).`,
        );
        setPhase('amount_only');
        return;
      }
      setGovAmount(json.amount);
      setPhase('confirming');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('amount_only');
    }
  }

  async function apply(gov: number) {
    setSubmitting(true);
    try {
      await onConfirm(amount - gov);
    } finally {
      setSubmitting(false);
    }
  }

  const adjusted = amount - govAmount;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <header className="flex items-start gap-2">
        <Landmark
          className="mt-0.5 h-4 w-4 flex-none text-amber-700 dark:text-amber-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Add {formatCurrency(amount)} to {cardName}
          </p>
          {phase === 'asking' && (
            <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-200/85">
              Was any of this a direct government payment (ATO, council rates, car rego, Australia
              Post)? Banks usually don&apos;t count those toward sign-up min-spend.
            </p>
          )}
          {phase === 'amount_only' && (
            <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-200/85">
              How much of the {formatCurrency(amount)} was government?
            </p>
          )}
          {phase === 'parsing' && (
            <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-200/85">
              Working out the amount…
            </p>
          )}
          {phase === 'confirming' && (
            <p className="mt-1 text-xs text-emerald-900 dark:text-emerald-200">
              {formatCurrency(amount)} − {formatCurrency(govAmount)} gov ={' '}
              <span className="font-semibold">{formatCurrency(adjusted)}</span> counted toward
              min-spend.
            </p>
          )}
        </div>
      </header>

      {/* Voice-first input. Always present so users can speak the answer
          even on the confirm screen ("actually it was 80"). */}
      {phase !== 'confirming' && (
        <div className="mt-3">
          <VoiceInput
            ariaLabel={
              phase === 'asking'
                ? 'Government spend — say no, an amount, or use the buttons'
                : 'Government spend amount'
            }
            placeholder={
              phase === 'asking' ? 'Say "no" or "fifty was ATO"' : 'Say "$50" or "fifty"'
            }
            onSubmit={phase === 'asking' ? interpretGovUtterance : parseAmount}
            disabled={phase === 'parsing'}
            autoFocus={phase === 'amount_only'}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1 text-[11px] text-rose-700 dark:text-rose-300"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {error}
        </p>
      )}

      {/* Tap fallbacks — secondary to the voice mic above. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phase === 'asking' && (
          <>
            <button
              type="button"
              onClick={() => void apply(0)}
              disabled={submitting}
              className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              No, all counts
            </button>
            <button
              type="button"
              onClick={() => setPhase('amount_only')}
              disabled={submitting}
              className="rounded-full border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:text-amber-100"
            >
              Yes, some was gov
            </button>
          </>
        )}
        {phase === 'amount_only' && (
          <button
            type="button"
            onClick={() => setPhase('asking')}
            className="rounded-full border border-amber-300 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-800 dark:text-amber-100"
          >
            ← Back
          </button>
        )}
        {phase === 'confirming' && (
          <>
            <button
              type="button"
              onClick={() => void apply(govAmount)}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {submitting ? 'Saving…' : `Apply ${formatCurrency(adjusted)}`}
            </button>
            <button
              type="button"
              onClick={() => setPhase('amount_only')}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:text-amber-100"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              Edit
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="ml-auto text-[11px] text-amber-800/80 underline-offset-2 hover:underline dark:text-amber-200/80"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
