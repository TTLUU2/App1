// BottomSheet — the paper sheet used by Log-a-spend and Add-a-card
// (HANDOFF § 8, § 9, § Interactions).
//
// Behaviour locked to the spec:
//   - Scrim rgba(46,10,8,0.42), fades in
//   - Sheet slides up 240ms cubic-bezier(0.32, 0.72, 0, 1)
//   - Radius 26px on the top corners only
//   - 20px 24px 26px padding (top/x/bottom)
//   - Grab handle 38×4, #DCD2C1
//   - Swipe-down and `Cancel` both dismiss
//
// Built on Radix Dialog because we already have `@radix-ui/react-dialog`
// in deps and it gives us the focus-trap + Esc-to-close + a11y
// wiring for free. The Radix Overlay + Content get a `data-state`
// attribute that CSS keys off for enter/leave animation timing.

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import clsx from 'clsx';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Serif title shown top-left. */
  title: ReactNode;
  /** Optional label for the trailing action (defaults to "Cancel"). */
  cancelLabel?: string;
  children: ReactNode;
  /** Optional class on the sheet element for per-instance sizing. */
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  cancelLabel = 'Cancel',
  children,
  className,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={clsx(
            'fixed inset-0 z-40',
            // Fades in with the sheet — timing on the Overlay itself
            // via animation keyframes below.
            'data-[state=open]:animate-[sheet-scrim-in_240ms_cubic-bezier(0.32,0.72,0,1)_both]',
            'data-[state=closed]:animate-[sheet-scrim-out_180ms_ease-in_both]',
          )}
          style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            // Default Radix behaviour focuses the first focusable child;
            // for a sheet with a numeric input that pops the iOS
            // keypad immediately, which is intended. If a specific
            // sheet needs to opt out it can preventDefault here.
            void e;
          }}
          className={clsx(
            'fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md bg-ph-paper',
            'rounded-t-ph-sheet',
            'data-[state=open]:animate-[sheet-slide-in_240ms_cubic-bezier(0.32,0.72,0,1)_both]',
            'data-[state=closed]:animate-[sheet-slide-out_200ms_ease-in_both]',
            className,
          )}
          style={{ padding: '20px 24px 26px' }}
        >
          {/* Grab handle. Purely visual (Radix's swipe-to-dismiss
              would need a gesture library; the Cancel button + scrim
              tap cover dismissal for now). */}
          <div
            className="mx-auto mb-3 h-1 w-[38px] rounded-full"
            style={{ backgroundColor: '#DCD2C1' }}
          />

          <div className="mb-4 flex items-center justify-between gap-4">
            <Dialog.Title className="font-serif text-2xl leading-tight text-ph-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close
              type="button"
              className="rounded-full p-1 text-ph-text-muted hover:text-ph-text"
              aria-label={cancelLabel}
            >
              <X className="h-5 w-5" aria-hidden />
            </Dialog.Close>
          </div>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
