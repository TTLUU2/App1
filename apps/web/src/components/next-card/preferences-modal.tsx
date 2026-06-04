'use client';

// Tab 4 preferences modal. Two questions only (per UX call):
//
//   1. Preferred rewards programs — multi-select. Soft boost in ranking
//      (matching programs rank higher), but non-matching cards still appear
//      so the absolute best move is always visible.
//   2. Card type — single-select. HARD filter (most users can't apply for
//      business cards without an ABN, so hiding is the right default).
//
// Voice greeting fires on mount. Form is tappable for users who prefer
// touch. Either way commits via the preferences store.

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle2, Sliders, Plane, Building2, User } from 'lucide-react';
import clsx from 'clsx';
import type { CardTypePreference, RewardsProgram } from '@ph/shared';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { speak } from '@/lib/tts';

const PROGRAM_OPTIONS: { value: RewardsProgram; label: string; iconClass?: string }[] = [
  { value: 'qantas', label: 'Qantas' },
  { value: 'velocity', label: 'Velocity', iconClass: 'rotate-12' },
  { value: 'flexible', label: 'Amex / Flexible' },
  { value: 'bank', label: 'Bank points' },
];

const CARD_TYPE_OPTIONS: { value: CardTypePreference; label: string; sub: string }[] = [
  {
    value: 'personal',
    label: 'Personal only',
    sub: 'I don’t have an ABN',
  },
  {
    value: 'personal_and_business',
    label: 'Personal + Business',
    sub: 'I have an ABN',
  },
  { value: 'business', label: 'Business only', sub: 'Business cards only' },
];

interface Props {
  onClose: () => void;
}

export function PreferencesModal({ onClose }: Props) {
  const storedPrefs = useUserPreferencesStore((s) => s.preferences);
  const setPrograms = useUserPreferencesStore((s) => s.setPrograms);
  const setCardType = useUserPreferencesStore((s) => s.setCardType);
  const markPrompted = useUserPreferencesStore((s) => s.markPrompted);

  // Draft state — only commits to store when user taps Save. Lets them
  // experiment with toggles without immediately re-ranking Tab 4.
  const [programs, setProgramsDraft] = useState<RewardsProgram[]>(storedPrefs.preferredPrograms);
  const [cardType, setCardTypeDraft] = useState<CardTypePreference>(storedPrefs.cardType);

  // Mount greeting — defer 100ms so React StrictMode double-mount doesn't
  // race two speak() calls (the second's cancelSpeech-on-entry was killing
  // the first one's in-flight audio).
  useEffect(() => {
    const t = setTimeout(
      () => void speak('What rewards programs are you chasing? Tap below to set your preferences.'),
      100,
    );
    return () => clearTimeout(t);
  }, []);

  function toggleProgram(p: RewardsProgram) {
    setProgramsDraft((current) =>
      current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
    );
  }

  function save() {
    setPrograms(programs);
    setCardType(cardType);
    markPrompted();
    void speak('Preferences saved. Updating recommendations.');
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl outline-none dark:bg-zinc-900">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Dialog.Title className="inline-flex items-center gap-2 text-base font-semibold">
              <Sliders className="h-4 w-4 text-[var(--color-ph-red)]" aria-hidden />
              Your preferences
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <p className="mb-4 text-xs text-zinc-500">
            We&apos;ll boost matching cards in Tab 4 and hide ones you can&apos;t apply for.
            You&apos;ll still see the absolute best move regardless of program preference.
          </p>

          {/* Programs — multi-select */}
          <section className="mb-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Preferred rewards programs
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PROGRAM_OPTIONS.map((opt) => {
                const active = programs.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleProgram(opt.value)}
                    aria-pressed={active}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all',
                      active
                        ? 'border-[var(--color-ph-red)] bg-[var(--color-ph-red)] text-white'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300',
                    )}
                  >
                    <Plane className={clsx('h-3.5 w-3.5', opt.iconClass)} aria-hidden />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">
              Leave all unselected to treat every program equally.
            </p>
          </section>

          {/* Card type — single-select */}
          <section className="mb-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Card type
            </h3>
            <div className="space-y-2">
              {CARD_TYPE_OPTIONS.map((opt) => {
                const active = cardType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCardTypeDraft(opt.value)}
                    aria-pressed={active}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-[var(--color-ph-red)] bg-rose-50/60 dark:bg-rose-950/30'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full',
                        active
                          ? 'bg-[var(--color-ph-red)] text-white'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
                      )}
                      aria-hidden
                    >
                      {opt.value === 'business' ? (
                        <Building2 className="h-4 w-4" />
                      ) : opt.value === 'personal_and_business' ? (
                        <Sliders className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-[11px] text-zinc-500">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={save}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Save preferences
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
