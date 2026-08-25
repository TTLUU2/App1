'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { getAllBenefits } from '@ph/shared';
import { VoiceInput } from '@/components/voice-input';
import { PerryAvatar } from '@/components/lacquer';
import {
  selectRecommendations,
  selectUserCardsWithDetails,
  useUserCardsStore,
} from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { buildAskContext } from '@/lib/ask-context';
import { isSpeechSynthesisAvailable } from '@/lib/speech';
import { cancelSpeech, speak } from '@/lib/tts';
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
  // Copilot answers should respect the same preferences as Tab 4 — no point
  // recommending an Amex Business when the user has set 'personal only'.
  const preferences = useUserPreferencesStore((s) => s.preferences);
  const recommendations = useMemo(
    () => selectRecommendations({ userCards, loaded, error: null } as never, preferences),
    [userCards, loaded, preferences],
  );

  const heldCards = useMemo(() => allCards.filter((c) => !c.cancellationDate), [allCards]);
  const cancelledCards = useMemo(() => allCards.filter((c) => c.cancellationDate), [allCards]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakOutput, setSpeakOutput] = useState<boolean>(isSpeechSynthesisAvailable());

  // Two seed paths pick up handoffs from the /today Copilot bar:
  //
  //   1. Legacy `{question, answer}` — the pre-Lacquer home Copilot
  //      had an inline mini-chat that computed the answer on Home;
  //      "Continue in chat" stashed both so the conversation appeared
  //      to continue rather than starting over.
  //   2. `{question, autoSubmit: true}` — new /today CopilotBar
  //      captures voice on Home, hands off the question only, /ask
  //      calls ask() on mount to fetch the answer.
  //
  //   3. Fallback: ?q=… URL param — private-mode Safari can't write
  //      to sessionStorage, so the CopilotBar also passes the
  //      question in the URL. Only used when sessionStorage is empty.
  //
  // NO auto-greeting on this page. Per user feedback, the spoken
  // greeting should only fire when landing on Tab 3 (Optimisation)
  // — surprise audio when you change tabs is jarring.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    let seedQuestion: string | null = null;
    let seedAutoSubmit = false;
    try {
      const raw = sessionStorage.getItem('ph:ask-seed');
      if (raw) {
        const seed = JSON.parse(raw) as {
          question?: string;
          answer?: string;
          autoSubmit?: boolean;
        };
        if (seed.question && seed.answer) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from sessionStorage (external system) guarded by seededRef; no cascade.
          setTurns([{ question: seed.question, answer: seed.answer, inScope: true }]);
        } else if (seed.question && seed.autoSubmit) {
          seedQuestion = seed.question;
          seedAutoSubmit = true;
        }
        sessionStorage.removeItem('ph:ask-seed');
      }
    } catch {
      /* malformed seed — ignore */
    }
    // URL fallback for private-mode Safari or a direct link.
    if (!seedQuestion) {
      try {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) {
          seedQuestion = q;
          seedAutoSubmit = true;
        }
      } catch {
        /* unavailable */
      }
    }
    if (seedQuestion && seedAutoSubmit) {
      void ask(seedQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ask reads store snapshots; mount-only fire.
  }, []);

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
      if (speakOutput) void speak(json.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-dvh bg-ph-paper px-6 pt-6 pb-32 text-ph-text">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-ph-text-muted hover:bg-ph-fill-warm hover:text-ph-text"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        {isSpeechSynthesisAvailable() && (
          <button
            type="button"
            onClick={() => setSpeakOutput((v) => !v)}
            aria-pressed={speakOutput}
            aria-label={speakOutput ? 'Mute spoken answers' : 'Speak answers'}
            className="grid h-9 w-9 place-items-center rounded-full text-ph-text-muted hover:bg-ph-fill-warm dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {speakOutput ? (
              <Volume2 className="h-4 w-4" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <header className="mt-3 flex items-center gap-2.5">
        {/* Perry as the header mark — replaces the Mic-in-circle from the
            initial Lacquer pass. Now that PerryFAB no longer hovers on
            every screen, this is where Perry is anchored: on the chat
            surface where he actually 'speaks'. Uses the 46px celebration
            disc size for a bit of hero weight. */}
        <PerryAvatar size={46} />
        <h1 className="font-serif text-[24px] leading-none text-ph-ink">Ask Copilot</h1>
      </header>
      <p className="mt-2 text-[13px] leading-snug text-ph-text-muted">
        Read-only. I can answer about your min-spend, benefits, eligibility, fees, and
        recommendations.
      </p>

      <ul className="mt-4 space-y-3">
        {turns.map((t, i) => (
          <li key={i} className="space-y-1.5">
            {/* User question — right-aligned, no avatar (their voice is
                implicit). */}
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-ph-fill px-3 py-2 text-sm dark:bg-zinc-800">
              {t.question}
            </div>
            {/* Copilot answer — left-aligned, PerryAvatar to the left of
                the bubble so Perry visibly 'speaks' each reply. items-end
                anchors the avatar to the bottom of the bubble like a
                classic chat UI. */}
            <div className="mr-auto flex max-w-[85%] items-end gap-2">
              <PerryAvatar size={26} className="mb-0.5 flex-none" />
              <div
                className={
                  t.inScope
                    ? 'rounded-2xl rounded-tl-sm bg-ph-pine-chip px-3 py-2 text-sm text-ph-pine-text dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'rounded-2xl rounded-tl-sm bg-ph-amber-chip px-3 py-2 text-sm text-ph-amber-text dark:bg-amber-950/40 dark:text-amber-100'
                }
              >
                {t.answer}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pending && <p className="mt-3 text-xs text-ph-text-meta">Thinking…</p>}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-ph-negative-chip bg-ph-negative-chip p-3 text-xs text-ph-ink dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
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
