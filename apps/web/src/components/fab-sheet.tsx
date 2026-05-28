'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { CreditCard, Mic, Receipt, Sparkles, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AddCardModal } from './add-card-v2/add-card-modal';

/**
 * FAB action sheet — four actions. "Add a card" opens an in-place modal
 * (no route change); the other three link to dedicated voice flows.
 */

interface NavAction {
  id: 'spend' | 'benefits' | 'ask';
  label: string;
  description: string;
  href: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const NAV_ACTIONS: NavAction[] = [
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  function openAddCard() {
    setSheetOpen(false);
    // tiny delay so the sheet's close animation doesn't fight the modal's open
    // animation visually. Both use the same z-stack; sheet at z-50 → modal at z-50.
    setTimeout(() => setAddCardOpen(true), 80);
  }

  return (
    <>
      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom dark:bg-zinc-900"
          >
            <div
              className="mx-auto h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"
              aria-hidden
            />
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
              <li>
                <ButtonRow
                  label="Add a card"
                  description="Photo, upload, or pick from the list. Then a short voice Q&A."
                  Icon={CreditCard}
                  onClick={openAddCard}
                />
              </li>
              {NAV_ACTIONS.map((action) => (
                <li key={action.id}>
                  <LinkRow action={action} onSelect={() => setSheetOpen(false)} />
                </li>
              ))}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AddCardModal open={addCardOpen} onOpenChange={setAddCardOpen} />
    </>
  );
}

function Row({
  Icon,
  label,
  description,
}: {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  description: string;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--color-ph-red)]/10 text-[var(--color-ph-red)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{label}</span>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function ButtonRow({
  Icon,
  label,
  description,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-xl border border-transparent p-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:hover:bg-zinc-800"
    >
      <Row Icon={Icon} label={label} description={description} />
    </button>
  );
}

function LinkRow({ action, onSelect }: { action: NavAction; onSelect: () => void }) {
  return (
    <Link
      href={action.href}
      onClick={onSelect}
      className="flex w-full items-center rounded-xl border border-transparent p-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:hover:bg-zinc-800"
    >
      <Row Icon={action.Icon} label={action.label} description={action.description} />
    </Link>
  );
}
