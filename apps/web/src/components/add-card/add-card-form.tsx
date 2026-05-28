'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readPendingPrefill } from '@/components/scan/scan-flow';
import Link from 'next/link';
import { ChevronLeft, CreditCard as CreditCardIcon } from 'lucide-react';
import type { CardWithIssuer } from '@ph/shared';
import { catalogue, useUserCardsStore } from '@/store/user-cards';
import { PrivacyViolationError } from '@/lib/safety';

/**
 * "Add Card to History" — the FAB's only working action in M1. Modelled on
 * the prototype's modal (docs/Bonus Eligibility Reference/Screenshot
 * 2026-05-27 at 11.31.52pm.png), extended with the privacy-safe field set
 * from the kickoff (nickname, last4, expiry MM/YY). PAN/CVV are never
 * captured; the store's writer asserts no 13–19-digit string lands in any
 * other field. Prefill (optional) lets the OCR endpoint hand a partially
 * filled draft to this same form in M3.
 */

export interface AddCardPrefill {
  cardId?: string;
  last4?: string;
  expiryMonthYear?: string;
}

export function AddCardForm({ prefill }: { prefill?: AddCardPrefill }) {
  const router = useRouter();
  const addCard = useUserCardsStore((s) => s.addCard);

  const cards = useMemo(() => catalogue.allCards(), []);
  const cardsByIssuer = useMemo(() => {
    const map = new Map<string, CardWithIssuer[]>();
    for (const c of cards) {
      const list = map.get(c.issuer.name) ?? [];
      list.push(c);
      map.set(c.issuer.name, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  // Drain any OCR prefill stashed by /scan in sessionStorage. Done as a lazy
  // useState initializer (not useEffect) so React 19's strict effect rules
  // don't trip. `readPendingPrefill()` is safe on the server (it returns
  // null when `window` is undefined). The first browser render after hydration
  // will re-run this initializer with the real sessionStorage value.
  const stashed = useMemo(() => (prefill ? null : readPendingPrefill()), [prefill]);

  const [cardId, setCardId] = useState(prefill?.cardId ?? stashed?.cardId ?? '');
  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [nickname, setNickname] = useState('');
  const [last4, setLast4] = useState(prefill?.last4 ?? stashed?.last4 ?? '');
  const [expiryMonthYear, setExpiryMonthYear] = useState(
    prefill?.expiryMonthYear ?? stashed?.expiryMonthYear ?? '',
  );
  const prefillBanner = stashed
    ? stashed.cardId
      ? 'Prefilled from scan — please confirm the card and application date.'
      : 'Partial prefill from scan — we couldn’t match the card; please pick it from the list.'
    : null;
  const [cancelled, setCancelled] = useState(false);
  const [cancellationDate, setCancellationDate] = useState<string>('');
  const [bonusReceived, setBonusReceived] = useState(false);
  const [notes, setNotes] = useState('');

  // M2 onboarding extensions (PRD §16.2). Optional in the form — populated
  // either here or by the post-OCR conversational flow.
  const [activationDate, setActivationDate] = useState<string>('');
  const [annualFeeNextDueDate, setAnnualFeeNextDueDate] = useState<string>('');
  const [bonusTarget, setBonusTarget] = useState<string>('');
  const [bonusSpendWindowEndDate, setBonusSpendWindowEndDate] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = cardId !== '' && applicationDate !== '' && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await addCard({
        cardId,
        applicationDate,
        cancellationDate: cancelled && cancellationDate ? cancellationDate : null,
        bonusReceived,
        notes: notes || null,
        nickname: nickname || null,
        last4: last4 || null,
        expiryMonthYear: expiryMonthYear || null,
        activationDate: activationDate || null,
        annualFeeNextDueDate: annualFeeNextDueDate || null,
        bonusTarget: bonusTarget ? Number(bonusTarget) : null,
        bonusSpendWindowEndDate: bonusSpendWindowEndDate || null,
      });
      router.push('/');
    } catch (err) {
      if (err instanceof PrivacyViolationError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 px-4 pb-6">
      <div className="flex items-center pt-2">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <header className="mt-2 flex items-center gap-2">
        <CreditCardIcon className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Add card to history</h1>
      </header>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Track a card you have or had so the eligibility engine can see your full picture.
      </p>

      {prefillBanner && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {prefillBanner}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <Field label="Card" required htmlFor="card">
          <select
            id="card"
            required
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select a card…</option>
            {cardsByIssuer.map(([issuerName, list]) => (
              <optgroup key={issuerName} label={issuerName}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Application date" required htmlFor="applicationDate">
          <input
            id="applicationDate"
            type="date"
            required
            value={applicationDate}
            onChange={(e) => setApplicationDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <ToggleField
          label="Card cancelled?"
          on={cancelled}
          onToggle={setCancelled}
          description={cancelled ? undefined : "Leave off if you're still holding the card."}
        />

        {cancelled && (
          <Field label="Cancellation date" htmlFor="cancellationDate">
            <input
              id="cancellationDate"
              type="date"
              value={cancellationDate}
              onChange={(e) => setCancellationDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        )}

        <ToggleField
          label="Sign-up bonus received?"
          on={bonusReceived}
          onToggle={setBonusReceived}
        />

        <details className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            More details (optional)
          </summary>
          <div className="mt-3 space-y-4">
            <Field label="Nickname" htmlFor="nickname">
              <input
                id="nickname"
                type="text"
                placeholder="e.g. Travel card"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry (MM/YY)" htmlFor="expiry">
                <input
                  id="expiry"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{2}/\d{2}"
                  maxLength={5}
                  placeholder="03/29"
                  value={expiryMonthYear}
                  onChange={(e) => setExpiryMonthYear(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
              <Field label="Last 4 digits" htmlFor="last4" hint="From printed card front">
                <input
                  id="last4"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="1234"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
            </div>
            <Field label="Notes" htmlFor="notes">
              <textarea
                id="notes"
                rows={3}
                placeholder="Any details to remember…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </Field>

            {/* Card-onboarding fields — power Tab 3 (Card Optimisation). */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Activation date" htmlFor="activationDate">
                <input
                  id="activationDate"
                  type="date"
                  value={activationDate}
                  onChange={(e) => setActivationDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
              <Field label="Annual fee next due" htmlFor="annualFeeNextDueDate">
                <input
                  id="annualFeeNextDueDate"
                  type="date"
                  value={annualFeeNextDueDate}
                  onChange={(e) => setAnnualFeeNextDueDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Min-spend target (AUD)"
                htmlFor="bonusTarget"
                hint="For sign-up bonus tracking"
              >
                <input
                  id="bonusTarget"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  placeholder="3000"
                  value={bonusTarget}
                  onChange={(e) => setBonusTarget(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
              <Field label="Spend by" htmlFor="bonusSpendWindowEndDate">
                <input
                  id="bonusSpendWindowEndDate"
                  type="date"
                  value={bonusSpendWindowEndDate}
                  onChange={(e) => setBonusSpendWindowEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
            </div>
          </div>
        </details>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {error}
          </div>
        )}

        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          We never store the full card number or CVV. If you accidentally paste a long number into
          any field, it&apos;s rejected before it touches the database.
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-ph-red-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add card'}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-ph-red)]">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </label>
  );
}

function ToggleField({
  label,
  description,
  on,
  onToggle,
}: {
  label: string;
  description?: string;
  on: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div>
        {description && <div className="mt-0.5 text-xs text-zinc-500">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onToggle(!on)}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] ${
          on ? 'bg-[var(--color-ph-red)]' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
