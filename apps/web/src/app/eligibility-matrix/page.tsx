'use client';

// All-vs-all eligibility rules grid. Reads "if I currently hold a card
// from <row>, can I get the sign-up bonus on a card from <column>?".
// Computed programmatically from the catalogue + issuer rules so it
// always reflects the live data — no hand-maintained truth table.
//
// Sleek mobile layout: sticky first column + sticky header row so axes
// stay anchored while scrolling. Cells use lucide icons (Check / X /
// AlertCircle) tinted with the same emerald/rose/amber tones as the
// rest of the app. Tap a cell to expand the rule's reason text below.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronLeft, Grid3x3, Check, X, AlertCircle, Clock } from 'lucide-react';
import type { CardWithIssuer, EligibilityStatus, Issuer, UserCardWithDetails } from '@ph/shared';
import { calculateEligibility, getCardsWithIssuer, getIssuers } from '@ph/shared';

interface MatrixEntry {
  key: string; // unique per family/program-program
  label: string; // short display label e.g. "Amex Platinum"
  issuer: Issuer;
  representative: CardWithIssuer; // any card from this group
}

interface Cell {
  status: EligibilityStatus;
  reason: string;
  /** Note shown next to the icon in dense view, e.g. "24m wait". */
  shortNote: string | null;
}

export default function EligibilityMatrixPage() {
  // Build axes once from the catalogue. These are static — no user state
  // bleeds in; this is a pure "rules of the game" view.
  const { entries, matrix } = useMemo(() => buildMatrix(), []);

  // Tapped cell — drives the explainer panel at the bottom of the page.
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);

  return (
    <main className="flex-1 px-4 pb-6 pt-2">
      <div className="flex items-center">
        <Link
          href="/eligibility-overview"
          aria-label="Back to eligibility overview"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <header className="mt-2 flex items-center gap-2">
        <Grid3x3 className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Eligibility matrix</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        Rows = card you currently hold. Columns = card you want a bonus on.
      </p>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-600" aria-hidden />
          Eligible
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-amber-600" aria-hidden />
          Grey area
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3 text-amber-600" aria-hidden />
          Waiting
        </span>
        <span className="inline-flex items-center gap-1">
          <X className="h-3 w-3 text-rose-600" aria-hidden />
          Blocked
        </span>
      </div>

      {/* Grid — horizontal scroll on mobile. First column + first row both
          sticky so the user always has axis context. */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-20 bg-zinc-50 px-2 py-2 text-left align-bottom font-semibold dark:bg-zinc-950"
                style={{ minWidth: 96 }}
              >
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Held ↓ / Want →
                </span>
              </th>
              {entries.map((e) => (
                <th
                  key={e.key}
                  className="sticky top-0 z-10 bg-zinc-50 px-2 py-2 align-bottom font-medium dark:bg-zinc-950"
                  style={{ minWidth: 88 }}
                >
                  <div className="whitespace-nowrap text-[10px] text-zinc-700 dark:text-zinc-300">
                    {e.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((row, ri) => (
              <tr key={row.key} className="border-t border-zinc-100 dark:border-zinc-800">
                <th
                  className="sticky left-0 z-10 whitespace-nowrap bg-zinc-50 px-2 py-2 text-left text-[10px] font-medium text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                  scope="row"
                >
                  {row.label}
                </th>
                {entries.map((col, ci) => {
                  const cell = matrix[ri]?.[ci];
                  if (!cell) return <td key={col.key} />;
                  const isActive = active?.row === ri && active?.col === ci;
                  return (
                    <td key={col.key} className="p-0">
                      <button
                        type="button"
                        onClick={() => setActive(isActive ? null : { row: ri, col: ci })}
                        aria-label={`${row.label} → ${col.label}: ${cell.reason}`}
                        className={clsx(
                          'flex h-full w-full items-center justify-center gap-0.5 px-2 py-2 transition-colors',
                          cellTone(cell.status),
                          isActive && 'ring-2 ring-inset ring-[var(--color-ph-red)]',
                        )}
                      >
                        <CellIcon status={cell.status} />
                        {cell.shortNote && (
                          <span className="text-[9px] font-medium tabular-nums opacity-80">
                            {cell.shortNote}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Explainer for the tapped cell */}
      {active && (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {entries[active.row]?.label} → {entries[active.col]?.label}
          </p>
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
            {matrix[active.row]?.[active.col]?.reason}
          </p>
          {entries[active.row]?.issuer.notes && (
            <p className="mt-1 text-[11px] italic text-zinc-500">
              {entries[active.row]?.issuer.notes}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-zinc-500">
        Computed from the catalogue rules. Targeted offers, lifetime exclusions, and changing terms
        can override — always read the fine print.
      </p>
    </main>
  );
}

// Group catalogue cards into matrix entries. Strategy: collapse cards
// that share an issuer + cardFamily (or, when family is null, the
// cardType+program). This produces ~10–15 stable axes that match how
// issuer rules actually scope (issuer-wide → fewer axes; card-family →
// per-family axis).
function buildMatrix(): {
  entries: MatrixEntry[];
  matrix: Cell[][];
} {
  const issuers = getIssuers();
  const cards = getCardsWithIssuer();

  const groups = new Map<string, CardWithIssuer[]>();
  for (const card of cards) {
    const familySeg = card.cardFamily ?? `${card.cardType}-${card.rewardsProgram}`;
    const key = `${card.issuerId}::${familySeg}`;
    const arr = groups.get(key) ?? [];
    arr.push(card);
    groups.set(key, arr);
  }

  const entries: MatrixEntry[] = [];
  for (const [key, list] of groups) {
    const rep = list[0];
    if (!rep) continue;
    entries.push({
      key,
      label: shortLabel(rep),
      issuer: rep.issuer,
      representative: rep,
    });
  }

  // Sort by issuer then label so the same issuer's families cluster.
  entries.sort((a, b) => {
    const issuerCmp = a.issuer.shortName.localeCompare(b.issuer.shortName);
    return issuerCmp !== 0 ? issuerCmp : a.label.localeCompare(b.label);
  });

  // Build the cell grid. For each (row, col) pair, fabricate a UserCard
  // representing "user actively holds row.representative" and ask the
  // engine: "what's the eligibility for col.representative?"
  const matrix: Cell[][] = entries.map((rowEntry) => {
    const heldCard = syntheticUserCard(rowEntry.representative);
    return entries.map((colEntry) => {
      const result = calculateEligibility(colEntry.representative, [heldCard], issuers);
      return {
        status: result.status,
        reason: result.reason,
        shortNote: short(result.reason),
      };
    });
  });

  return { entries, matrix };
}

// Tight label for a card group. Prefers cardFamily; falls back to the
// program/cardType combo. Always prefixed with the short issuer name.
function shortLabel(card: CardWithIssuer): string {
  const issuer = card.issuer.shortName;
  if (card.cardFamily) {
    const suffix = card.cardType === 'business' ? ` Biz` : '';
    return `${issuer} ${card.cardFamily}${suffix}`;
  }
  // No family — use rewards program as the differentiator
  const programLabel: Record<typeof card.rewardsProgram, string> = {
    qantas: 'QFF',
    velocity: 'Velocity',
    flexible: 'Flexible',
    bank: 'Rewards',
  };
  const typeLabel = card.cardType === 'business' ? ' Biz' : '';
  return `${issuer} ${programLabel[card.rewardsProgram]}${typeLabel}`;
}

// Build a synthetic UserCardWithDetails for matrix evaluation. Represents
// "user holds this card right now, applied a year ago, bonus received".
// Cancellation date null — the matrix is the rules against a current
// holder, not a past one.
function syntheticUserCard(card: CardWithIssuer): UserCardWithDetails {
  return {
    id: `matrix-synth-${card.id}`,
    cardId: card.id,
    applicationDate: '2025-01-01',
    cancellationDate: null,
    bonusReceived: true,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    card,
  };
}

// Compress the engine's reason text into a 2–4 character cell hint.
// "Wait 24 months..." → "24m", etc. Returns null when no useful short.
function short(reason: string): string | null {
  const m = /(\d+)\s*month/i.exec(reason);
  if (m && m[1]) return `${m[1]}m`;
  return null;
}

function cellTone(status: EligibilityStatus): string {
  switch (status) {
    case 'eligible':
      return 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60';
    case 'grey_area':
      return 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60';
    case 'waiting':
      return 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60';
    case 'not_eligible':
      return 'bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60';
  }
}

function CellIcon({ status }: { status: EligibilityStatus }) {
  if (status === 'eligible') return <Check className="h-3 w-3" aria-hidden />;
  if (status === 'grey_area') return <AlertCircle className="h-3 w-3" aria-hidden />;
  if (status === 'waiting') return <Clock className="h-3 w-3" aria-hidden />;
  return <X className="h-3 w-3" aria-hidden />;
}
