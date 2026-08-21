'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, Gift, Send, TrendingUp, Plus } from 'lucide-react';
import clsx from 'clsx';
import { FanActions, type FanActionId } from './fan-actions';
import { AddCardModal } from './add-card-v2/add-card-modal';

/**
 * Persistent four-tab bottom bar plus a centre FAB.
 *
 * Lacquer tab order (Decision #33, HANDOFF §Tab bar):
 *   Matching · Deals · [+] · Optimise · Journeys
 *
 * Next Card was retired from the bar and folds into Optimise as a
 * sub-tab in Phase 4. Journeys is promoted here from its old
 * hamburger-only home. The paper-plane glyph nods at Perry — same
 * silhouette he'll carry once the real artwork lands.
 *
 * FAB sits centred at z-50, outside the nav's stacking context.
 * Tapping opens the radial fan; Phase 5 replaces the fan with the
 * labelled action-sheet from HANDOFF §7.
 */

const TABS = [
  { href: '/matching', label: 'Matching', longLabel: 'Card Matching', Icon: CreditCard },
  { href: '/deals', label: 'Deals', longLabel: 'Deals & Alerts', Icon: Gift },
  { href: '/optimisation', label: 'Optimise', longLabel: 'Card Optimisation', Icon: TrendingUp },
  { href: '/journeys', label: 'Journeys', longLabel: 'Journeys', Icon: Send },
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
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-ph-border bg-ph-card/90 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
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
                    // TestFlight.
                    'flex h-16 flex-col items-center gap-1 pt-2 pb-3 text-[10px] transition-colors',
                    active
                      ? 'font-semibold text-ph-brick'
                      : 'font-medium text-ph-text-meta hover:text-ph-text',
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

      {/* FAB — the centre pill from HANDOFF § Tab bar. Brick-filled 52px,
          the single system shadow (shadow-ph-fab). Sits proud of the
          bar via margin-bottom offset. Rotates to × when the fan is
          open. */}
      <button
        type="button"
        onClick={() => setFanOpen((o) => !o)}
        aria-label={fanOpen ? 'Close actions' : 'Open actions'}
        aria-haspopup="menu"
        aria-expanded={fanOpen}
        className={clsx(
          'fixed left-1/2 z-50 grid h-[52px] w-[52px] -translate-x-1/2 place-items-center rounded-full bg-ph-brick text-ph-on-brick transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105 focus-visible:outline-none active:scale-95',
          fanOpen && 'rotate-45',
        )}
        style={{
          bottom: 'calc(2.25rem + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-ph-fab)',
        }}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      <AddCardModal open={addCardOpen} onOpenChange={setAddCardOpen} />
    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  // Journeys tab stays lit while browsing tracked-journey subroutes
  // (/journeys/track) and while /balances is still live (it redirects
  // to /journeys?tab=balances in Phase 4). Card-detail lives under
  // /cards; keep it lit under Optimise since that's where the "your
  // cards" flow anchors now that Next Card is folded in.
  if (href === '/journeys') {
    return pathname === '/journeys' || pathname.startsWith('/journeys/');
  }
  if (href === '/optimisation') {
    return (
      pathname === '/optimisation' || pathname === '/next-card' || pathname.startsWith('/cards')
    );
  }
  return pathname === href || pathname.startsWith(href + '/');
}
