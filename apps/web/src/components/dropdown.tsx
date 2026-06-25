'use client';

/**
 * Dropdown — generic single-select that matches the rest of the
 * journey-wizard inputs (MonthYearPicker style: button trigger →
 * centred sheet on mobile, dialog on sm+). Replaces native
 * `<select>` so Cabin / Origin pickers feel like the rest of the
 * brand instead of browser default chrome.
 *
 * Options are flexible — each entry has a stable `value`, a primary
 * `label`, and an optional secondary `caption` (e.g. IATA code for
 * the airport picker, blurb for the cabin picker).
 */

import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** Optional secondary line under the label in the options list +
   *  shown as a muted suffix on the trigger. */
  caption?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (next: T) => void;
  /** Visible above the options grid in the popover. */
  sheetTitle?: string;
  /** Optional small icon shown inside the trigger button. */
  triggerIcon?: React.ReactNode;
  /** Custom button render — defaults to `label · caption`. */
  renderTriggerValue?: (selected: DropdownOption<T> | undefined) => React.ReactNode;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  sheetTitle,
  triggerIcon,
  renderTriggerValue,
}: DropdownProps<T>) {
  const selected = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
      >
        {triggerIcon && <span className="flex-none text-zinc-400">{triggerIcon}</span>}
        <span className="min-w-0 flex-1 truncate">
          {renderTriggerValue ? (
            renderTriggerValue(selected)
          ) : selected ? (
            <>
              <span className="font-semibold">{selected.label}</span>
              {selected.caption && (
                <span className="ml-1.5 text-xs text-zinc-500">· {selected.caption}</span>
              )}
            </>
          ) : (
            <span className="text-zinc-500">Select…</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={sheetTitle ?? 'Select an option'}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-zinc-900"
          >
            {sheetTitle && (
              <p className="border-b border-zinc-100 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                {sheetTitle}
              </p>
            )}
            <ul role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={
                        isSelected
                          ? 'flex w-full items-center gap-3 px-4 py-3 text-left bg-red-50/60 dark:bg-red-500/10'
                          : 'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            isSelected
                              ? 'text-sm font-bold text-[var(--color-ph-red)]'
                              : 'text-sm font-semibold'
                          }
                        >
                          {opt.label}
                        </p>
                        {opt.caption && (
                          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{opt.caption}</p>
                        )}
                      </div>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 flex-none text-[var(--color-ph-red)]"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
