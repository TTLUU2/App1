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
        <Dialog.Overlay
          className="fixed inset-0 z-40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in"
          style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col overflow-y-auto rounded-t-ph-sheet bg-ph-paper pb-[max(env(safe-area-inset-bottom),0.5rem)] text-ph-text outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
        >
          <Dialog.Title className="sr-only">Add a card</Dialog.Title>

          {/* Drag handle + close. Lacquer sheet handle recipe: 38×4 in
              the paper-tinted #DCD2C1 stripe, close button ph-card
              chip so it reads against the sheet interior. */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-ph-paper/95 px-4 pt-3 backdrop-blur">
            <div
              aria-hidden
              className="mx-auto h-1 w-[38px] rounded-full"
              style={{ backgroundColor: '#DCD2C1' }}
            />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ph-card text-ph-text-muted ring-1 ring-ph-border transition-colors hover:text-ph-text"
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
      <div className="grid h-16 w-16 place-items-center rounded-full bg-ph-pine-chip text-ph-pine">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <h2 className="font-serif text-[24px] leading-tight text-ph-ink">Saved</h2>
        {card && <p className="mt-1 text-[13px] text-ph-text-muted">{card.name}</p>}
        {count > 1 && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            {count} cards added this session
          </p>
        )}
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onAddAnother}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add another card
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center justify-center rounded-full border border-ph-border-strong bg-ph-card px-4 py-3 text-sm font-medium text-ph-text-muted transition-colors hover:text-ph-text"
        >
          Done
        </button>
      </div>
    </main>
  );
}
