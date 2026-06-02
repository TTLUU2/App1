'use client';

// Persisted theme toggle, stateless on the React side.
//
// The icon shown is driven purely by CSS (`dark:hidden` vs `hidden
// dark:block`) so the rendered output matches the DOM regardless of what
// React thinks. No useState, no useEffect, no hydration mismatch — the
// pre-paint script in layout.tsx sets the .dark class before React even
// mounts, and the CSS reacts accordingly.
//
// The click handler reads the current state straight from the DOM, flips,
// and persists to localStorage.

import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'ph:theme';

function toggleTheme(): void {
  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  if (wasDark) root.classList.remove('dark');
  else root.classList.add('dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, wasDark ? 'light' : 'dark');
  } catch {
    /* localStorage unavailable — flip is in-memory only for this session */
  }
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light or dark theme"
      title="Toggle theme"
      className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* Light mode → show Moon (tap to go dark). Hidden in dark mode. */}
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
      {/* Dark mode → show Sun (tap to go light). Hidden in light mode. */}
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
    </button>
  );
}

/**
 * The pre-paint script to inline in <head>. Reads localStorage and adds
 * `dark` to <html> before the first paint to avoid a flash-of-wrong-theme.
 */
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('${STORAGE_KEY}');
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;
