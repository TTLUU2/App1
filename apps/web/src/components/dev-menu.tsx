'use client';

// Hidden dev menu. Opens via triple-tap on any page header (or Shift+? on a
// keyboard). Hosts:
//   - Seed demo data (populates a realistic mix of held + cancelled cards
//     so Tab 4 shows every status without manual entry)
//   - Clear all data
//   - Show current store counts (debug aid)

import * as Dialog from '@radix-ui/react-dialog';
import { X, Database, Eraser, Info } from 'lucide-react';
import { useState } from 'react';
import { useUserCardsStore } from '@/store/user-cards';
import { buildDemoUserCards } from '@/lib/dev-fixtures';

export function DevMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const userCards = useUserCardsStore((s) => s.userCards);
  const replaceAll = useUserCardsStore((s) => s.replaceAll);
  const reset = useUserCardsStore((s) => s.reset);
  const [busy, setBusy] = useState<null | 'seed' | 'clear'>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSeed() {
    setBusy('seed');
    setMessage(null);
    try {
      const demo = buildDemoUserCards();
      await replaceAll(demo);
      setMessage(`Seeded ${demo.length} sample cards.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleClear() {
    setBusy('clear');
    setMessage(null);
    try {
      await reset();
      setMessage('Cleared all user cards.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-xl outline-none dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Dev menu</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dev menu"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Internal-testing helpers. Hidden from regular users — opens via triple-tap on the page
            header.
          </p>

          <div className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Info className="h-3 w-3" aria-hidden />
              {userCards.length} card{userCards.length === 1 ? '' : 's'} in local store
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSeed}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <Database className="h-4 w-4 text-[var(--color-ph-red)]" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">Seed demo data</span>
                <span className="block text-[11px] text-zinc-500">
                  5 cards covering eligible / waiting / grey area / not eligible.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <Eraser className="h-4 w-4 text-rose-600" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">Clear all data</span>
                <span className="block text-[11px] text-zinc-500">
                  Wipes the local IndexedDB store.
                </span>
              </span>
            </button>
          </div>

          {message && (
            <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {message}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
