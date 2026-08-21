'use client';

// Modal for editing a held card's tracking fields (approval date, fee due,
// min spend, spend-by deadline). Reuses VoiceReviewWalkthrough so the
// voice-edit UX is identical to the Add Card review screen. Visual editing
// also available inline; either path commits via the store's updateCard.
//
// Scope: only the four "tracking" fields the user actually touches over
// time. Things like card name, last4, expiry are read-only here — change
// those via Add Card again (and delete the old) if they're wrong.
//
// Lacquer overlay: ink-42% scrim, ph-paper sheet with the sheet radius,
// mono uppercase field eyebrows, ph-card + border-strong inputs with a
// ph-brick focus ring, red primary CTA + red destructive delete.

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, Pencil, Trash2, Volume2, X } from 'lucide-react';
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
  const deleteCard = useUserCardsStore((s) => s.deleteCard);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
        <Dialog.Overlay
          className="fixed inset-0 z-40 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
        />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-ph-sheet bg-ph-paper text-ph-text outline-none"
          style={{ padding: '20px 24px 26px' }}
        >
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-[38px] rounded-full"
            style={{ backgroundColor: '#DCD2C1' }}
          />

          <div className="mb-4 flex items-start justify-between gap-2">
            <Dialog.Title className="inline-flex items-center gap-2 font-serif text-[19px] leading-tight text-ph-ink">
              <Pencil className="h-4 w-4 text-ph-brick" aria-hidden />
              Edit {uc.card.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-ph-text-muted hover:bg-ph-fill-warm hover:text-ph-text"
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
            className="space-y-4"
          >
            <Field label="Approval date">
              <input
                type="date"
                value={draft.activationDate}
                onChange={(e) => setDraft((d) => ({ ...d, activationDate: e.target.value }))}
                className="w-full rounded-ph-inner border border-ph-border-strong bg-ph-card px-3 py-2.5 text-[14px] text-ph-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
              />
            </Field>

            <Field label="Annual fee next due" hint={formatCurrency(uc.card.annualFee)}>
              <input
                type="date"
                value={draft.annualFeeNextDueDate}
                onChange={(e) => setDraft((d) => ({ ...d, annualFeeNextDueDate: e.target.value }))}
                className="w-full rounded-ph-inner border border-ph-border-strong bg-ph-card px-3 py-2.5 text-[14px] text-ph-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
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
                className="w-full rounded-ph-inner border border-ph-border-strong bg-ph-card px-3 py-2.5 text-[14px] tabular-nums text-ph-ink placeholder:text-ph-text-meta focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
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
                className="w-full rounded-ph-inner border border-ph-border-strong bg-ph-card px-3 py-2.5 text-[14px] text-ph-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ph-brick"
              />
            </Field>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void speak(buildSummary())}
                className="inline-flex items-center gap-1.5 rounded-full border border-ph-border-strong bg-ph-card px-3 py-1.5 text-[12px] font-medium text-ph-text-muted transition-colors hover:text-ph-brick"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden />
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
              <p role="alert" className="text-[12px] text-ph-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            {/* Delete — for "I added this card by mistake" cases. Unlike
                Cancel (which keeps the card in history for eligibility
                math), Delete removes the record entirely so it stops
                blocking new bonuses. Two-step confirm so a single tap
                can't nuke data. */}
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mx-auto mt-1 flex items-center gap-1 text-[12px] font-medium text-ph-red hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete this card from history
              </button>
            ) : (
              <div className="mt-2 rounded-ph-inner border border-ph-negative-chip bg-ph-negative-chip p-3 text-[12px] text-ph-ink">
                <p>
                  Delete <span className="font-semibold">{uc.card.name}</span> from your history?
                  This removes it entirely — eligibility for new bonuses won&apos;t factor it in.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteCard(uc.id);
                      onClose();
                    }}
                    className="flex-1 rounded-full bg-ph-red px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 rounded-full border border-ph-border-strong bg-ph-card px-3 py-2 text-[12px] font-medium text-ph-text transition-colors hover:bg-ph-fill-warm"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
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
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[10px] tabular-nums text-ph-text-meta">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
