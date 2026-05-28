'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Mic, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { getAllBenefits } from '@ph/shared';
import { VoiceInput } from '@/components/voice-input';
import {
  selectRecommendations,
  selectUserCardsWithDetails,
  useUserCardsStore,
} from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { buildAskContext } from '@/lib/ask-context';
import { isSpeechSynthesisAvailable, speak } from '@/lib/speech';
import { todayIsoDate } from '@/lib/time';

interface Turn {
  question: string;
  answer: string;
  inScope: boolean;
}

export function AskFlow() {
  const loaded = useUserCardsStore((s) => s.loaded);
  const userCards = useUserCardsStore((s) => s.userCards);
  const redemptions = useUserBenefitsStore((s) => s.redemptions);

  const benefits = useMemo(() => getAllBenefits(), []);
  const allCards = useMemo(
    () => selectUserCardsWithDetails({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );
  const recommendations = useMemo(
    () => selectRecommendations({ userCards, loaded, error: null } as never),
    [userCards, loaded],
  );

  const heldCards = useMemo(() => allCards.filter((c) => !c.cancellationDate), [allCards]);
  const cancelledCards = useMemo(() => allCards.filter((c) => c.cancellationDate), [allCards]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakOutput, setSpeakOutput] = useState<boolean>(isSpeechSynthesisAvailable());

  async function ask(question: string) {
    setPending(true);
    setError(null);
    const context = buildAskContext({
      heldCards,
      cancelledCards,
      recommendations,
      benefits,
      redemptions,
      today: todayIsoDate(),
    });
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });
      const json = (await res.json()) as { answer: string; inScope: boolean } | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'Ask failed');
      }
      setTurns((t) => [...t, { question, answer: json.answer, inScope: json.inScope }]);
      if (speakOutput) speak(json.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        {isSpeechSynthesisAvailable() && (
          <button
            type="button"
            onClick={() => setSpeakOutput((v) => !v)}
            aria-pressed={speakOutput}
            aria-label={speakOutput ? 'Mute spoken answers' : 'Speak answers'}
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {speakOutput ? (
              <Volume2 className="h-4 w-4" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <header className="mt-2 flex items-center gap-2">
        <Mic className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Ask Copilot</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Read-only. I can answer about your min-spend, benefits, eligibility, fees, and
        recommendations.
      </p>

      <ul className="mt-4 space-y-3">
        {turns.map((t, i) => (
          <li key={i} className="space-y-1.5">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-800">
              {t.question}
            </div>
            <div
              className={
                t.inScope
                  ? 'mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
              }
            >
              {t.answer}
            </div>
          </li>
        ))}
      </ul>

      {pending && <p className="mt-3 text-xs text-zinc-500">Thinking…</p>}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4">
        <VoiceInput
          ariaLabel="Ask Copilot"
          placeholder="How close am I to my Amex min-spend?"
          onSubmit={ask}
          disabled={pending}
          hint="Examples: 'When does my Westpac fee hit?', 'Which benefits expire this month?', 'Best card I can apply for right now?'"
          autoFocus
        />
      </div>
    </main>
  );
}
