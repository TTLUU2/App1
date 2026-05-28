'use client';

// Voice-or-tap confirmation for destructive Cancel actions. Inline reveal —
// renders below the trigger button. Voice "yes" / "confirm" / "cancel it"
// triggers; "no" / "stop" closes.

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { VoiceInput } from './voice-input';

const CONFIRM_PHRASES = /^(y|yes|yeah|yep|confirm|do it|cancel it|cancel|sure|ok|okay)\b/i;
const REJECT_PHRASES = /^(n|no|nope|stop|wait|undo|don'?t|never|cancel that)\b/i;

export function CancelCardConfirm({
  cardName,
  onConfirm,
  onClose,
}: {
  cardName: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  function interpret(utterance: string) {
    const t = utterance.trim();
    if (CONFIRM_PHRASES.test(t)) void confirm();
    else if (REJECT_PHRASES.test(t)) onClose();
    // Otherwise: keep waiting. The user can re-speak or tap the buttons.
  }

  async function confirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Confirm cancelling ${cardName}`}
      className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 flex-none text-rose-700 dark:text-rose-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-rose-900 dark:text-rose-100">Cancel {cardName}?</p>
          <p className="mt-0.5 text-[11px] text-rose-800/80 dark:text-rose-200/80">
            Records today as the cancellation date. You can re-add it later if needed.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close confirmation"
          className="grid h-7 w-7 flex-none place-items-center rounded-full text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/60"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={submitting}
          className="flex-1 rounded-full bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          Keep it
        </button>
      </div>

      <div className="mt-2">
        <VoiceInput
          ariaLabel="Confirm or reject cancellation by voice"
          placeholder="Say 'yes' / 'cancel it' to confirm, 'no' to keep"
          onSubmit={interpret}
          disabled={submitting}
        />
      </div>
    </div>
  );
}
