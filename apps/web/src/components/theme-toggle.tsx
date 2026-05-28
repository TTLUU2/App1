'use client';

// Persisted theme toggle. Reads from localStorage on mount (in sync with the
// inline pre-paint script in layout.tsx so we don't fight the initial class)
// and writes through to both <html class="dark"> and localStorage on flip.
//
// Light is the default for new users; explicit dark stays sticky across reloads.

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ph:theme';

function readPersisted(): Theme | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'dark' || v === 'light' ? v : null;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeToggle() {
  // Lazy initializer: prefer the persisted value, fall back to whatever the
  // pre-paint script left on <html>. Falls back to 'light' on the server
  // snapshot (where window is undefined) — the first browser render after
  // hydration picks up the real value.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    const stored = readPersisted();
    if (stored) return stored;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable — flip is in-memory only this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        <Sun className="h-4 w-4" aria-hidden />
      )}
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
