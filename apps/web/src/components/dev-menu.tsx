'use client';

// Hidden dev menu. Built as a stub here so the triple-tap header has somewhere
// to land; the real seeder lives in Task #10 (dev-menu seeder).

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function DevMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Seeder controls and reset actions land here in the next commit (Task #10).
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
