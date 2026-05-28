// Tab 4 — Next Card. Real implementation arrives in Task #6. For Task #4 this
// is a stub so the tab shell + FAB are testable end-to-end.

import { Sparkles } from 'lucide-react';

export default function NextCardPage() {
  return (
    <main className="flex-1 px-4 py-6">
      <header className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Next Card</h1>
      </header>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Tab 4 home is wired in the next commit — hero card, eligible-cards summary, upcoming list,
        grey-area & not-eligible collapsibles. Tap the red + below to open the action sheet.
      </p>
    </main>
  );
}
