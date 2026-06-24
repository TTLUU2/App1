'use client';

// Top-right global navigation menu. Sits in the same fixed cluster as
// VoiceToggle + ThemeToggle (layout.tsx). Three destinations — Home,
// Point balances, Settings — reachable from every screen. Bottom tabs
// stay as the four primary tasks (matching / deals / optimise /
// next-card); this menu is for the "where am I in the app" surfaces
// that don't belong in the tab bar.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, Home, Menu, Settings } from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  Icon: typeof Home;
}

const ITEMS: MenuItem[] = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/balances', label: 'Point balances', Icon: Coins },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function TopMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid h-7 w-7 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Menu className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] w-52 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          {ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={
                  active
                    ? 'flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-[var(--color-ph-red)] bg-red-50/60 dark:bg-red-500/10'
                    : 'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
