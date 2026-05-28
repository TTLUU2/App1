'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CreditCard, Gift, TrendingUp, Sparkles, Plus } from 'lucide-react';
import clsx from 'clsx';
import { FanActions, type FanActionId } from './fan-actions';
import { AddCardModal } from './add-card-v2/add-card-modal';

/**
 * Persistent four-tab bottom bar plus a centre FAB.
 *
 * Tab order is fixed per PRD §6.1. FAB sits centred at z-50, outside the
 * nav's stacking context. Tapping the FAB opens a radial fan of 4 action
 * buttons (PRD §6.2 "radial menu"), with the + icon rotating to ×.
 */

const TABS = [
  { href: '/matching', label: 'Matching', longLabel: 'Card Matching', Icon: CreditCard },
  { href: '/deals', label: 'Deals', longLabel: 'Deals & Alerts', Icon: Gift },
  { href: '/optimisation', label: 'Optimise', longLabel: 'Card Optimisation', Icon: TrendingUp },
  { href: '/next-card', label: 'Next Card', longLabel: 'Next Card', Icon: Sparkles },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [fanOpen, setFanOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  function handleFanPick(id: FanActionId) {
    setFanOpen(false);
    if (id === 'add') {
      // Tiny delay so the fan-close animation doesn't overlap the modal-open
      setTimeout(() => setAddCardOpen(true), 60);
    }
    // 'spend' / 'benefits' / 'ask' route via <Link> inside FanActions, no JS needed
  }

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
                  // Close the fan when navigating via a tab (so the fan
                  // doesn't linger on the destination route).
                  onClick={() => setFanOpen(false)}
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

      <FanActions open={fanOpen} onClose={() => setFanOpen(false)} onPick={handleFanPick} />

      {/* FAB — plain button at z-50. Always on top of the fan backdrop so
          tapping it again closes the fan. + icon rotates to × when open. */}
      <button
        type="button"
        onClick={() => setFanOpen((o) => !o)}
        aria-label={fanOpen ? 'Close actions' : 'Open actions'}
        aria-haspopup="menu"
        aria-expanded={fanOpen}
        className={clsx(
          'fixed left-1/2 z-50 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[var(--color-ph-red)] text-white shadow-lg ring-4 ring-white transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ph-red)]/40 active:scale-95 dark:ring-zinc-950',
          fanOpen && 'rotate-45',
        )}
        style={{ bottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="h-7 w-7" aria-hidden />
      </button>

      <AddCardModal open={addCardOpen} onOpenChange={setAddCardOpen} />
    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/next-card') {
    return pathname === '/next-card' || pathname.startsWith('/cards');
  }
  return pathname === href || pathname.startsWith(href + '/');
}
