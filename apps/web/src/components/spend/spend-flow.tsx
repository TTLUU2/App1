'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Receipt, Undo2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VoiceInput } from '@/components/voice-input';
import { SpendGovCheck } from '@/components/spend/spend-gov-check';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { formatCurrency } from '@/lib/format';
import { nowMs } from '@/lib/time';
import { cancelSpeech, speak } from '@/lib/tts';

/**
 * PRD §11.3 — Update Card Spend. Voice/text input pane, server-side parsing
 * via /api/parse/spend, disambiguation prompt when the parse is ambiguous,
 * 30-second Undo on the resulting bonusSpentToDate write.
 */

interface PendingApply {
  userCardId: string;
  cardName: string;
  prevSpent: number;
  newSpent: number;
  amount: number;
}

export function SpendFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('card');
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  const updateCard = useUserCardsStore((s) => s.updateCard);

  const heldCards = useMemo(() => {
    const all = selectUserCardsWithDetails({ userCards, loaded, error: null } as never);
    return all.filter((c) => !c.cancellationDate);
  }, [userCards, loaded]);

  // NO screen-mount greeting. Per user feedback, the spoken greeting should
  // only fire on Tab 3 (Optimisation) — that's the home Copilot surface.
  // /spend is reached via the FAB sub-action from any tab; surprise audio
  // when changing surfaces is jarring. Voice is reactive here: speak only
  // in response to user actions (the parse result, etc.).

  // Local UX state machine: idle → submitting → (confirm | disambiguate | error)
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'confirm' | 'disambiguate' | 'error'>(
    'idle',
  );
  const [parseResult, setParseResult] = useState<{
    amount: number | null;
    cardId: string | null;
    confidence: 'high' | 'medium' | 'low';
    utterance: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<PendingApply | null>(null);
  const [undoExpiresAt, setUndoExpiresAt] = useState<number>(0);

  async function submitUtterance(utterance: string) {
    setPhase('submitting');
    setError(null);
    if (heldCards.length === 0) {
      setError('No held cards to log spend against. Add one first.');
      setPhase('error');
      return;
    }
    try {
      const res = await fetch('/api/parse/spend', {
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
        }),
      });
      const json = (await res.json()) as
        | { amount: number | null; cardId: string | null; confidence: 'high' | 'medium' | 'low' }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'Parse failed');
      }
      setParseResult({ ...json, utterance });
      if (json.amount == null) {
        setError("Couldn't pick out a dollar amount. Try again with a number.");
        setPhase('error');
        return;
      }
      if (json.cardId == null) {
        setPhase('disambiguate');
        return;
      }
      setPhase('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  async function apply(userCardId: string, amount: number) {
    const uc = heldCards.find((c) => c.id === userCardId);
    if (!uc) return;
    const prevSpent = uc.bonusSpentToDate ?? 0;
    const newSpent = prevSpent + amount;
    await updateCard(uc.id, { bonusSpentToDate: newSpent });
    setLastApplied({
      userCardId,
      cardName: uc.card.name,
      prevSpent,
      newSpent,
      amount,
    });
    setUndoExpiresAt(nowMs() + 30_000);
    setPhase('idle');
    setParseResult(null);
  }

  async function undoLast() {
    if (!lastApplied) return;
    await updateCard(lastApplied.userCardId, { bonusSpentToDate: lastApplied.prevSpent });
    setLastApplied(null);
    setUndoExpiresAt(0);
  }

  const undoActive = lastApplied != null && nowMs() < undoExpiresAt;

  return (
    <main className="min-h-dvh bg-ph-paper px-6 pt-6 pb-32 text-ph-text">
      <div className="flex items-center">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-ph-text-muted hover:bg-ph-fill-warm hover:text-ph-text"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>
      <header className="mt-3 flex items-center gap-2">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
          <Receipt className="h-4 w-4" aria-hidden />
        </span>
        <h1 className="font-serif text-[24px] leading-none text-ph-ink">Update spend</h1>
      </header>
      <p className="mt-2 text-[13px] leading-snug text-ph-text-muted">
        Speak or type something like &ldquo;Add 250 to the Amex Plat&rdquo; or &ldquo;Spent
        four-thirty on my Velocity card today&rdquo;.
      </p>

      {!loaded && <p className="mt-6 text-sm text-ph-text-meta">Loading your cards…</p>}

      {loaded && heldCards.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-ph-border-strong bg-ph-card p-4 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900">
          You don&apos;t have any active cards yet. Add one via the FAB.
        </div>
      )}

      {loaded && heldCards.length > 0 && (
        <>
          <div className="mt-4">
            <VoiceInput
              ariaLabel="Spend update"
              placeholder="Add $250 to my Amex…"
              onSubmit={submitUtterance}
              disabled={phase === 'submitting'}
              hint="We send your phrase to Claude to extract the amount and card. PAN/CVV never leave the device."
              autoFocus
            />
          </div>

          {phase === 'submitting' && <p className="mt-4 text-xs text-ph-text-meta">Parsing…</p>}

          {phase === 'confirm' &&
            parseResult &&
            parseResult.amount != null &&
            parseResult.cardId && (
              <SpendGovCheck
                amount={parseResult.amount}
                cardName={
                  heldCards.find((c) => c.id === parseResult.cardId)?.card.name ?? 'this card'
                }
                onConfirm={(adjusted) => apply(parseResult.cardId!, adjusted)}
                onCancel={() => {
                  setPhase('idle');
                  setParseResult(null);
                }}
              />
            )}

          {phase === 'disambiguate' && parseResult?.amount != null && (
            <DisambiguateCard
              amount={parseResult.amount}
              utterance={parseResult.utterance}
              heldCards={heldCards}
              onPick={(id) => {
                setParseResult((r) => (r ? { ...r, cardId: id } : r));
                setPhase('confirm');
              }}
              onCancel={() => {
                setPhase('idle');
                setParseResult(null);
              }}
            />
          )}

          {phase === 'error' && error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-ph-negative-chip bg-ph-negative-chip p-3 text-xs text-ph-ink dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
              <div>
                {error}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPhase('idle');
                  }}
                  className="ml-2 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {undoActive && lastApplied && (
            <UndoToast
              cardName={lastApplied.cardName}
              amount={lastApplied.amount}
              newSpent={lastApplied.newSpent}
              userCardId={lastApplied.userCardId}
              heldCards={heldCards}
              onUndo={undoLast}
              onDismiss={() => {
                setLastApplied(null);
                setUndoExpiresAt(0);
              }}
              onDone={() => router.push('/optimisation')}
            />
          )}

          {preselectedId && (
            <p className="mt-6 text-[11px] text-ph-text-meta">
              Preselected from Tab 3 — your phrase will default to this card if unclear.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function DisambiguateCard({
  amount,
  utterance,
  heldCards,
  onPick,
  onCancel,
}: {
  amount: number;
  utterance: string;
  heldCards: ReturnType<typeof selectUserCardsWithDetails>;
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-ph-amber-chip bg-ph-amber-chip p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium text-ph-amber-text dark:text-amber-100">
        Which card did you mean for {formatCurrency(amount)}?
      </p>
      <p className="mt-0.5 text-xs text-ph-amber-text dark:text-amber-200">
        From: &ldquo;{utterance}&rdquo;
      </p>
      <ul className="mt-3 space-y-1.5">
        {heldCards.map((uc) => (
          <li key={uc.id}>
            <button
              type="button"
              onClick={() => onPick(uc.id)}
              className="flex w-full items-center justify-between rounded-lg bg-ph-card px-3 py-2 text-xs hover:bg-ph-fill-warm dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="font-medium">{uc.card.name}</span>
              {uc.nickname && <span className="text-ph-text-meta">aka {uc.nickname}</span>}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full rounded-full border border-ph-border-strong px-3 py-2 text-xs font-medium text-ph-text dark:border-zinc-700 dark:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}

function UndoToast({
  cardName,
  amount,
  newSpent,
  userCardId,
  heldCards,
  onUndo,
  onDismiss,
  onDone,
}: {
  cardName: string;
  amount: number;
  newSpent: number;
  userCardId: string;
  heldCards: ReturnType<typeof selectUserCardsWithDetails>;
  onUndo: () => void;
  onDismiss: () => void;
  onDone: () => void;
}) {
  const uc = heldCards.find((c) => c.id === userCardId);
  const target = uc?.bonusTarget ?? null;
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-ph-pine-chip bg-ph-pine-chip p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <CheckCircle2
        className="mt-0.5 h-5 w-5 flex-none text-ph-pine dark:text-emerald-300"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ph-pine-text dark:text-emerald-100">
          Added {formatCurrency(amount)} to {cardName}
        </p>
        {target && (
          <p className="mt-0.5 text-xs text-ph-pine dark:text-emerald-200">
            {formatCurrency(newSpent)} of {formatCurrency(target)} —{' '}
            {Math.round((newSpent / target) * 100)}%
          </p>
        )}
        <div className="mt-2 flex gap-3 text-xs">
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 font-medium text-ph-pine underline-offset-2 hover:underline dark:text-emerald-200"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            Undo
          </button>
          <button
            type="button"
            onClick={onDone}
            className="font-medium text-ph-pine underline-offset-2 hover:underline dark:text-emerald-200"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-ph-pine/70 dark:text-emerald-300/70"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
