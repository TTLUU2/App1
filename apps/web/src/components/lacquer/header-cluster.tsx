'use client';

// Lacquer top-right header cluster (HANDOFF § Header).
//
// Three 34px tap targets, always visible top-right, don't scroll with
// content:
//   ⌂ Today       → /today. The house tile fills with ph-fill-warm
//                   when we're already on /today, matching the mock's
//                   "you are here" affordance.
//   Bell Alerts   → /alerts. The AlertsBell handles its own unread dot.
//   ☰ Settings    → /settings. Voice + theme toggles live inside
//                   Settings now — they don't belong on every screen.
//
// This replaces the pre-Lacquer TopMenu (a dropdown with Home /
// Balances / Settings) — the mock explicitly moves navigation into
// the tab bar and reserves the header cluster for these three
// exceptional surfaces.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Menu } from 'lucide-react';
import { AlertsBell } from '@/components/alerts-bell';

export function LacquerHeaderCluster() {
  const pathname = usePathname();
  const onToday = pathname === '/today';
  const onSettings = pathname === '/settings' || pathname.startsWith('/settings/');
  return (
    <div className="fixed right-3 top-3 z-40 flex items-center gap-1.5">
      <Link
        href="/today"
        aria-label="Today"
        aria-current={onToday ? 'page' : undefined}
        className={
          onToday
            ? 'grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--color-ph-fill-warm)] text-ph-brick ring-1 ring-ph-tint-border'
            : 'grid h-[34px] w-[34px] place-items-center rounded-full bg-white/80 text-zinc-700 ring-1 ring-zinc-200 backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900'
        }
      >
        <Home className={onToday ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden />
      </Link>

      <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white/80 ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800">
        {/* AlertsBell is a self-contained button; we just wrap it in
            the cluster's tile so the three targets read as a set. */}
        <AlertsBell />
      </div>

      <Link
        href="/settings"
        aria-label="Settings"
        aria-current={onSettings ? 'page' : undefined}
        className={
          onSettings
            ? 'grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--color-ph-fill-warm)] text-ph-brick ring-1 ring-ph-tint-border'
            : 'grid h-[34px] w-[34px] place-items-center rounded-full bg-white/80 text-zinc-700 ring-1 ring-zinc-200 backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900'
        }
      >
        <Menu className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
