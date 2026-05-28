'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Receipt, Undo2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VoiceInput } from '@/components/voice-input';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { formatCurrency, formatPoints } from '@/lib/format';
import { projectBonusCompletion } from '@/lib/tab3-status';
import { nowMs } from '@/lib/time';

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
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>
      <header className="mt-2 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Update spend</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Speak or type something like &ldquo;Add 250 to the Amex Plat&rdquo; or &ldquo;Spent
        four-thirty on my Velocity card today&rdquo;.
      </p>

      {!loaded && <p className="mt-6 text-sm text-zinc-500">Loading your cards…</p>}

      {loaded && heldCards.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900">
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

          {phase === 'submitting' && <p className="mt-4 text-xs text-zinc-500">Parsing…</p>}

          {phase === 'confirm' &&
            parseResult &&
            parseResult.amount != null &&
            parseResult.cardId && (
              <ConfirmCard
                amount={parseResult.amount}
                userCardId={parseResult.cardId}
                heldCards={heldCards}
                confidence={parseResult.confidence}
                onApply={() => apply(parseResult.cardId!, parseResult.amount!)}
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
              onPick={(id) => apply(id, parseResult.amount!)}
              onCancel={() => {
                setPhase('idle');
                setParseResult(null);
              }}
            />
          )}

          {phase === 'error' && error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
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
            <p className="mt-6 text-[11px] text-zinc-500">
              Preselected from Tab 3 — your phrase will default to this card if unclear.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function ConfirmCard({
  amount,
  userCardId,
  heldCards,
  confidence,
  onApply,
  onCancel,
}: {
  amount: number;
  userCardId: string;
  heldCards: ReturnType<typeof selectUserCardsWithDetails>;
  confidence: 'high' | 'medium' | 'low';
  onApply: () => void;
  onCancel: () => void;
}) {
  const uc = heldCards.find((c) => c.id === userCardId);
  if (!uc) {
    return (
      <p className="mt-4 text-xs text-rose-600">
        Parse picked a card I can&apos;t find. Try again.
      </p>
    );
  }
  const projection = projectBonusCompletion(uc);
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          Add {formatCurrency(amount)} to {uc.card.name}?
        </span>
        <ConfidencePill level={confidence} />
      </div>
      {uc.bonusTarget && (
        <p className="mt-1 text-xs text-emerald-900 dark:text-emerald-200">
          New total: {formatCurrency((uc.bonusSpentToDate ?? 0) + amount)} of{' '}
          {formatCurrency(uc.bonusTarget)}{' '}
          {uc.card.bonusPoints && `· chasing ${formatPoints(uc.card.bonusPoints)} pts`}
        </p>
      )}
      {projection && projection.shortfall - amount <= 0 && (
        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          This update hits your min-spend target.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
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
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium text-amber-900 dark:text-amber-100">
        Which card did you mean for {formatCurrency(amount)}?
      </p>
      <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
        From: &ldquo;{utterance}&rdquo;
      </p>
      <ul className="mt-3 space-y-1.5">
        {heldCards.map((uc) => (
          <li key={uc.id}>
            <button
              type="button"
              onClick={() => onPick(uc.id)}
              className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-xs hover:bg-amber-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="font-medium">{uc.card.name}</span>
              {uc.nickname && <span className="text-zinc-500">aka {uc.nickname}</span>}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
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
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <CheckCircle2
        className="mt-0.5 h-5 w-5 flex-none text-emerald-700 dark:text-emerald-300"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
          Added {formatCurrency(amount)} to {cardName}
        </p>
        {target && (
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200">
            {formatCurrency(newSpent)} of {formatCurrency(target)} —{' '}
            {Math.round((newSpent / target) * 100)}%
          </p>
        )}
        <div className="mt-2 flex gap-3 text-xs">
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            Undo
          </button>
          <button
            type="button"
            onClick={onDone}
            className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-emerald-700/70 dark:text-emerald-300/70"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfidencePill({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cls =
    level === 'high'
      ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
      : level === 'medium'
        ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {level} confidence
    </span>
  );
}
