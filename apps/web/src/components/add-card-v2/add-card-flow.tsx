'use client';

// Unified Add Card flow (PRD §11.2.1, revised).
//
// One progressive screen with three modes:
//   1. Photo step: take photo, upload, or "pick manually"
//   2. Conversation: one Q&A per screen with a running chat history above
//   3. Review + save
//
// Voice is the primary input (VoiceInput is the focused control on every
// step). Typing and tap-to-pick are the fallbacks. PAN/CVV never captured.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { catalogue, useUserCardsStore } from '@/store/user-cards';
import { VoiceInput } from '@/components/voice-input';
import { speak } from '@/lib/speech';
import { todayIsoDate } from '@/lib/time';
import { formatCurrency, formatDate } from '@/lib/format';
import { ChatThread } from './chat-thread';
import { PhotoStep } from './photo-step';
import { CardPickerQuestion } from './card-picker-question';
import type { ChatBubble, CollectedCard } from './types';

type StepId =
  | 'photo'
  | 'confirm_card' // (photo branch) "Is this the right card?"
  | 'pick_card' // (manual branch) "Which card?"
  | 'activation'
  | 'fee_due'
  | 'bonus_received'
  | 'spend_target'
  | 'review';

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

interface AddCardFlowProps {
  /** Called instead of router.push('/') after a successful save. The modal
   *  wrapper uses this to show its own success/Add-another view without
   *  bouncing the user out of the current tab. */
  onSaved?: (savedCardId: string) => void;
  /** Called when the user dismisses via the back affordance. The default
   *  navigates to '/'; the modal wrapper passes its own close-dialog handler. */
  onClose?: () => void;
}

export function AddCardFlow({ onSaved, onClose }: AddCardFlowProps = {}) {
  const router = useRouter();
  const addCard = useUserCardsStore((s) => s.addCard);
  const cards = useMemo(() => catalogue.allCards(), []);

  const [collected, setCollected] = useState<CollectedCard>({
    cardId: null,
    last4: null,
    expiryMonthYear: null,
    activationDate: null,
    annualFeeNextDueDate: null,
    bonusReceived: null,
    bonusTarget: null,
    bonusSpendWindowEndDate: null,
  });
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [step, setStep] = useState<StepId>('photo');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchedCard = useMemo(
    () => (collected.cardId ? (cards.find((c) => c.id === collected.cardId) ?? null) : null),
    [collected.cardId, cards],
  );

  function appendBubble(question: string, answerLabel: string) {
    setBubbles((b) => [...b, { question, answerLabel }]);
  }

  function advance(next: StepId) {
    setStep(next);
    setError(null);
  }

  // ── Step 1 (photo) handlers ──────────────────────────────────────────────

  function handleCaptured(result: {
    matchedCardId: string | null;
    extracted: { last4: string | null; expiryMonthYear: string | null };
  }) {
    setCollected((c) => ({
      ...c,
      cardId: result.matchedCardId ?? c.cardId,
      last4: result.extracted.last4 ?? c.last4,
      expiryMonthYear: result.extracted.expiryMonthYear ?? c.expiryMonthYear,
    }));
    if (result.matchedCardId) {
      const card = cards.find((c) => c.id === result.matchedCardId);
      appendBubble(
        'Snap or upload a photo of the card.',
        `Got it — looks like ${card?.name ?? 'a card I can match'}.`,
      );
      advance('confirm_card');
    } else {
      appendBubble(
        'Snap or upload a photo of the card.',
        "Photo received, but I couldn't pick the card from the catalogue.",
      );
      advance('pick_card');
    }
  }

  function handleManual() {
    appendBubble('Snap or upload a photo of the card.', "I'll pick it manually.");
    advance('pick_card');
  }

  // ── Confirm card (post-OCR) ───────────────────────────────────────────────

  async function handleConfirmCard(utterance: string) {
    const lower = utterance.toLowerCase().trim();
    const isYes = /^(y|yes|yep|yeah|correct|right|that's it|that is it|confirm|ok|sure|good)/.test(
      lower,
    );
    if (isYes) {
      appendBubble(`Is this the right card?`, `Yes — ${matchedCard?.name ?? 'confirmed'}.`);
      advance('activation');
      speakPrompt('When did you activate this card?');
    } else {
      // Treat as a redo — clear the OCR pick and bounce to manual selection.
      appendBubble('Is this the right card?', utterance);
      setCollected((c) => ({ ...c, cardId: null }));
      advance('pick_card');
    }
  }

  function handleConfirmCardYes() {
    appendBubble('Is this the right card?', `Yes — ${matchedCard?.name ?? 'confirmed'}.`);
    advance('activation');
    speakPrompt('When did you activate this card?');
  }
  function handleConfirmCardNo() {
    appendBubble('Is this the right card?', 'No — let me pick it.');
    setCollected((c) => ({ ...c, cardId: null }));
    advance('pick_card');
  }

  // ── Pick card (manual / fallback) ─────────────────────────────────────────

  function handlePickCard(cardId: string, displayLabel: string) {
    setCollected((c) => ({ ...c, cardId }));
    appendBubble('Which card is it?', displayLabel);
    advance('activation');
    speakPrompt('When did you activate this card?');
  }

  // ── Date / yes-no / spend questions ───────────────────────────────────────

  async function handleDate(question: string, answer: string, field: keyof CollectedCard) {
    setPending(true);
    setError(null);
    try {
      const res = await callParse({ kind: 'date', answer });
      const value = res.skip ? null : res.isoDate;
      setCollected((c) => ({ ...c, [field]: value }));
      appendBubble(question, value ? formatDate(value) : 'Skipped');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function handleYesNo(question: string, answer: string) {
    setPending(true);
    setError(null);
    try {
      const res = await callParse({ kind: 'yesno', answer });
      setCollected((c) => ({ ...c, bonusReceived: res.yes }));
      appendBubble(
        question,
        res.yes == null ? 'Skipped' : res.yes ? 'Yes — received it' : 'Not yet',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function handleSpendTarget(question: string, answer: string) {
    setPending(true);
    setError(null);
    try {
      const res = await callParse({ kind: 'spend_target', answer });
      setCollected((c) => ({
        ...c,
        bonusTarget: res.skip ? null : res.amount,
        bonusSpendWindowEndDate: res.skip ? null : res.deadlineIso,
      }));
      appendBubble(
        question,
        res.skip
          ? 'Skipped'
          : `${res.amount != null ? formatCurrency(res.amount) : '—'}${
              res.deadlineIso ? ` by ${formatDate(res.deadlineIso)}` : ''
            }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  // Common pattern: ask a question step. When pending or after a successful
  // append, advance through the queue.
  async function activationAnswered(utterance: string) {
    await handleDate('When did you activate this card?', utterance, 'activationDate');
    advance('fee_due');
    speakPrompt("When's the annual fee next due?");
  }
  async function feeDueAnswered(utterance: string) {
    await handleDate("When's the annual fee next due?", utterance, 'annualFeeNextDueDate');
    advance('bonus_received');
    speakPrompt('Have you received the sign-up bonus yet?');
  }
  async function bonusReceivedAnswered(utterance: string) {
    await handleYesNo('Have you received the sign-up bonus yet?', utterance);
    advance('spend_target');
    speakPrompt('How much do you need to spend and by when for the bonus?');
  }
  async function spendTargetAnswered(utterance: string) {
    await handleSpendTarget('How much do you need to spend and by when for the bonus?', utterance);
    advance('review');
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
      if (onSaved) {
        onSaved(collected.cardId);
        // The modal wrapper takes over from here — clear local state in
        // case it remounts us for an "Add another" cycle.
        setPending(false);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  function back() {
    setError(null);
    // Walk one step back through the conversational sequence.
    const order: StepId[] = [
      'photo',
      'confirm_card',
      'pick_card',
      'activation',
      'fee_due',
      'bonus_received',
      'spend_target',
      'review',
    ];
    const idx = order.indexOf(step);
    if (idx > 0) {
      const prev = order[idx - 1];
      if (prev) {
        setStep(prev);
        setBubbles((b) => b.slice(0, Math.max(0, b.length - 1)));
      }
    }
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add card"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Back to Next Card"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}
      </div>
      <header className="mt-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Add a card</h1>
      </header>

      <div className="mt-4">
        <ChatThread bubbles={bubbles} currentQuestion={questionFor(step, matchedCard?.name)}>
          {renderInput()}
        </ChatThread>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          {error}
        </div>
      )}

      {step !== 'photo' && step !== 'review' && (
        <button
          type="button"
          onClick={back}
          className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 underline-offset-2 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          Back one step
        </button>
      )}
    </main>
  );

  function renderInput() {
    if (step === 'photo') {
      return <PhotoStep onCaptured={handleCaptured} onManual={handleManual} />;
    }
    if (step === 'confirm_card') {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmCardYes}
              className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white"
            >
              Yes, that&apos;s it
            </button>
            <button
              type="button"
              onClick={handleConfirmCardNo}
              className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              No, let me pick
            </button>
          </div>
          <VoiceInput
            ariaLabel="Confirm card"
            placeholder="Say yes / no, or describe the right card…"
            onSubmit={handleConfirmCard}
            disabled={pending}
            hint="Voice tip: just say 'yes' or 'no'."
          />
        </div>
      );
    }
    if (step === 'pick_card') {
      return <CardPickerQuestion cards={cards} onPick={handlePickCard} />;
    }
    if (step === 'activation') {
      return (
        <VoiceInput
          ariaLabel="Activation date"
          placeholder="Say 'three weeks ago', '12 May', or 'skip'…"
          onSubmit={activationAnswered}
          disabled={pending}
          autoFocus
        />
      );
    }
    if (step === 'fee_due') {
      return (
        <VoiceInput
          ariaLabel="Annual fee due date"
          placeholder="Say 'next March', 'in 11 months', or 'skip'…"
          onSubmit={feeDueAnswered}
          disabled={pending}
          autoFocus
        />
      );
    }
    if (step === 'bonus_received') {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => bonusReceivedAnswered('yes')}
              className="flex-1 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white"
              disabled={pending}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => bonusReceivedAnswered('no')}
              className="flex-1 rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              disabled={pending}
            >
              Not yet
            </button>
          </div>
          <VoiceInput
            ariaLabel="Bonus received"
            placeholder="Say 'yep', 'not yet', or 'received last week'…"
            onSubmit={bonusReceivedAnswered}
            disabled={pending}
          />
        </div>
      );
    }
    if (step === 'spend_target') {
      return (
        <VoiceInput
          ariaLabel="Min-spend target and deadline"
          placeholder="Say '$3000 in 90 days', 'skip', or '$5k by end of June'…"
          onSubmit={spendTargetAnswered}
          disabled={pending}
          autoFocus
        />
      );
    }
    // review
    return (
      <ReviewBlock
        collected={collected}
        cardName={matchedCard?.name ?? 'Selected card'}
        pending={pending}
        onSubmit={submit}
      />
    );
  }
}

function ReviewBlock({
  collected,
  cardName,
  pending,
  onSubmit,
}: {
  collected: CollectedCard;
  cardName: string;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="font-semibold">Review {cardName}</p>
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function questionFor(step: StepId, cardName?: string): string | undefined {
  switch (step) {
    case 'photo':
      return undefined; // photo step has its own prompt inside
    case 'confirm_card':
      return cardName ? `Is this the right card — ${cardName}?` : 'Is this the right card?';
    case 'pick_card':
      return 'Which card is it?';
    case 'activation':
      return 'When did you activate this card?';
    case 'fee_due':
      return "When's the annual fee next due?";
    case 'bonus_received':
      return 'Have you received the sign-up bonus yet?';
    case 'spend_target':
      return 'How much do you need to spend and by when for the bonus?';
    case 'review':
      return 'Looks good — tap save to add this card.';
  }
}

function speakPrompt(prompt: string): void {
  speak(prompt);
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
