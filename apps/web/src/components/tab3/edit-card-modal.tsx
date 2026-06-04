'use client';

// Modal for editing a held card's tracking fields (approval date, fee due,
// min spend, spend-by deadline). Reuses VoiceReviewWalkthrough so the
// voice-edit UX is identical to the Add Card review screen. Visual editing
// also available inline; either path commits via the store's updateCard.
//
// Scope: only the four "tracking" fields the user actually touches over
// time. Things like card name, last4, expiry are read-only here — change
// those via Add Card again (and delete the old) if they're wrong.

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle2, Pencil, Volume2 } from 'lucide-react';
import type { UserCardWithDetails } from '@ph/shared';
import { useUserCardsStore } from '@/store/user-cards';
import {
  VoiceReviewWalkthrough,
  type ReviewField,
} from '@/components/add-card-v2/voice-review-walkthrough';
import { formatCurrency, formatDate, spokenDate } from '@/lib/format';
import { speak } from '@/lib/tts';
import { todayIsoDate } from '@/lib/time';

interface EditCardModalProps {
  uc: UserCardWithDetails;
  onClose: () => void;
}

interface Editable {
  activationDate: string;
  annualFeeNextDueDate: string;
  bonusTarget: number;
  bonusSpendWindowEndDate: string;
}

export function EditCardModal({ uc, onClose }: EditCardModalProps) {
  const updateCard = useUserCardsStore((s) => s.updateCard);

  // Seed from current card. Use today as fallback if a field is unset so
  // the inputs always have a sensible value.
  const [draft, setDraft] = useState<Editable>(() => ({
    activationDate: uc.activationDate ?? uc.applicationDate ?? todayIsoDate(),
    annualFeeNextDueDate: uc.annualFeeNextDueDate ?? todayIsoDate(),
    bonusTarget: uc.bonusTarget ?? 0,
    bonusSpendWindowEndDate: uc.bonusSpendWindowEndDate ?? todayIsoDate(),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildSummary(): string {
    const parts: string[] = [`Editing your ${uc.card.name}.`];
    parts.push(`Approval ${spokenDate(draft.activationDate)}.`);
    parts.push(`Annual fee due ${spokenDate(draft.annualFeeNextDueDate)}.`);
    if (draft.bonusTarget) {
      parts.push(`Min spend ${formatCurrency(draft.bonusTarget)}.`);
    }
    parts.push(`Spend-by ${spokenDate(draft.bonusSpendWindowEndDate)}.`);
    parts.push(`Tap save when done, or tell me what needs changing.`);
    return parts.join(' ');
  }

  // Mount greeting — defer with a tiny timer so React 19 StrictMode's dev
  // double-mount doesn't race two speak() calls against each other (the
  // second call's cancelSpeech-on-entry was killing the first one's
  // in-flight audio). Cleanup cancels the TIMER, not the audio, so the
  // user always hears exactly one greeting.
  useEffect(() => {
    const t = setTimeout(() => void speak(buildSummary()), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateCard(uc.id, {
        activationDate: draft.activationDate,
        annualFeeNextDueDate: draft.annualFeeNextDueDate,
        bonusTarget: draft.bonusTarget || null,
        bonusSpendWindowEndDate: draft.bonusSpendWindowEndDate,
      });
      try {
        await speak(`${uc.card.name} updated.`);
      } catch {
        /* fine */
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl outline-none dark:bg-zinc-900">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Dialog.Title className="inline-flex items-center gap-2 text-base font-semibold">
              <Pencil className="h-4 w-4 text-[var(--color-ph-red)]" aria-hidden />
              Edit {uc.card.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-3"
          >
            <Field label="Approval date">
              <input
                type="date"
                value={draft.activationDate}
                onChange={(e) => setDraft((d) => ({ ...d, activationDate: e.target.value }))}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>

            <Field label="Annual fee next due" hint={formatCurrency(uc.card.annualFee)}>
              <input
                type="date"
                value={draft.annualFeeNextDueDate}
                onChange={(e) => setDraft((d) => ({ ...d, annualFeeNextDueDate: e.target.value }))}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>

            <Field label="Min spend target (AUD)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.bonusTarget || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bonusTarget: Number(e.target.value) || 0 }))
                }
                placeholder="e.g. 4500"
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>

            <Field
              label="Spend-by deadline"
              hint={`Currently ${formatDate(draft.bonusSpendWindowEndDate)}`}
            >
              <input
                type="date"
                value={draft.bonusSpendWindowEndDate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bonusSpendWindowEndDate: e.target.value }))
                }
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void speak(buildSummary())}
                className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-medium text-zinc-600 hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-400"
              >
                <Volume2 className="h-3 w-3" aria-hidden />
                Hear summary
              </button>
            </div>

            <VoiceReviewWalkthrough
              cardName={uc.card.name}
              current={draft}
              onUpdate={(field: ReviewField, value) => {
                setDraft((d) => ({
                  ...d,
                  [field]: field === 'bonusTarget' ? Number(value) : String(value),
                }));
              }}
              onSave={() => void save()}
            />

            {error && (
              <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
