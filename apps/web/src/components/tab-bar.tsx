'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CreditCard, Gift, TrendingUp, Sparkles, Plus } from 'lucide-react';
import clsx from 'clsx';
import { FabSheet } from './fab-sheet';

/**
 * Persistent four-tab bottom bar plus a centre FAB.
 *
 * Tab order is fixed per PRD §6.1. The FAB is a sibling of the nav (not a
 * child) so its stacking context is independent of the nav (nav z-30 →
 * FAB z-50). FAB is a plain <button onClick={...}> — TabBar owns the
 * open state and passes it down to the controlled FabSheet. The previous
 * Dialog.Trigger asChild pattern silently failed to attach the click
 * handler in some renders.
 */

const TABS = [
  { href: '/matching', label: 'Matching', longLabel: 'Card Matching', Icon: CreditCard },
  { href: '/deals', label: 'Deals', longLabel: 'Deals & Alerts', Icon: Gift },
  { href: '/optimisation', label: 'Optimise', longLabel: 'Card Optimisation', Icon: TrendingUp },
  { href: '/next-card', label: 'Next Card', longLabel: 'Next Card', Icon: Sparkles },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-zinc-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <ul role="tablist" className="grid grid-cols-4 items-end">
          {TABS.map((tab, i) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href} role="presentation" className="contents">
                <Link
                  href={tab.href}
                  role="tab"
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.longLabel}
                  className={clsx(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                    active
                      ? 'text-[var(--color-ph-red)]'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
                    // The 2nd tab leaves room for the FAB on its right edge; the 3rd on its left.
                    i === 1 && 'pr-7',
                    i === 2 && 'pl-7',
                  )}
                >
                  <tab.Icon className="h-5 w-5" aria-hidden />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* FAB — plain button at z-50, outside the nav's stacking context.
          Tapping it just flips the controlled FabSheet state below. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Open actions"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        className="fixed left-1/2 z-50 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[var(--color-ph-red)] text-white shadow-lg ring-4 ring-white transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ph-red)]/40 active:scale-95 dark:ring-zinc-950"
        style={{ bottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="h-7 w-7" aria-hidden />
      </button>

      <FabSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addCardOpen={addCardOpen}
        onAddCardOpenChange={setAddCardOpen}
      />
    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/next-card') {
    // Tab 4 "Next Card" owns the per-card detail screens too.
    return pathname === '/next-card' || pathname.startsWith('/cards');
  }
  return pathname === href || pathname.startsWith(href + '/');
}
