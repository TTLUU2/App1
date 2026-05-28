'use client';

// Add Card as a full-screen Radix Dialog. Opened by the FAB sheet instead
// of routing to /add-card — keeps the user on whatever tab they were on,
// and supports adding multiple cards in one session via the post-save
// "Add another" affordance.
//
// The /add-card route still exists (renders the same AddCardFlow without
// onSaved/onClose) so direct links + browser-history navigation still work.

import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { AddCardFlow } from './add-card-flow';
import { catalogue } from '@/store/user-cards';

export function AddCardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // `iter` lets us remount AddCardFlow when the user picks "Add another"
  // (key change → fresh state for a new card).
  const [iter, setIter] = useState(0);
  const [savedSummary, setSavedSummary] = useState<{
    cardId: string;
    count: number;
  } | null>(null);

  function handleSaved(cardId: string) {
    setSavedSummary((s) => ({ cardId, count: (s?.count ?? 0) + 1 }));
  }

  function resetForAnother() {
    setSavedSummary(null);
    setIter((n) => n + 1);
  }

  function closeAll() {
    onOpenChange(false);
    // Don't reset state immediately — the dialog has a close animation;
    // wait for the next open to reset cleanly via the open effect below.
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          // When dialog closes, reset the iter/summary so the next open is fresh.
          setSavedSummary(null);
          setIter((n) => n + 1);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col overflow-y-auto rounded-t-2xl bg-zinc-50 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom dark:bg-zinc-950"
        >
          <Dialog.Title className="sr-only">Add a card</Dialog.Title>

          {/* Drag handle + close — visually clear that this is dismissible */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-50/95 px-4 pt-3 backdrop-blur dark:bg-zinc-950/95">
            <div
              aria-hidden
              className="mx-auto h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"
            />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          {savedSummary ? (
            <SavedView
              cardId={savedSummary.cardId}
              count={savedSummary.count}
              onAddAnother={resetForAnother}
              onDone={closeAll}
            />
          ) : (
            <AddCardFlow key={iter} onSaved={handleSaved} onClose={closeAll} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SavedView({
  cardId,
  count,
  onAddAnother,
  onDone,
}: {
  cardId: string;
  count: number;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const card = catalogue.allCards().find((c) => c.id === cardId);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Saved</h2>
        {card && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{card.name}</p>}
        {count > 1 && (
          <p className="mt-1 text-[11px] text-zinc-500">{count} cards added this session</p>
        )}
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onAddAnother}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add another card
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Done
        </button>
      </div>
    </main>
  );
}
