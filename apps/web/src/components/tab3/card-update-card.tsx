'use client';

// "Card Update" — voice-first inline update affordance on Tab 3. Replaces
// the M2 Quick Update bar.
//
// Layout: a big centred mic button is the primary CTA. Tap to start
// listening; live transcript appears below. Tap again to stop, which
// kicks off the parse. A subtle "or type" expandable affordance opens a
// text input fallback.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mic, MicOff, Pencil, Send, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import { getAllBenefits } from '@ph/shared';
import { selectUserCardsWithDetails, useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionAvailable,
  type SpeechRecognitionInstance,
} from '@/lib/speech';
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

type Phase = 'idle' | 'listening' | 'transcribed' | 'parsing' | 'done' | 'error';

export function CardUpdateCard() {
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

  const supported = isSpeechRecognitionAvailable();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<LastApplied | null>(null);
  const [undoExpiresAt, setUndoExpiresAt] = useState<number>(0);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function startListening() {
    if (heldCards.length === 0) {
      setError('No active cards to update.');
      setPhase('error');
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setShowText(true);
      setError('Voice input isn’t supported in this browser. Use the text option below.');
      setPhase('error');
      return;
    }
    setTranscript('');
    setError(null);
    try {
      const r = new Ctor();
      r.lang = 'en-AU';
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;

      let finalText = '';
      r.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const alt = result[0];
          if (!alt) continue;
          if (result.isFinal) finalText += alt.transcript;
          else interim += alt.transcript;
        }
        setTranscript((finalText + interim).trim());
      };
      r.onerror = (event) => {
        const code = event.error ?? 'unknown';
        setError(
          code === 'not-allowed'
            ? 'Microphone permission denied. Tap the lock icon to allow, or use the text option below.'
            : `Voice input error: ${code}`,
        );
        setPhase('error');
      };
      r.onend = () => {
        setPhase((p) => {
          if (p !== 'listening') return p;
          // If the user got something, advance to transcribed; else back to idle.
          return finalText.trim().length > 0 ? 'transcribed' : 'idle';
        });
      };

      recognitionRef.current = r;
      r.start();
      setPhase('listening');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setPhase((p) => (p === 'listening' && transcript.trim().length > 0 ? 'transcribed' : 'idle'));
  }

  async function submitTranscript(utterance: string) {
    if (!utterance.trim()) return;
    setPhase('parsing');
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
          setPhase('error');
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
        setTranscript('');
        setPhase('done');
      } else if (json.kind === 'benefit' && json.benefitUserCardId && json.benefitId) {
        const uc = heldCards.find((c) => c.id === json.benefitUserCardId);
        const benefit = getAllBenefits().find((b) => b.id === json.benefitId);
        if (!uc || !benefit) {
          setError("Parser picked a benefit I can't find — try again.");
          setPhase('error');
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
        setTranscript('');
        setPhase('done');
      } else {
        setError(
          "Couldn't tell if that was a spend or a benefit. Try again with the amount or the benefit name.",
        );
        setPhase('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
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

  // Big centred mic state visuals.
  const micBusy = phase === 'parsing';
  const micActive = phase === 'listening';

  return (
    <section
      aria-labelledby="card-update-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="flex items-center justify-between">
        <h2 id="card-update-heading" className="text-sm font-semibold">
          Card Update
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Voice
        </span>
      </header>

      {/* Big mic button */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={micActive ? stopListening : startListening}
          disabled={micBusy}
          aria-label={micActive ? 'Stop listening' : 'Speak to update'}
          aria-pressed={micActive}
          className={clsx(
            'relative grid h-24 w-24 place-items-center rounded-full text-white shadow-lg transition-all',
            micActive
              ? 'bg-[var(--color-ph-red-dark)] ring-4 ring-[var(--color-ph-red)]/30'
              : 'bg-[var(--color-ph-red)] hover:scale-105 focus-visible:scale-105',
            micBusy && 'opacity-60',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ph-red)]/40 active:scale-95',
          )}
        >
          {micActive && (
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-[var(--color-ph-red)]/40"
            />
          )}
          {micActive ? (
            <MicOff className="relative h-9 w-9" aria-hidden />
          ) : (
            <Mic className="relative h-9 w-9" aria-hidden />
          )}
        </button>
        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          {micActive
            ? 'Listening… tap to finish'
            : micBusy
              ? 'Working…'
              : 'Tap to update spend or mark a benefit used'}
        </p>
        {!supported && (
          <p className="text-center text-[11px] text-zinc-500">
            Voice not supported in this browser — use the text option below.
          </p>
        )}
      </div>

      {/* Live transcript */}
      {(phase === 'listening' || phase === 'transcribed' || phase === 'parsing') &&
        transcript.length > 0 && (
          <div className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-950/40">
            &ldquo;{transcript}&rdquo;
          </div>
        )}

      {/* Submit / Edit when we have a transcript */}
      {phase === 'transcribed' && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => submitTranscript(transcript)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-ph-red)] px-3 py-2 text-sm font-medium text-white"
          >
            <Send className="h-4 w-4" aria-hidden />
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setShowText(true);
              setPhase('idle');
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </button>
        </div>
      )}

      {/* Subtle text fallback */}
      <details
        className="mt-3"
        open={showText}
        onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-center text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          or type
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitTranscript(transcript);
          }}
          className="mt-2 flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-950"
        >
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={'"add 250 to amex" or "used my hotel credit"'}
            aria-label="Card update phrase"
            className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!transcript.trim() || phase === 'parsing'}
            aria-label="Send"
            className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </details>

      {/* Error */}
      {error && phase === 'error' && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          <div className="flex-1">
            {error}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase('idle');
              }}
              className="ml-2 underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Undo */}
      {undoActive && lastApplied && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
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
