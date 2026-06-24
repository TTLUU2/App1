'use client';

// Bell icon that lives in the top-right cluster alongside VoiceToggle,
// ThemeToggle and TopMenu. Shows a small red dot when there are
// unread alerts in the feed. Routes to /alerts on tap.

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { selectUnreadCount, useAlertsStore } from '@/store/alerts';

export function AlertsBell() {
  const unreadCount = useAlertsStore(selectUnreadCount);
  return (
    <Link
      href="/alerts"
      aria-label={unreadCount > 0 ? `Alerts — ${unreadCount} unread` : 'Alerts'}
      className="relative grid h-7 w-7 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <Bell className="h-4 w-4" aria-hidden />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-ph-red)] ring-2 ring-white dark:ring-zinc-900"
        />
      )}
    </Link>
  );
}
