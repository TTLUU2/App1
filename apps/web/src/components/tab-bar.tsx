'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  // Allow other parts of the app to open the Add Card modal without prop
  // drilling. The Copilot mic dispatches `ph:open-add-card` when the user
  // says generic "add a card" (no specific catalogue card named) — we want
  // to surface the same flow the FAB triggers instead of a verbal hint.
  useEffect(() => {
    function handler() {
      setAddCardOpen(true);
    }
    window.addEventListener('ph:open-add-card', handler);
    return () => window.removeEventListener('ph:open-add-card', handler);
  }, []);

  return (
    <>
      <nav
        aria-label="Primary"
        // pb is doubled-up: an explicit pb-3 guarantees baseline padding
        // even when env(safe-area-inset-bottom) returns 0 (some Capacitor
        // contentInset modes squash the safe-area env value to 0). On
        // iPhones with a home indicator, the env() adds the device's
        // native indicator height (~34px) on top of the explicit pb-3.
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-zinc-200 bg-white/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
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
                    // pt-2 pb-3 puts the icon+label near the top of the
                    // 64px tab. Combined with the nav's
                    // pb-[calc(0.75rem+env(safe-area-inset-bottom))], the
                    // label sits well above the iPhone home indicator on
                    // TestFlight. Previous pb-2.5 wasn't enough breathing
                    // room on real-device testing.
                    'flex h-16 flex-col items-center gap-1 pt-2 pb-3 text-xs font-medium transition-colors',
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
