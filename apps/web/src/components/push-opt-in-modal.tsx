'use client';

// Push opt-in modal — fires once after the user has at least one card
// in their portfolio. Pinned at the layout level so it can appear
// regardless of which screen the user lands on after add-card.
//
// v1 behaviour: the "Turn on notifications" CTA just flips a flag in
// the alerts store — no real Notification.requestPermission() yet.
// When the real push pipeline lands, this is the single hook to wire.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Check, X } from 'lucide-react';
import { useAlertsStore } from '@/store/alerts';
import { useUserCardsStore } from '@/store/user-cards';

export function PushOptInModal() {
  const pathname = usePathname();
  const cardCount = useUserCardsStore((s) => s.userCards.length);
  const cardsLoaded = useUserCardsStore((s) => s.loaded);
  const alertsLoaded = useAlertsStore((s) => s.loaded);
  const pushPrompted = useAlertsStore((s) => s.pushPrompted);
  const setPushOptedIn = useAlertsStore((s) => s.setPushOptedIn);
  const markPushPrompted = useAlertsStore((s) => s.markPushPrompted);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!cardsLoaded || !alertsLoaded) return;
    if (pushPrompted) return;
    if (cardCount === 0) return;
    // Don't intrude during onboarding-style flows
    if (pathname.startsWith('/add-card') || pathname.startsWith('/ask')) return;
    // Tiny delay so the modal doesn't slam in mid-route-transition.
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [cardsLoaded, alertsLoaded, pushPrompted, cardCount, pathname]);

  if (!open) return null;

  function dismiss() {
    markPushPrompted();
    setOpen(false);
  }
  function turnOn() {
    setPushOptedIn(true);
    markPushPrompted();
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-opt-in-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl dark:bg-zinc-900"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-red-50 text-[var(--color-ph-red)] dark:bg-red-500/10">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="push-opt-in-title" className="text-base font-semibold">
              Stay ahead of every deadline
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Notifications surface only the alerts you&apos;ve turned on in Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="grid h-7 w-7 flex-none place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          <Bullet>Spend-by reminders before you&apos;d lose a bonus.</Bullet>
          <Bullet>Annual-fee heads-up before you&apos;re charged.</Bullet>
          <Bullet>Benefit-expiry nudges so $450+ isn&apos;t wasted.</Bullet>
        </ul>

        <button
          type="button"
          onClick={turnOn}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
        >
          Turn on notifications
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 block w-full text-center text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
