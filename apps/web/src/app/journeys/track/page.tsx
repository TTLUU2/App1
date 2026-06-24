'use client';

/**
 * /journeys/track — Track-a-journey wizard. The design specs 5 steps;
 * this v1 collapses them to 3 because steps 4 + 5 (wallet-first
 * preview + goal-funds-it summary) read the same data and the user is
 * one tap away from the live tracked-journey card on /journeys after
 * "Start tracking" anyway.
 *
 *   Step 1 — Pick destination (grid + search)
 *   Step 2 — Configure (program, cabin, trip type, departure month,
 *            target points)
 *   Step 3 — Confirm (preview + Start tracking → /journeys)
 *
 * State stays in this component (small, single-flow). On confirm we
 * call useJourneysStore.startTracking which writes to localStorage
 * and the new card appears at the top of /journeys' tracking list.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Plane, Search } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import {
  DESTINATION_CATALOGUE,
  useJourneysStore,
  type CabinClass,
  type DestinationOption,
  type TripType,
} from '@/store/journeys';

const CABINS: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First'];
const TRIP_TYPES: TripType[] = ['Return', 'One-way'];

export default function TrackJourneyPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-4 pb-32" aria-busy="true" />}>
      <TrackJourneyWizard />
    </Suspense>
  );
}

function TrackJourneyWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const initialDestId = params.get('destinationId') ?? '';

  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const startTracking = useJourneysStore((s) => s.startTracking);

  const [step, setStep] = useState<1 | 2 | 3>(initialDestId ? 2 : 1);
  const [destId, setDestId] = useState(initialDestId);
  const dest = useMemo(() => DESTINATION_CATALOGUE.find((d) => d.id === destId) ?? null, [destId]);

  const [tripType, setTripType] = useState<TripType>('Return');
  const [cabin, setCabin] = useState<CabinClass>('Business');
  const [programId, setProgramId] = useState(programs[0]?.id ?? '');
  const [departureMonth, setDepartureMonth] = useState('');
  const [target, setTarget] = useState('');

  function handleStart() {
    if (!dest) return;
    const targetPoints = Math.max(0, Math.round(Number(target.replace(/[,\s]/g, '')) || 0));
    if (targetPoints === 0) return;
    startTracking({
      destinationId: dest.id,
      destinationCity: dest.city,
      tripType,
      cabin,
      targetPoints,
      departureMonth: departureMonth || null,
      programId,
    });
    router.push('/journeys');
  }

  return (
    <main className="px-4 pt-4 pb-32">
      <WizardHeader
        step={step}
        onBack={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))}
      />

      {step === 1 && (
        <Step1PickDestination
          selectedId={destId}
          onPick={(id) => {
            setDestId(id);
            const d = DESTINATION_CATALOGUE.find((x) => x.id === id);
            if (d) setTarget(String(d.pointsBusinessReturn));
            setStep(2);
          }}
        />
      )}

      {step === 2 && dest && (
        <Step2Configure
          dest={dest}
          tripType={tripType}
          cabin={cabin}
          programId={programId}
          departureMonth={departureMonth}
          target={target}
          programs={programs.map((p) => ({ id: p.id, name: p.name, balance: p.balance }))}
          onTripType={setTripType}
          onCabin={setCabin}
          onProgram={setProgramId}
          onDepartureMonth={setDepartureMonth}
          onTarget={setTarget}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && dest && (
        <Step3Confirm
          dest={dest}
          tripType={tripType}
          cabin={cabin}
          programs={programs}
          programId={programId}
          totalPoints={total}
          target={target}
          departureMonth={departureMonth}
          onStart={handleStart}
        />
      )}
    </main>
  );
}

function WizardHeader({ step, onBack }: { step: 1 | 2 | 3; onBack: () => void }) {
  const labels: Record<1 | 2 | 3, string> = {
    1: 'Pick a destination',
    2: 'Set the target',
    3: 'You’re tracking',
  };
  return (
    <header className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Back"
        >
          {step === 1 ? <ChevronLeft className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          Back
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Step {step} of 3
        </p>
      </div>
      <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Plane className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        {labels[step]}
      </h1>
    </header>
  );
}

function Step1PickDestination({
  selectedId,
  onPick,
}: {
  selectedId: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const matches = DESTINATION_CATALOGUE.filter((d) =>
    `${d.city} ${d.country}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <Search className="h-4 w-4 text-zinc-400" aria-hidden />
        <input
          type="search"
          placeholder="Where to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Popular destinations
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {matches.map((d) => {
          const active = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onPick(d.id)}
                className={
                  active
                    ? 'w-full rounded-xl bg-white p-3 text-left ring-2 ring-[var(--color-ph-red)] dark:bg-zinc-900'
                    : 'w-full rounded-xl bg-white p-3 text-left ring-1 ring-zinc-200 transition-colors hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800'
                }
              >
                <p className="text-sm font-semibold">{d.city}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{d.country}</p>
                <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-500">
                  ~{formatPoints(d.pointsBusinessReturn)} · Business
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {matches.length === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500">No matches — try another city.</p>
      )}
    </>
  );
}

function Step2Configure({
  dest,
  tripType,
  cabin,
  programId,
  departureMonth,
  target,
  programs,
  onTripType,
  onCabin,
  onProgram,
  onDepartureMonth,
  onTarget,
  onNext,
}: {
  dest: DestinationOption;
  tripType: TripType;
  cabin: CabinClass;
  programId: string;
  departureMonth: string;
  target: string;
  programs: Array<{ id: string; name: string; balance: number }>;
  onTripType: (v: TripType) => void;
  onCabin: (v: CabinClass) => void;
  onProgram: (v: string) => void;
  onDepartureMonth: (v: string) => void;
  onTarget: (v: string) => void;
  onNext: () => void;
}) {
  const numericTarget = Math.max(0, Math.round(Number(target.replace(/[,\s]/g, '')) || 0));
  const canContinue = numericTarget > 0 && programId !== '';

  return (
    <>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Destination</p>
        <p className="mt-1 text-lg font-semibold">
          {dest.city} · {dest.country}
        </p>
      </section>

      <FieldGroup label="Trip">
        <SegmentedControl value={tripType} options={TRIP_TYPES} onChange={onTripType} />
      </FieldGroup>

      <FieldGroup label="Cabin">
        <SegmentedControl value={cabin} options={CABINS} onChange={onCabin} />
      </FieldGroup>

      <FieldGroup label="Redeem with">
        <ul className="space-y-1.5">
          {programs.map((p) => {
            const active = p.id === programId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onProgram(p.id)}
                  className={
                    active
                      ? 'flex w-full items-center justify-between rounded-xl bg-white p-3 ring-2 ring-[var(--color-ph-red)] dark:bg-zinc-900'
                      : 'flex w-full items-center justify-between rounded-xl bg-white p-3 ring-1 ring-zinc-200 hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800'
                  }
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs font-medium tabular-nums text-zinc-500">
                    {formatPoints(p.balance)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </FieldGroup>

      <FieldGroup label="Departure month (optional)">
        <input
          type="month"
          value={departureMonth}
          onChange={(e) => onDepartureMonth(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
      </FieldGroup>

      <FieldGroup label="Target points">
        <input
          inputMode="numeric"
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          placeholder={String(dest.pointsBusinessReturn)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
      </FieldGroup>

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}

function Step3Confirm({
  dest,
  tripType,
  cabin,
  programs,
  programId,
  totalPoints,
  target,
  departureMonth,
  onStart,
}: {
  dest: DestinationOption;
  tripType: TripType;
  cabin: CabinClass;
  programs: Array<{ id: string; name: string; balance: number }>;
  programId: string;
  totalPoints: number;
  target: string;
  departureMonth: string;
  onStart: () => void;
}) {
  const targetPoints = Math.max(0, Math.round(Number(target.replace(/[,\s]/g, '')) || 0));
  const program = programs.find((p) => p.id === programId);
  const progress =
    targetPoints === 0 ? 0 : Math.min(100, Math.round((totalPoints / targetPoints) * 100));
  const gap = Math.max(0, targetPoints - totalPoints);

  return (
    <>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Goal</p>
        <p className="mt-1 text-lg font-semibold">
          {dest.city} · {cabin}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {tripType}
          {departureMonth ? ` · ${departureMonth}` : ' · Flexible date'}
          {program ? ` · via ${program.name}` : ''}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="tabular-nums">{formatPoints(totalPoints)}</span>
            <span className="text-zinc-500 tabular-nums">{formatPoints(targetPoints)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-[var(--color-ph-red)] transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-semibold tabular-nums text-zinc-500">
            {gap === 0 ? "You're there — go book it." : `${formatPoints(gap)} to go (${progress}%)`}
          </p>
        </div>
      </section>

      <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-500">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          We'll watch your balances and surface progress on Home.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          You'll get a nudge when sweet-spot redemptions open up.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          Stop tracking any time from the Journeys tab.
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
      >
        Start tracking
      </button>

      <Link
        href="/journeys"
        className="mt-2 block text-center text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Not now
      </Link>
    </>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              active
                ? 'rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-zinc-950'
                : 'rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
