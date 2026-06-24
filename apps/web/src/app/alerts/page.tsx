'use client';

/**
 * /alerts — Alerts inbox. Today / Earlier grouped feed of fired
 * alerts. Reached from the bell icon in the top-right cluster
 * (alongside VoiceToggle + ThemeToggle + TopMenu).
 *
 * Each item is a Link into the source surface (spend log, benefits,
 * card detail) so the user can act on the alert in one tap. Tapping
 * also marks the alert read so the unread badge clears.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { useAlertsStore, type AlertKind, type FiredAlert } from '@/store/alerts';

function isTodayIso(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso.startsWith(today);
}

function destinationFor(alert: FiredAlert): string {
  switch (alert.kind) {
    case 'min-spend-deadline':
      return `/spend?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'benefit-expiring':
      return `/benefits?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'annual-fee-renewal':
      return `/optimisation?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'three-month-to-bonus':
      return `/next-card`;
  }
}

const KIND_PILL: Record<AlertKind, string> = {
  'min-spend-deadline': 'Spend',
  'annual-fee-renewal': 'Fee',
  'benefit-expiring': 'Benefit',
  'three-month-to-bonus': 'Eligible',
};

export default function AlertsInboxPage() {
  const feed = useAlertsStore((s) => s.feed);
  const markRead = useAlertsStore((s) => s.markRead);
  const markAllRead = useAlertsStore((s) => s.markAllRead);

  const { today, earlier, unreadCount } = useMemo(() => {
    const sorted = [...feed].sort((a, b) => b.firedAt.localeCompare(a.firedAt));
    return {
      today: sorted.filter((a) => isTodayIso(a.firedAt)),
      earlier: sorted.filter((a) => !isTodayIso(a.firedAt)),
      unreadCount: sorted.filter((a) => !a.read).length,
    };
  }, [feed]);

  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Bell className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
            Alerts
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {unreadCount > 0 ? `${unreadCount} unread · tap to act on it` : 'You’re caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <CheckCheck className="h-3 w-3" aria-hidden />
            Mark all read
          </button>
        )}
      </header>

      {today.length > 0 && <FeedSection title="Today" items={today} onRead={markRead} />}

      {earlier.length > 0 && <FeedSection title="Earlier" items={earlier} onRead={markRead} />}

      {feed.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          No alerts yet. They'll show here when something needs your attention.
        </p>
      )}

      <p className="mt-4 text-center text-[10px] text-zinc-400">
        Configure which alerts fire in{' '}
        <Link href="/settings" className="font-semibold text-[var(--color-ph-red)] hover:underline">
          Alert Centre
        </Link>
        .
      </p>
    </main>
  );
}

function FeedSection({
  title,
  items,
  onRead,
}: {
  title: string;
  items: FiredAlert[];
  onRead: (id: string) => void;
}) {
  return (
    <section aria-label={title} className="mb-6">
      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{title}</h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={destinationFor(a)}
              onClick={() => onRead(a.id)}
              className={
                a.read
                  ? 'flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60'
                  : 'flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-[var(--color-ph-red)]/40 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
              }
            >
              {!a.read && (
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-ph-red)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {KIND_PILL[a.kind]}
                  </span>
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{a.subtitle}</p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-zinc-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
