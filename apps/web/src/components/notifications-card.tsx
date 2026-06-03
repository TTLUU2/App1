'use client';

// Notifications opt-in card — lives on /optimisation so users can enable
// push without having to find a settings page. Three visual states:
// unsupported, default/granted (offer enable), subscribed (offer test +
// disable). iOS users get extra guidance because web push there requires
// installing the PWA first.

import { useState } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useWebPush, type PushTestResult } from '@/hooks/use-web-push';

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS uses navigator.standalone; everyone else uses display-mode media query.
  const navStandalone = (navigator as { standalone?: boolean }).standalone === true;
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return navStandalone || displayStandalone;
}

export function NotificationsCard() {
  const { state, loading, error, enable, disable, sendTest } = useWebPush();
  const [lastTest, setLastTest] = useState<PushTestResult | null>(null);

  async function handleTest() {
    const result = await sendTest();
    if (result) setLastTest(result);
  }

  if (state === 'unsupported') {
    // Show iOS-specific guidance vs generic "not supported".
    const onIos = isIosSafari();
    const installed = isStandalonePwa();
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-center gap-2">
          <BellOff className="h-4 w-4 text-zinc-400" aria-hidden />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </header>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {onIos && !installed
            ? 'On iPhone, notifications work only after you install this app. Tap the Share button in Safari, then "Add to Home Screen", then reopen from the home screen.'
            : 'Push notifications aren’t supported in this browser. Try Chrome, Edge, or Firefox (or install as a PWA on iOS).'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {state === 'subscribed' ? (
            <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4 text-zinc-400" aria-hidden />
          )}
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          {state === 'subscribed' ? 'On' : state === 'denied' ? 'Blocked' : 'Off'}
        </span>
      </header>

      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {state === 'subscribed'
          ? "You'll get reminders before spend-by deadlines, annual fees, and benefit expiries."
          : state === 'denied'
            ? 'You blocked notifications. Re-enable in your browser settings, then reload.'
            : 'Get reminders before spend-by deadlines, annual fees, and benefit expiries.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {state === 'subscribed' ? (
          <>
            <button
              type="button"
              onClick={handleTest}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ph-red)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <Send className="h-3 w-3" aria-hidden />
              {loading ? 'Sending…' : 'Send test'}
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Turn off
            </button>
          </>
        ) : state === 'denied' ? null : (
          <button
            type="button"
            onClick={enable}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ph-red)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            <Bell className="h-3 w-3" aria-hidden />
            {loading ? 'Enabling…' : 'Turn on notifications'}
          </button>
        )}
      </div>

      {lastTest && (
        <p
          className={`mt-2 inline-flex items-center gap-1.5 text-[11px] ${
            lastTest.ok
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-amber-700 dark:text-amber-300'
          }`}
        >
          {lastTest.ok ? (
            <CheckCircle2 className="h-3 w-3" aria-hidden />
          ) : (
            <AlertCircle className="h-3 w-3" aria-hidden />
          )}
          Test delivered to {lastTest.delivered} of {lastTest.total} subscription
          {lastTest.total === 1 ? '' : 's'}.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {error}
        </p>
      )}
    </section>
  );
}
