'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Sparkles, CheckCircle2, AlertTriangle, Undo2 } from 'lucide-react';
import { getAllBenefits } from '@ph/shared';
import { VoiceInput } from '@/components/voice-input';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { cancelSpeech, speak } from '@/lib/tts';

export function BenefitsFlow() {
  const router = useRouter();
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  const markUsed = useUserBenefitsStore((s) => s.markUsed);
  const removeRedemption = useUserBenefitsStore((s) => s.removeRedemption);

  const heldCards = useMemo(
    () =>
      selectUserCardsWithDetails({ userCards, loaded, error: null } as never).filter(
        (c) => !c.cancellationDate,
      ),
    [userCards, loaded],
  );

  const benefitOptions = useMemo(() => {
    const allBenefits = getAllBenefits();
    const out: {
      userCardId: string;
      benefitId: string;
      cardName: string;
      benefitName: string;
    }[] = [];
    for (const uc of heldCards) {
      for (const b of allBenefits.filter((x) => x.cardId === uc.cardId)) {
        out.push({
          userCardId: uc.id,
          benefitId: b.id,
          cardName: uc.card.name,
          benefitName: b.name,
        });
      }
    }
    return out;
  }, [heldCards]);

  // NO screen-mount greeting. Per user feedback, the spoken greeting
  // should only fire on Tab 3 (Optimisation) — that's the home Copilot
  // surface. /benefits is reached via the FAB sub-action from any tab;
  // surprise audio when changing surfaces is jarring. Voice is reactive
  // here: speak only in response to user actions.

  const [phase, setPhase] = useState<'idle' | 'submitting' | 'confirm' | 'disambiguate' | 'error'>(
    'idle',
  );
  const [parseResult, setParseResult] = useState<{
    userCardId: string | null;
    benefitId: string | null;
    confidence: 'high' | 'medium' | 'low';
    utterance: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<{
    redemptionId: string;
    label: string;
  } | null>(null);

  async function submitUtterance(utterance: string) {
    setPhase('submitting');
    setError(null);
    if (benefitOptions.length === 0) {
      setError('No benefits on any of your held cards.');
      setPhase('error');
      return;
    }
    try {
      const res = await fetch('/api/parse/benefit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance, benefits: benefitOptions }),
      });
      const json = (await res.json()) as
        | {
            userCardId: string | null;
            benefitId: string | null;
            confidence: 'high' | 'medium' | 'low';
          }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'Parse failed');
      }
      setParseResult({ ...json, utterance });
      if (!json.userCardId || !json.benefitId) {
        setPhase('disambiguate');
        return;
      }
      setPhase('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  async function apply(userCardId: string, benefitId: string) {
    const uc = heldCards.find((c) => c.id === userCardId);
    const benefit = getAllBenefits().find((b) => b.id === benefitId);
    if (!uc || !benefit) return;
    const record = await markUsed({
      userCardId: uc.id,
      benefit,
      activationDate: uc.activationDate ?? uc.applicationDate,
    });
    setLastApplied({
      redemptionId: record.id,
      label: `${benefit.name} on ${uc.card.name}`,
    });
    setPhase('idle');
    setParseResult(null);
  }

  async function undoLast() {
    if (!lastApplied) return;
    await removeRedemption(lastApplied.redemptionId);
    setLastApplied(null);
  }

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
        <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Mark benefit used</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Speak or type something like &ldquo;Used my Amex hotel credit&rdquo; or &ldquo;Burned my
        $400 travel credit on the Plat&rdquo;.
      </p>

      {loaded && benefitOptions.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900">
          Your held cards have no tracked benefits in the catalogue.
        </div>
      )}

      {loaded && benefitOptions.length > 0 && (
        <div className="mt-4">
          <VoiceInput
            ariaLabel="Benefit used"
            placeholder="Used my Amex hotel credit…"
            onSubmit={submitUtterance}
            disabled={phase === 'submitting'}
            hint="Claude interprets the phrase and maps it to a specific benefit + held card."
            autoFocus
          />
        </div>
      )}

      {phase === 'submitting' && <p className="mt-4 text-xs text-zinc-500">Parsing…</p>}

      {phase === 'confirm' && parseResult?.userCardId && parseResult.benefitId && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-semibold">
            {benefitLabel(parseResult.userCardId, parseResult.benefitId, heldCards)}
          </p>
          <p className="mt-1 text-xs text-emerald-900 dark:text-emerald-200">
            Mark as used for the current period?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => apply(parseResult.userCardId!, parseResult.benefitId!)}
              className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPhase('disambiguate')}
              className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Pick another
            </button>
          </div>
        </div>
      )}

      {phase === 'disambiguate' && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Which benefit did you mean?
          </p>
          {parseResult?.utterance && (
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
              From: &ldquo;{parseResult.utterance}&rdquo;
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {benefitOptions.map((b) => (
              <li key={`${b.userCardId}:${b.benefitId}`}>
                <button
                  type="button"
                  onClick={() => apply(b.userCardId, b.benefitId)}
                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-xs hover:bg-amber-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <span className="font-medium">{b.benefitName}</span>
                  <span className="text-zinc-500">{b.cardName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
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

      {lastApplied && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 flex-none text-emerald-700 dark:text-emerald-300"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Marked used: {lastApplied.label}
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={undoLast}
                className="inline-flex items-center gap-1 font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              >
                <Undo2 className="h-3 w-3" aria-hidden />
                Undo
              </button>
              <button
                type="button"
                onClick={() => router.push('/optimisation')}
                className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              >
                See on Tab 3
              </button>
              <button
                type="button"
                onClick={() => setLastApplied(null)}
                className="ml-auto text-emerald-700/70 dark:text-emerald-300/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function benefitLabel(
  userCardId: string,
  benefitId: string,
  heldCards: ReturnType<typeof selectUserCardsWithDetails>,
): string {
  const uc = heldCards.find((c) => c.id === userCardId);
  const benefit = getAllBenefits().find((b) => b.id === benefitId);
  if (!uc || !benefit) return 'Mark benefit used';
  return `${benefit.name} on ${uc.card.name}`;
}
