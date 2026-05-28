'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Gift, TrendingUp, Sparkles, Plus } from 'lucide-react';
import clsx from 'clsx';
import { FabSheet } from './fab-sheet';

/**
 * Persistent four-tab bottom bar plus a central FAB. The tab order is fixed
 * per PRD §6.1: Card Matching, Deals & Alerts, Card Optimisation, Next Card.
 * The FAB sits between tabs 2 and 3, visually overlapping the divider, per
 * PRD §6.2. Long-press → recent-action shortcut is deferred to M2 (only one
 * action is live in M1).
 */

const TABS = [
  { href: '/matching', label: 'Matching', longLabel: 'Card Matching', Icon: CreditCard },
  { href: '/deals', label: 'Deals', longLabel: 'Deals & Alerts', Icon: Gift },
  { href: '/optimisation', label: 'Optimise', longLabel: 'Card Optimisation', Icon: TrendingUp },
  { href: '/', label: 'Next Card', longLabel: 'Next Card', Icon: Sparkles },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-zinc-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul role="tablist" className="relative grid grid-cols-4 items-end">
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

        {/* Centre FAB: absolutely positioned over the divider between tab 2 and tab 3 */}
        <li
          className="pointer-events-none absolute inset-x-0 -top-6 flex justify-center"
          role="presentation"
        >
          <div className="pointer-events-auto">
            <FabSheet trigger={<FabButton />} />
          </div>
        </li>
      </ul>
    </nav>
  );
}

function FabButton() {
  return (
    <button
      type="button"
      aria-label="Open actions"
      className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-ph-red)] text-white shadow-lg ring-4 ring-white transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ph-red)]/40 active:scale-95 dark:ring-zinc-950"
    >
      <Plus className="h-7 w-7" aria-hidden />
    </button>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/cards');
  return pathname === href || pathname.startsWith(href + '/');
}
