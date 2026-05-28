'use client';

// Post-OCR conversational card onboarding (PRD §11.2.1).
//
// Reads the OCR prefill stashed in sessionStorage by /scan (matched card +
// optional last4 / expiry), then walks the user through a short Q&A:
//   Q1 activation date
//   Q2 annual fee next due
//   Q3 bonus received yet?
//   Q4 min-spend target + deadline (combined)
//
// Each answer is sent to /api/onboard/parse for natural-language
// interpretation. The final submit creates the UserCard with all collected
// fields and routes to Tab 4. Users can skip any step.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { catalogue, useUserCardsStore } from '@/store/user-cards';
import { readPendingPrefill } from '@/components/scan/scan-flow';
import { VoiceInput } from '@/components/voice-input';
import { speak } from '@/lib/speech';
import { todayIsoDate } from '@/lib/time';
import { formatCurrency, formatDate } from '@/lib/format';

type StepId = 'activation' | 'fee_due' | 'bonus_received' | 'spend_target' | 'review';

interface Collected {
  cardId: string | null;
  last4: string | null;
  expiryMonthYear: string | null;
  activationDate: string | null;
  annualFeeNextDueDate: string | null;
  bonusReceived: boolean | null;
  bonusTarget: number | null;
  bonusSpendWindowEndDate: string | null;
}

const STEPS: StepId[] = ['activation', 'fee_due', 'bonus_received', 'spend_target', 'review'];

export function OnboardFlow() {
  const router = useRouter();
  const addCard = useUserCardsStore((s) => s.addCard);

  // Drain the OCR prefill once on mount (lazy initializer keeps render pure).
  const prefill = useMemo(() => readPendingPrefill(), []);
  const cards = useMemo(() => catalogue.allCards(), []);
  const matchedCard = useMemo(
    () => cards.find((c) => c.id === prefill?.cardId) ?? null,
    [cards, prefill?.cardId],
  );

  const [collected, setCollected] = useState<Collected>({
    cardId: prefill?.cardId ?? null,
    last4: prefill?.last4 ?? null,
    expiryMonthYear: prefill?.expiryMonthYear ?? null,
    activationDate: null,
    annualFeeNextDueDate: null,
    bonusReceived: null,
    bonusTarget: null,
    bonusSpendWindowEndDate: null,
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceAnnouncedStep, setVoiceAnnouncedStep] = useState<StepId | null>(null);

  // No card matched → bail out to the manual form so we don't waste the user's time.
  if (!matchedCard) {
    return (
      <main className="flex-1 px-4 pb-6 pt-2">
        <BackLink />
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium">No card prefill available.</p>
          <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
            Open this flow via the FAB → Scan card. For a manual add, use{' '}
            <Link href="/add-card" className="underline">
              the form
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  const step = STEPS[stepIdx];
  const cardLabel = matchedCard.name;

  function maybeSpeakPrompt(id: StepId, prompt: string) {
    if (voiceAnnouncedStep === id) return;
    speak(prompt);
    setVoiceAnnouncedStep(id);
  }

  async function handleAnswer(answer: string) {
    if (!step || step === 'review') return;
    setPending(true);
    setError(null);
    try {
      switch (step) {
        case 'activation': {
          const r = await callParse({ kind: 'date', answer });
          if (r.skip || !r.isoDate) advanceWithPatch({ activationDate: null });
          else advanceWithPatch({ activationDate: r.isoDate });
          break;
        }
        case 'fee_due': {
          const r = await callParse({ kind: 'date', answer });
          if (r.skip || !r.isoDate) advanceWithPatch({ annualFeeNextDueDate: null });
          else advanceWithPatch({ annualFeeNextDueDate: r.isoDate });
          break;
        }
        case 'bonus_received': {
          const r = await callParse({ kind: 'yesno', answer });
          advanceWithPatch({ bonusReceived: r.yes });
          break;
        }
        case 'spend_target': {
          const r = await callParse({ kind: 'spend_target', answer });
          if (r.skip) advanceWithPatch({ bonusTarget: null, bonusSpendWindowEndDate: null });
          else
            advanceWithPatch({
              bonusTarget: r.amount,
              bonusSpendWindowEndDate: r.deadlineIso,
            });
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  function advanceWithPatch(patch: Partial<Collected>) {
    setCollected((c) => ({ ...c, ...patch }));
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  }

  function back() {
    setStepIdx((i) => Math.max(0, i - 1));
    setError(null);
  }

  async function submit() {
    if (!collected.cardId) return;
    setPending(true);
    try {
      await addCard({
        cardId: collected.cardId,
        applicationDate: collected.activationDate ?? todayIsoDate(),
        bonusReceived: collected.bonusReceived ?? false,
        last4: collected.last4,
        expiryMonthYear: collected.expiryMonthYear,
        activationDate: collected.activationDate,
        annualFeeNextDueDate: collected.annualFeeNextDueDate,
        bonusTarget: collected.bonusTarget,
        bonusSpendWindowEndDate: collected.bonusSpendWindowEndDate,
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <BackLink />
      <header className="mt-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Confirm your card</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Got it — <span className="font-medium">{cardLabel}</span>. Quick Q&amp;A so eligibility +
        spend tracking work properly.
      </p>

      <Stepper currentIdx={stepIdx} />

      {step === 'activation' && (
        <Step
          prompt={`When did you activate this ${cardLabel}?`}
          examples="Try: 'three weeks ago', '12 May', 'last March', or 'skip'."
          ariaLabel="Activation date"
          onSubmit={handleAnswer}
          pending={pending}
          autoSpeak={(p) => maybeSpeakPrompt('activation', p)}
        />
      )}

      {step === 'fee_due' && (
        <Step
          prompt="When is the annual fee next due? (or 'skip')"
          examples="Try: '12 months from activation', 'next March', 'skip'."
          ariaLabel="Annual fee due date"
          onSubmit={handleAnswer}
          pending={pending}
          autoSpeak={(p) => maybeSpeakPrompt('fee_due', p)}
        />
      )}

      {step === 'bonus_received' && (
        <Step
          prompt="Have you received the sign-up bonus yet?"
          examples="Try: 'yep', 'not yet', 'got it last week'."
          ariaLabel="Bonus received"
          onSubmit={handleAnswer}
          pending={pending}
          autoSpeak={(p) => maybeSpeakPrompt('bonus_received', p)}
        />
      )}

      {step === 'spend_target' && (
        <Step
          prompt="How much do you need to spend and by when for the bonus?"
          examples="Try: '$3000 in 90 days', 'five grand by end of June', 'skip'."
          ariaLabel="Min-spend target"
          onSubmit={handleAnswer}
          pending={pending}
          autoSpeak={(p) => maybeSpeakPrompt('spend_target', p)}
        />
      )}

      {step === 'review' && (
        <Review collected={collected} cardLabel={cardLabel} onSubmit={submit} pending={pending} />
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          {error}
        </div>
      )}

      {stepIdx > 0 && step !== 'review' && (
        <button
          type="button"
          onClick={back}
          className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 underline-offset-2 hover:underline"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Back to previous question
        </button>
      )}
    </main>
  );
}

function Step({
  prompt,
  examples,
  ariaLabel,
  onSubmit,
  pending,
  autoSpeak,
}: {
  prompt: string;
  examples: string;
  ariaLabel: string;
  onSubmit: (text: string) => void | Promise<void>;
  pending: boolean;
  autoSpeak: (prompt: string) => void;
}) {
  // Speak the prompt once when the step mounts (no-op on mute / unsupported).
  autoSpeak(prompt);
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">{prompt}</p>
      <p className="mt-1 text-xs text-zinc-500">{examples}</p>
      <div className="mt-3">
        <VoiceInput
          ariaLabel={ariaLabel}
          placeholder="Speak or type…"
          onSubmit={onSubmit}
          disabled={pending}
          autoFocus
        />
      </div>
    </div>
  );
}

function Review({
  collected,
  cardLabel,
  onSubmit,
  pending,
}: {
  collected: Collected;
  cardLabel: string;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="font-semibold">Review {cardLabel}</p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-emerald-900/70 dark:text-emerald-200/70">Activation</dt>
        <dd className="text-right">
          {collected.activationDate ? formatDate(collected.activationDate) : '—'}
        </dd>
        <dt className="text-emerald-900/70 dark:text-emerald-200/70">Annual fee due</dt>
        <dd className="text-right">
          {collected.annualFeeNextDueDate ? formatDate(collected.annualFeeNextDueDate) : '—'}
        </dd>
        <dt className="text-emerald-900/70 dark:text-emerald-200/70">Bonus received</dt>
        <dd className="text-right">
          {collected.bonusReceived == null ? '—' : collected.bonusReceived ? 'Yes' : 'Not yet'}
        </dd>
        <dt className="text-emerald-900/70 dark:text-emerald-200/70">Min-spend target</dt>
        <dd className="text-right">
          {collected.bonusTarget ? formatCurrency(collected.bonusTarget) : '—'}
        </dd>
        <dt className="text-emerald-900/70 dark:text-emerald-200/70">Spend by</dt>
        <dd className="text-right">
          {collected.bonusSpendWindowEndDate ? formatDate(collected.bonusSpendWindowEndDate) : '—'}
        </dd>
        {collected.last4 && (
          <>
            <dt className="text-emerald-900/70 dark:text-emerald-200/70">Last 4</dt>
            <dd className="text-right">•••• {collected.last4}</dd>
          </>
        )}
        {collected.expiryMonthYear && (
          <>
            <dt className="text-emerald-900/70 dark:text-emerald-200/70">Expiry</dt>
            <dd className="text-right">{collected.expiryMonthYear}</dd>
          </>
        )}
      </dl>
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        {pending ? 'Saving…' : 'Save card'}
      </button>
    </div>
  );
}

function Stepper({ currentIdx }: { currentIdx: number }) {
  // Only show progress dots for the question steps (not the review).
  const total = STEPS.length - 1;
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < currentIdx
              ? 'w-6 bg-[var(--color-ph-red)]'
              : i === currentIdx
                ? 'w-4 bg-[var(--color-ph-red)]'
                : 'w-2 bg-zinc-300 dark:bg-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

function BackLink() {
  return (
    <div className="flex items-center">
      <Link
        href="/"
        aria-label="Back"
        className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>
    </div>
  );
}

interface ParseDateResp {
  isoDate: string | null;
  skip: boolean;
}
interface ParseYesNoResp {
  yes: boolean | null;
}
interface ParseSpendResp {
  amount: number | null;
  deadlineIso: string | null;
  skip: boolean;
}

async function callParse(args: { kind: 'date'; answer: string }): Promise<ParseDateResp>;
async function callParse(args: { kind: 'yesno'; answer: string }): Promise<ParseYesNoResp>;
async function callParse(args: { kind: 'spend_target'; answer: string }): Promise<ParseSpendResp>;
async function callParse(args: { kind: string; answer: string }): Promise<unknown> {
  const res = await fetch('/api/onboard/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...args, today: todayIsoDate() }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Parse failed');
  }
  return json;
}
