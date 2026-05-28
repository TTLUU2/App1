'use client';

// "Which card?" answered by either voice (Claude fuzzy matches the spoken
// name against the catalogue), tap-to-pick from a grouped list, or both.

import { useMemo, useState } from 'react';
import type { CardWithIssuer } from '@ph/shared';
import { VoiceInput } from '@/components/voice-input';

export function CardPickerQuestion({
  cards,
  onPick,
}: {
  cards: CardWithIssuer[];
  onPick: (cardId: string, displayLabel: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CardWithIssuer[]>();
    for (const c of cards) {
      const list = map.get(c.issuer.name) ?? [];
      list.push(c);
      map.set(c.issuer.name, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  const [submitting, setSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  async function handleVoice(utterance: string) {
    setSubmitting(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/match/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance }),
      });
      const json = (await res.json()) as
        | { cardId: string | null; confidence: 'high' | 'medium' | 'low' }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'Match failed');
      }
      if (!json.cardId) {
        setVoiceError("I couldn't pick that out — tap one below.");
        return;
      }
      const card = cards.find((c) => c.id === json.cardId);
      if (!card) {
        setVoiceError("That match didn't resolve — tap one below.");
        return;
      }
      onPick(card.id, card.name);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <VoiceInput
        ariaLabel="Card name"
        placeholder="Say or type 'amex platinum', 'westpac altitude qantas'…"
        onSubmit={handleVoice}
        disabled={submitting}
        autoFocus
      />
      {voiceError && <p className="text-xs text-rose-600 dark:text-rose-300">{voiceError}</p>}
      <details className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Or browse the catalogue
        </summary>
        <ul className="max-h-72 overflow-y-auto p-1">
          {grouped.map(([issuerName, list]) => (
            <li key={issuerName}>
              <h4 className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {issuerName}
              </h4>
              <ul>
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onPick(c.id, c.name)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
