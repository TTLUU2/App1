'use client';

import type { Recommendation } from '@ph/shared';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { CardRow } from './card-row';

/**
 * Collapsible list used for the Grey area + Not eligible sections (PRD §10.2.4).
 * Defaults closed because they're low-priority for the daily glance.
 */
export function CollapsibleSection({
  heading,
  items,
  defaultOpen = false,
}: {
  heading: string;
  items: Recommendation[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;
  const id = heading.toLowerCase().replace(/\s+/g, '-');

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className="flex w-full items-center justify-between px-1 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:hover:text-zinc-300"
      >
        <span className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden />
          )}
          {heading} · {items.length}
        </span>
      </button>
      {open && (
        <ul id={`${id}-list`} className="mt-2 space-y-2">
          {items.map((r) => (
            <li key={r.card.id}>
              <CardRow rec={r} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
