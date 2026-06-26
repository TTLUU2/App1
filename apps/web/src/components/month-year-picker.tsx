'use client';

/**
 * MonthYearPicker — replaces the native `<input type="month">` in
 * the Track-a-journey wizard. Native month inputs look like browser
 * default chrome (Safari has a wheel, Chrome has a tiny popup); this
 * component matches the rest of the app's input styling and gives
 * the user a clean 3×4 month grid + year navigation.
 *
 *   Trigger:   styled button mirroring other text inputs
 *   Popover:   centred sheet/modal with year arrows + month grid
 *   Value:     ISO yyyy-MM (matches the previous native input format)
 *   Clear:     "Flexible" link in the picker footer
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthYearPickerProps {
  /** ISO yyyy-MM. Empty string = no month selected. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseValue(value: string): { year: number; month: number } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function formatDisplay(value: string): string {
  const parsed = parseValue(value);
  if (!parsed) return '';
  return `${MONTH_LABELS[parsed.month - 1]} ${parsed.year}`;
}

/** Convenience export of the same yyyy-MM → "Aug 2026" formatter,
 *  for callers that surface a month/year outside the picker (e.g.
 *  the auto-target deadline copy in the wizard). */
export function formatMonthYear(value: string): string {
  return formatDisplay(value);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = 'Pick a month',
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState<number>(() => {
    const parsed = parseValue(value);
    return parsed ? parsed.year : now.getFullYear();
  });
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Reset to the selected month's year whenever the picker reopens —
  // saves a click when the user just wants to inspect their pick.
  useEffect(() => {
    if (!open) return;
    const parsed = parseValue(value);
    if (parsed) setYear(parsed.year);
  }, [open, value]);

  // Esc closes; click outside closes (modal backdrop handles the
  // click-outside via its own onClick).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const display = formatDisplay(value);
  const parsed = parseValue(value);
  const minYear = now.getFullYear();
  const maxYear = now.getFullYear() + 4;

  function pickMonth(month: number) {
    onChange(`${year}-${pad2(month)}`);
    setOpen(false);
  }

  function clearMonth() {
    onChange('');
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
        {display ? (
          <span className="flex-1 truncate font-semibold tabular-nums">{display}</span>
        ) : (
          <span className="flex-1 truncate text-zinc-500">{placeholder}</span>
        )}
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear month"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
              }
            }}
            className="grid h-5 w-5 flex-none place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-3 w-3" aria-hidden />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a departure month"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setYear((y) => Math.max(minYear, y - 1))}
                disabled={year <= minYear}
                aria-label="Previous year"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="text-lg font-bold tabular-nums">{year}</p>
              <button
                type="button"
                onClick={() => setYear((y) => Math.min(maxYear, y + 1))}
                disabled={year >= maxYear}
                aria-label="Next year"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <ul className="grid grid-cols-3 gap-1.5 p-3">
              {MONTH_LABELS.map((label, i) => {
                const month = i + 1;
                const isSelected = parsed?.year === year && parsed?.month === month;
                const isPast =
                  year < now.getFullYear() ||
                  (year === now.getFullYear() && month < now.getMonth() + 1);
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => pickMonth(month)}
                      disabled={isPast}
                      className={
                        isSelected
                          ? 'w-full rounded-lg bg-[var(--color-ph-red)] py-2.5 text-sm font-bold text-white shadow-sm'
                          : isPast
                            ? 'w-full rounded-lg py-2.5 text-sm font-medium text-zinc-300 dark:text-zinc-700'
                            : 'w-full rounded-lg py-2.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800'
                      }
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={clearMonth}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Flexible
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
