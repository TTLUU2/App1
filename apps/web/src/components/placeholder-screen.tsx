import type { ReactNode } from 'react';

/**
 * Reusable "Coming soon" placeholder for Tabs 1, 2, 3 per PRD §7, §8, and
 * the M1 carve-out of Tab 3 (full Tab 3 ships in M2). PRD requires the
 * placeholder to be screen-reader and dynamic-type accessible.
 */
export function PlaceholderScreen({
  heading,
  description,
  icon,
}: {
  heading: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-ph-red)]/10 text-[var(--color-ph-red)]">
        {icon}
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
      <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      <button
        type="button"
        className="mt-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[var(--color-ph-red)] hover:text-[var(--color-ph-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:text-zinc-300"
      >
        Notify me when ready
      </button>
    </main>
  );
}
