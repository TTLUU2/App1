// /dev/lacquer-primitives — component gallery for reviewing every
// Lacquer primitive in isolation before it lands on real screens
// (Phase 2 exit criteria, per docs/LACQUER_REFRESH.md).
//
// Access gate: 404s on Vercel production (`VERCEL_ENV === 'production'`).
// Any preview URL and every local dev instance still serves it — that
// covers the review workflow without leaking the page into the app
// the actual users see. The gate uses VERCEL_ENV (rather than
// NODE_ENV) because Vercel previews build with NODE_ENV='production'
// too; VERCEL_ENV is the only signal that distinguishes preview from
// prod.
//
// If you're staring at a 404 locally, check that you're on the dev
// server (`pnpm dev`), not a `next start` of a production build.

'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Award, Check, Clock, Info, Sparkles, X as XIcon } from 'lucide-react';
import {
  BottomSheet,
  CardArtFrame,
  EvidencePanel,
  HeroCard,
  LacquerChip,
  PerryAvatar,
  SegmentedControl,
} from '@/components/lacquer';

// Server-side gate. Runs at request time on the deploy; the check on
// `use client` files also applies because the module is evaluated
// during rendering before hydration.
if (process.env.VERCEL_ENV === 'production') {
  notFound();
}

// Not a route parameter — just a page-scope tuple used by the
// SegmentedControl demo below.
const OPTIMISE_ITEMS = [
  { id: 'cards', label: 'Your cards' },
  { id: 'next', label: 'Next card' },
] as const;

export default function LacquerPrimitivesPage() {
  const [optimiseTab, setOptimiseTab] = useState<'cards' | 'next'>('cards');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text" style={{ padding: '32px 24px 120px' }}>
      <header className="mb-8 flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
          Dev · Lacquer primitives
        </span>
        <h1 className="font-serif text-3xl leading-none text-ph-ink">Component gallery</h1>
        <p className="text-sm text-ph-text-muted">
          Every primitive in one place so we can eyeball them before they land on real screens. Prod
          builds 404 this page.
        </p>
      </header>

      <Section title="PerryAvatar">
        <Row>
          <PerryAvatar size={26} />
          <PerryAvatar size={46} />
          <PerryAvatar size={46} glyph="✓" />
        </Row>
        <Note>26px bar avatar · 46px celebration circle · alternate glyph (bonus cleared).</Note>
      </Section>

      <Section title="HeroCard">
        <HeroCard aria-labelledby="hero-demo-label">
          <PerryAvatar size={46} />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-on-brick-meta">
              Optimisation score
            </div>
            <div id="hero-demo-label" className="font-serif text-[38px] leading-none">
              78
            </div>
            <div className="mt-1 text-[13px] text-ph-on-brick-secondary">
              Up 6 this week. One move left to lift it again.
            </div>
          </div>
        </HeroCard>
        <Note>Brick surface, hero radius, gap 18. One per screen.</Note>
      </Section>

      <Section title="LacquerChip">
        <Row>
          <LacquerChip variant="pine" Icon={Check}>
            Bonus earned
          </LacquerChip>
          <LacquerChip variant="amber" Icon={Clock}>
            19d
          </LacquerChip>
          <LacquerChip variant="red-action" Icon={Sparkles}>
            Take action
          </LacquerChip>
          <LacquerChip variant="negative" Icon={XIcon}>
            Held 2025
          </LacquerChip>
          <LacquerChip variant="brick" Icon={Award}>
            Best move
          </LacquerChip>
        </Row>
        <Row>
          <LacquerChip variant="pine" Icon={Check} size="sm">
            Used
          </LacquerChip>
          <LacquerChip variant="amber" Icon={Clock} size="sm">
            At risk
          </LacquerChip>
        </Row>
        <Note>Icon + text always. Colour is never the only signal.</Note>
      </Section>

      <Section title="EvidencePanel">
        <EvidencePanel
          bullets={[
            {
              tone: 'pine',
              children: 'Eligible now — no matching cards held in the last 24 months.',
            },
            {
              tone: 'pine',
              children: (
                <>
                  <strong>Realistic at your rate</strong>: last 30 days averaged $2,400/mo, spec
                  asks $10,000 in 90 days.
                </>
              ),
            },
            { tone: 'amber-brown', children: 'Net $2,930 after the $370 fee.' },
          ]}
        />
        <Note>Three bullets is the sweet spot. Four legible, five reads as a list.</Note>
      </Section>

      <Section title="CardArtFrame">
        <Row>
          <CardArtFrame alt="Amex MR Gold" size="lg" />
          <CardArtFrame alt="Amex MR Gold" size="md" />
          <CardArtFrame alt="Amex MR Gold" size="sm" />
          <CardArtFrame alt="Amex MR Gold" size="xs" />
          <CardArtFrame alt="Amex MR Gold" size="xxs" />
        </Row>
        <Note>
          Placeholder mode. Real art drops in via <code>src=</code> without code change.
        </Note>
      </Section>

      <Section title="SegmentedControl">
        <SegmentedControl<'cards' | 'next'>
          items={OPTIMISE_ITEMS as unknown as { id: 'cards' | 'next'; label: string }[]}
          activeId={optimiseTab}
          onChange={setOptimiseTab}
          ariaLabel="Optimise view"
        />
        <Note>
          Thumb slides 180ms ease-out. Try tapping — active thumb tracks position and width.
        </Note>
      </Section>

      <Section title="BottomSheet">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="rounded-full bg-ph-red px-4 py-2 text-sm font-medium text-white"
        >
          Open sheet
        </button>
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Log a spend">
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
              Amount
            </div>
            <div className="font-serif text-[42px] leading-none text-ph-ink">$2,400</div>
            <EvidencePanel
              bullets={[
                { tone: 'pine', children: 'After this spend: $4,100 to go.' },
                { tone: 'amber-brown', children: 'Daily target drops from $342 to $216.' },
              ]}
            />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-2 w-full rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white"
            >
              Log it
            </button>
          </div>
        </BottomSheet>
        <Note>Slide-up 240ms cubic-bezier. Scrim ink at 42% opacity.</Note>
      </Section>

      <Section title="Type scale">
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              Screen title
            </div>
            <div className="font-serif text-[28px] leading-tight text-ph-ink">
              Good afternoon, Tin
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              Hero figure
            </div>
            <div className="font-serif text-[48px] leading-none tracking-[-0.02em] text-ph-ink">
              438,200
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              Card title
            </div>
            <div className="font-serif text-[21px] leading-tight text-ph-ink">
              American Express Platinum Charge
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              Row title
            </div>
            <div className="text-[15px] font-semibold text-ph-ink">Qantas Frequent Flyer</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
              Body
            </div>
            <div className="text-[13px] leading-relaxed text-ph-text">
              You need $342 a day. Last 30 days you averaged $180.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Colour swatches">
        <div className="grid grid-cols-4 gap-3">
          {[
            ['ink', 'var(--color-ph-ink)'],
            ['brick', 'var(--color-ph-brick)'],
            ['red', 'var(--color-ph-red)'],
            ['paper', 'var(--color-ph-paper)'],
            ['card', 'var(--color-ph-card)'],
            ['fill', 'var(--color-ph-fill)'],
            ['fill-warm', 'var(--color-ph-fill-warm)'],
            ['tint', 'var(--color-ph-tint)'],
            ['pine', 'var(--color-ph-pine)'],
            ['amber-lacquer', 'var(--color-ph-amber-lacquer)'],
            ['amber-figure', 'var(--color-ph-amber-figure)'],
            ['negative-chip', 'var(--color-ph-negative-chip)'],
          ].map(([name, value]) => (
            <div key={name} className="flex flex-col gap-1">
              <div
                className="h-14 rounded-ph-inner border border-ph-border"
                style={{ backgroundColor: value }}
              />
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ph-text-meta">
                {name}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

// ── local structural helpers ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 flex flex-col gap-3">
      <h2 className="border-b border-ph-border pb-2 font-serif text-lg text-ph-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs italic text-ph-text-muted">
      <Info className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden />
      {children}
    </p>
  );
}
