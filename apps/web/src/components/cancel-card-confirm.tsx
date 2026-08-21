'use client';

// Voice-or-tap confirmation for destructive Cancel actions. Inline reveal —
// renders below the trigger button. Voice "yes" / "confirm" / "cancel it"
// triggers; "no" / "stop" closes.
//
// Lacquer overlay: red-tinted panel (ph-negative-chip + ph-red border),
// brick-red confirm CTA, outline "Keep it" secondary, VoiceInput at the
// bottom for the voice-first path.

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
      className="mt-2 rounded-ph-inner border border-ph-red/40 bg-ph-negative-chip p-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-ph-red" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px] leading-tight text-ph-red">Cancel {cardName}?</p>
          <p className="mt-1 text-[12px] leading-snug text-ph-text-muted">
            Records today as the cancellation date. You can re-add it later if needed.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close confirmation"
          className="grid h-7 w-7 flex-none place-items-center rounded-full text-ph-red hover:bg-white/60"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={submitting}
          className="flex-1 rounded-full bg-ph-red px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-full border border-ph-border-strong bg-ph-card px-4 py-2.5 text-sm font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
        >
          Keep it
        </button>
      </div>

      <div className="mt-3">
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
