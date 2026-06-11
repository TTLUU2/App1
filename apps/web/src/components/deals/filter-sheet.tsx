'use client';

// Bottom-sheet that houses the full FilterControls panel — opened from the
// "More filters" trigger in the page header. Lifted from points-deals'
// FilterSheet, adapted to be triggered by an external button (the page
// renders the trigger inline next to the primary filters + sort dropdown).
//
// Uses Radix Dialog so we get focus management, ESC-to-close, and built-in
// data-state animation hooks that Tailwind v4 picks up via animate-in /
// fade-in / slide-in-from-bottom utilities.

import * as Dialog from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';
import { FilterControls } from './filter-controls';
import type { FilterState } from '@/data/deals-types';
import { countActiveFilters } from '@/lib/filter-deals';

interface FilterSheetProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
}

export function FilterSheet({ filters, onChange, onClear }: FilterSheetProps) {
  const count = countActiveFilters(filters);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand/40 hover:text-ink"
          aria-label="More filters"
        >
          <Filter className="size-3.5" aria-hidden />
          More
          {count > 0 && (
            <span className="grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col overflow-y-auto rounded-t-2xl bg-paper p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
          aria-describedby={undefined}
        >
          {/* Drag handle — visual only, lets the sheet read as a bottom sheet */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-ink">All filters</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close filters"
                className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-paper-warm hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <FilterControls filters={filters} onChange={onChange} />

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-ink-mute underline-offset-4 hover:text-ink hover:underline"
            >
              Clear all
            </button>
            <div className="flex-1" />
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-deep"
              >
                Show {count > 0 ? `${count} filtered ` : ''}results
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
