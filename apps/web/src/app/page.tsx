import { getCardsWithIssuer, getIssuers } from '@ph/shared';

export default function Home() {
  const issuers = getIssuers();
  const cards = getCardsWithIssuer();

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Point Hacks Copilot</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        M0+M1 scaffold smoke test. The shared workspace is linked and the catalogue loaded.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-center text-sm">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Issuers</dt>
          <dd className="mt-1 text-2xl font-semibold">{issuers.length}</dd>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Cards</dt>
          <dd className="mt-1 text-2xl font-semibold">{cards.length}</dd>
        </div>
      </dl>
      <p className="mt-6 text-xs text-zinc-500">
        Tab shell, Tab 4 UI, FAB add-card flow, and camera + OCR ship in later commits.
      </p>
    </main>
  );
}
