'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { CreditCard, Mic, Receipt, Sparkles, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/**
 * FAB action sheet — four actions. "Add a card" is now the unified
 * photo-first conversational flow (scan + onboard + manual collapsed into
 * one progressive screen at /add-card).
 */

interface Action {
  id: string;
  label: string;
  description: string;
  href: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const ACTIONS: Action[] = [
  {
    id: 'add',
    label: 'Add a card',
    description: 'Photo, upload, or pick from the list. Then a short voice Q&A.',
    href: '/add-card',
    Icon: CreditCard,
  },
  {
    id: 'spend',
    label: 'Update spend',
    description: 'Voice or text. "Add 250 to my Amex Plat".',
    href: '/spend',
    Icon: Receipt,
  },
  {
    id: 'benefits',
    label: 'Update benefits',
    description: 'Voice or text. "Used my Amex hotel credit".',
    href: '/benefits',
    Icon: Sparkles,
  },
  {
    id: 'ask',
    label: 'Ask Copilot',
    description: 'Voice in / voice out. Read-only Q&A about your cards.',
    href: '/ask',
    Icon: Mic,
  },
];

export function FabSheet({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom dark:bg-zinc-900"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden />
          <div className="mt-3 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Quick actions</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <ul className="mt-3 space-y-2">
            {ACTIONS.map((action) => (
              <li key={action.id}>
                <ActionRow action={action} onSelect={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ActionRow({ action, onSelect }: { action: Action; onSelect: () => void }) {
  return (
    <Link
      href={action.href}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:hover:bg-zinc-800"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-ph-red)]/10 text-[var(--color-ph-red)]">
        <action.Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{action.label}</span>
        <p className="mt-0.5 text-xs text-zinc-500">{action.description}</p>
      </div>
    </Link>
  );
}
