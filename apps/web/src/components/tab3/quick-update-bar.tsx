'use client';

// Tab 3 inline voice update bar — the "FAB does something here too" answer.
//
// One mic affordance at the top of Tab 3. Dictate either a spend or a
// benefit redemption; /api/parse/quick-update tells us which kind the user
// meant, and we apply the right mutation inline without leaving the
// dashboard.

import { useMemo, useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Undo2 } from 'lucide-react';
import { getAllBenefits } from '@ph/shared';
import { VoiceInput } from '@/components/voice-input';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { formatCurrency } from '@/lib/format';
import { nowMs } from '@/lib/time';

interface LastSpend {
  kind: 'spend';
  userCardId: string;
  prevSpent: number;
  amount: number;
  label: string;
}
interface LastBenefit {
  kind: 'benefit';
  redemptionId: string;
  label: string;
}
type LastApplied = LastSpend | LastBenefit;

export function QuickUpdateBar() {
  const userCards = useUserCardsStore((s) => s.userCards);
  const loaded = useUserCardsStore((s) => s.loaded);
  const updateCard = useUserCardsStore((s) => s.updateCard);
  const markBenefitUsed = useUserBenefitsStore((s) => s.markUsed);
  const removeRedemption = useUserBenefitsStore((s) => s.removeRedemption);

  const heldCards = useMemo(
    () =>
      selectUserCardsWithDetails({ userCards, loaded, error: null } as never).filter(
        (c) => !c.cancellationDate,
      ),
    [userCards, loaded],
  );

  const benefitOptions = useMemo(() => {
    const all = getAllBenefits();
    return heldCards.flatMap((uc) =>
      all
        .filter((b) => b.cardId === uc.cardId)
        .map((b) => ({
          userCardId: uc.id,
          benefitId: b.id,
          cardName: uc.card.name,
          benefitName: b.name,
        })),
    );
  }, [heldCards]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<LastApplied | null>(null);
  const [undoExpiresAt, setUndoExpiresAt] = useState<number>(0);

  async function handleSubmit(utterance: string) {
    if (heldCards.length === 0) {
      setError('No active cards to update.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/parse/quick-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance,
          heldCards: heldCards.map((uc) => ({
            id: uc.id,
            name: uc.card.name,
            nickname: uc.nickname,
            last4: uc.last4,
          })),
          benefits: benefitOptions,
        }),
      });
      const json = (await res.json()) as
        | {
            kind: 'spend' | 'benefit' | 'unknown';
            amount: number | null;
            spendCardId: string | null;
            benefitUserCardId: string | null;
            benefitId: string | null;
            confidence: 'high' | 'medium' | 'low';
          }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'Parse failed');
      }
      if (json.kind === 'spend' && json.spendCardId && json.amount != null) {
        const uc = heldCards.find((c) => c.id === json.spendCardId);
        if (!uc) {
          setError("Parser picked a card I can't find — try again.");
          return;
        }
        const prevSpent = uc.bonusSpentToDate ?? 0;
        await updateCard(uc.id, { bonusSpentToDate: prevSpent + json.amount });
        setLastApplied({
          kind: 'spend',
          userCardId: uc.id,
          prevSpent,
          amount: json.amount,
          label: `Added ${formatCurrency(json.amount)} to ${uc.card.name}`,
        });
        setUndoExpiresAt(nowMs() + 30_000);
      } else if (json.kind === 'benefit' && json.benefitUserCardId && json.benefitId) {
        const uc = heldCards.find((c) => c.id === json.benefitUserCardId);
        const benefit = getAllBenefits().find((b) => b.id === json.benefitId);
        if (!uc || !benefit) {
          setError("Parser picked a benefit I can't find — try again.");
          return;
        }
        const record = await markBenefitUsed({
          userCardId: uc.id,
          benefit,
          activationDate: uc.activationDate ?? uc.applicationDate,
        });
        setLastApplied({
          kind: 'benefit',
          redemptionId: record.id,
          label: `Marked ${benefit.name} used on ${uc.card.name}`,
        });
        setUndoExpiresAt(nowMs() + 30_000);
      } else {
        setError(
          "Couldn't tell if that was a spend or a benefit. Try again with the amount or the benefit name.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function undoLast() {
    if (!lastApplied) return;
    if (lastApplied.kind === 'spend') {
      await updateCard(lastApplied.userCardId, { bonusSpentToDate: lastApplied.prevSpent });
    } else {
      await removeRedemption(lastApplied.redemptionId);
    }
    setLastApplied(null);
    setUndoExpiresAt(0);
  }

  const undoActive = lastApplied != null && nowMs() < undoExpiresAt;

  return (
    <section
      aria-labelledby="quick-update-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2
        id="quick-update-heading"
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
      >
        <Sparkles className="h-3 w-3 text-[var(--color-ph-red)]" aria-hidden />
        Quick update
      </h2>
      <div className="mt-2">
        <VoiceInput
          ariaLabel="Quick update"
          placeholder={'"add 250 to amex" or "used my hotel credit"'}
          onSubmit={handleSubmit}
          disabled={submitting}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {error}
        </div>
      )}

      {undoActive && lastApplied && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 flex-none" aria-hidden />
          <span className="flex-1 truncate">{lastApplied.label}</span>
          <button
            type="button"
            onClick={undoLast}
            className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
