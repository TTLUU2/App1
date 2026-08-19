# Affiliate tracking + conversion-triggered benefits

Design sketch — not yet built.

## Goal

When a user applies for a credit card through Point Hacks Copilot and is
approved, we want to:

1. Attribute the conversion back to the specific user
2. Automatically grant a reward (e.g. "12 months free access to PH
   Copilot Pro")
3. Later, surface converted-through-us history in the user's profile

## Attribution model

We reuse the existing `device_id` scheme — an opaque client-generated
UUID stored in `localStorage`, already the primary key for
`push_subscriptions` and `alert_projections`. No new auth needed for
v1; a user losing storage or switching devices loses their attribution
history, which is an acceptable v1 trade-off.

Every outbound affiliate link is decorated with the `device_id` as the
network's subid parameter. The exact parameter name varies by network:

| Network            | Subid param | Postback support     |
| ------------------ | ----------- | -------------------- |
| Commission Factory | `sub1`      | Yes (S2S)            |
| Impact             | `subId1`    | Yes (S2S)            |
| Awin               | `clickref`  | Yes (S2S)            |
| Rakuten            | `u1`        | Yes (S2S)            |
| Direct bank feeds  | Varies      | Sometimes CSV export |

We store the per-card affiliate config server-side so the mapping can
change without a redeploy.

---

## Schema additions

Add to `apps/web/src/db/schema.ts`:

```ts
/**
 * Server-side catalogue of affiliate offers, one row per (card, network).
 * Mutable without deploy — new offers or updated URLs flow through the
 * DB. Multiple rows per card is legal so we can A/B networks or fall
 * back if one goes down.
 */
export const affiliateOffers = pgTable(
  'affiliate_offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Matches the card catalogue's IATA-style id in @ph/shared. */
    cardId: text('card_id').notNull(),
    network: text('network').notNull(), // e.g. 'commission_factory'
    /** URL template. `{subid}` is substituted at click time with the
     *  requesting device's id. Any other placeholders get passed through. */
    urlTemplate: text('url_template').notNull(),
    /** Reward the user unlocks on approved conversion, if any. Free-form
     *  JSON so we can iterate on reward types without migrations. Current
     *  known shape: { kind: 'pro_access', months: 12 } */
    onApprovedReward: jsonb('on_approved_reward').$type<Reward | null>(),
    /** Attribution window in days from click. Postback conversions older
     *  than (click + windowDays) are ignored. Typical: 60-90. */
    windowDays: text('window_days').notNull().default('60'),
    active: text('active').notNull().default('true'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cardIdx: index('affiliate_offers_card_idx').on(t.cardId),
  }),
);

/**
 * One row per click on an "Apply now" link. Used as the join target for
 * inbound postbacks (subid → device_id → click_id).
 */
export const affiliateClicks = pgTable(
  'affiliate_clicks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: text('device_id').notNull(),
    cardId: text('card_id').notNull(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => affiliateOffers.id),
    /** IP + UA at click time — used for debugging attribution disputes.
     *  Not exposed to the client. */
    ip: text('ip'),
    userAgent: text('user_agent'),
    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceIdx: index('affiliate_clicks_device_idx').on(t.deviceId),
  }),
);

/**
 * One row per confirmed conversion (approved application). Populated
 * by the postback handler. Grants get created as a side effect when
 * status flips to 'approved' AND the source offer has an onApprovedReward.
 */
export const affiliateConversions = pgTable(
  'affiliate_conversions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** The click this conversion is attributed to. Null if we get a
     *  postback whose subid doesn't map to a known click (fraud probe
     *  or the click is older than the attribution window). */
    clickId: uuid('click_id').references(() => affiliateClicks.id),
    deviceId: text('device_id').notNull(),
    cardId: text('card_id').notNull(),
    /** Network's own conversion id — dedupe key so replayed postbacks
     *  don't stack. */
    externalId: text('external_id').notNull(),
    status: text('status').notNull(), // 'pending' | 'approved' | 'declined' | 'reversed'
    /** In AUD cents so we can sum without float drift. */
    commissionCents: text('commission_cents'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    reversedAt: timestamp('reversed_at', { withTimezone: true }),
    /** Raw postback payload for audit. Compressed by Postgres TOAST at
     *  rest. Redact anything that could be PII before write. */
    rawPayload: jsonb('raw_payload'),
  },
  (t) => ({
    externalUniq: uniqueIndex('affiliate_conversions_external_uniq').on(t.externalId),
    deviceIdx: index('affiliate_conversions_device_idx').on(t.deviceId),
  }),
);

/**
 * Rewards granted to a device. One row per (device, reward kind). If a
 * user converts twice, we extend expiresAt on the existing row rather
 * than stacking. `sourceConversionId` points back at the trigger so
 * reversals can revoke grants cleanly.
 */
export const deviceGrants = pgTable(
  'device_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: text('device_id').notNull(),
    /** Reward kind — one of a known enum on the client. */
    kind: text('kind').notNull(), // e.g. 'pro_access'
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    sourceConversionId: uuid('source_conversion_id').references(() => affiliateConversions.id),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    deviceKindIdx: uniqueIndex('device_grants_device_kind_uniq').on(t.deviceId, t.kind),
  }),
);

export type Reward = { kind: 'pro_access'; months: number };
```

---

## API routes

### Outbound: `GET /api/apply/[cardId]`

Client renders "Apply now" as a link to this route (with the device id
already in the request via cookie or query). Handler picks the active
offer, substitutes the subid, records the click, redirects.

```ts
// apps/web/src/app/api/apply/[cardId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { affiliateOffers, affiliateClicks } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { cardId: string } }) {
  const deviceId = req.nextUrl.searchParams.get('device') ?? req.cookies.get('ph_device')?.value;
  if (!deviceId) {
    return NextResponse.json({ error: 'no_device' }, { status: 400 });
  }

  const db = getDb();
  const [offer] = await db
    .select()
    .from(affiliateOffers)
    .where(and(eq(affiliateOffers.cardId, params.cardId), eq(affiliateOffers.active, 'true')))
    .limit(1);

  if (!offer) {
    // No affiliate deal — fall through to the bank's direct URL.
    // Product decision: send the user anyway (with no attribution)
    // rather than block. Alternative: 404. Confirm with product.
    return NextResponse.redirect(fallbackApplyUrl(params.cardId));
  }

  // Record the click BEFORE redirect so a slow DB doesn't lose it.
  await db.insert(affiliateClicks).values({
    deviceId,
    cardId: params.cardId,
    offerId: offer.id,
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  const target = offer.urlTemplate.replace('{subid}', encodeURIComponent(deviceId));
  return NextResponse.redirect(target, 302);
}
```

Client wires this in the `/matching` card list — replace direct card
URLs with `/api/apply/${card.id}`. Cookie `ph_device` gets set at app
init from the same value the client already uses for `push_subscriptions`.

---

### Inbound: `POST /api/affiliate/postback/[network]`

Networks POST here when a conversion happens. Signature verification is
per-network (each has its own HMAC scheme). Handler:

1. Verifies signature
2. Parses payload
3. Upserts a conversion row (deduped on `externalId`)
4. If status flipped to 'approved' AND the offer has a reward → grants
5. If status flipped to 'reversed' → revokes the grant

```ts
// apps/web/src/app/api/affiliate/postback/[network]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { affiliateOffers, affiliateClicks, affiliateConversions, deviceGrants } from '@/db/schema';
import { verifySignature, parsePayload } from '@/lib/affiliate/networks';
import type { Reward } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { network: string } }) {
  const rawBody = await req.text();
  if (!verifySignature(params.network, req.headers, rawBody)) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  const p = parsePayload(params.network, rawBody);
  // p: { externalId, subid, cardId?, status, commissionCents?, occurredAt }

  const db = getDb();

  // Find the originating click — subid is the device_id we injected.
  // We match on device + card + within-window to avoid cross-attribution
  // when the same device applied for multiple cards.
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 90); // upper-bound; real window is per-offer

  const [click] = await db
    .select()
    .from(affiliateClicks)
    .where(
      and(
        eq(affiliateClicks.deviceId, p.subid),
        p.cardId ? eq(affiliateClicks.cardId, p.cardId) : sql`true`,
        gte(affiliateClicks.clickedAt, windowStart),
      ),
    )
    .orderBy(sql`${affiliateClicks.clickedAt} desc`)
    .limit(1);

  // Idempotent upsert — same externalId can arrive twice from network
  // retries. ON CONFLICT DO UPDATE lets status flip pending → approved.
  const [conv] = await db
    .insert(affiliateConversions)
    .values({
      clickId: click?.id ?? null,
      deviceId: p.subid,
      cardId: click?.cardId ?? p.cardId ?? 'unknown',
      externalId: p.externalId,
      status: p.status,
      commissionCents: p.commissionCents,
      approvedAt: p.status === 'approved' ? new Date() : null,
      reversedAt: p.status === 'reversed' ? new Date() : null,
      rawPayload: JSON.parse(rawBody), // redact PII if network sends it
    })
    .onConflictDoUpdate({
      target: affiliateConversions.externalId,
      set: {
        status: p.status,
        commissionCents: p.commissionCents,
        approvedAt: p.status === 'approved' ? new Date() : undefined,
        reversedAt: p.status === 'reversed' ? new Date() : undefined,
      },
    })
    .returning();

  // Reward side effects
  if (p.status === 'approved' && click) {
    const [offer] = await db
      .select()
      .from(affiliateOffers)
      .where(eq(affiliateOffers.id, click.offerId))
      .limit(1);
    const reward: Reward | null = offer?.onApprovedReward ?? null;
    if (reward?.kind === 'pro_access') {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + reward.months);
      await db
        .insert(deviceGrants)
        .values({
          deviceId: p.subid,
          kind: 'pro_access',
          expiresAt: expires,
          sourceConversionId: conv?.id,
        })
        .onConflictDoUpdate({
          target: [deviceGrants.deviceId, deviceGrants.kind],
          // Extend rather than stack — take the later of existing/new expiry
          set: { expiresAt: sql`GREATEST(${deviceGrants.expiresAt}, ${expires})` },
        });
    }
  }

  if (p.status === 'reversed' && conv?.id) {
    // Revoke the grant this conversion triggered (if any)
    await db
      .update(deviceGrants)
      .set({ revokedAt: new Date() })
      .where(eq(deviceGrants.sourceConversionId, conv.id));
  }

  return NextResponse.json({ ok: true });
}
```

The network-specific bits (`verifySignature`, `parsePayload`) live in
`apps/web/src/lib/affiliate/networks.ts` — one adapter per network so
we can add/change networks without touching the route.

---

## Client integration

Add a "You have Pro access · unlocked when you got the Amex Platinum"
banner and hydrate a `useDeviceGrantsStore` from `GET
/api/device/grants` (also new — trivial `select where deviceId = ?`).

For the "Apply" CTAs on `/matching`, swap the outbound href from the
card's direct URL to `/api/apply/${card.id}`. That's a one-line change
in `CardTile.tsx`.

## Compliance notes

- **Disclosure** — ASIC RG 209 requires disclosing you receive
  commission. Add "We may receive a commission if you're approved
  through this link. This doesn't cost you anything." near every Apply
  CTA and in the T&Cs.
- **Limited Use policy** on our Postgres data — same shape as the
  `push_subscriptions` rules: no PII, opaque device ids only, no
  cross-user analytics that could re-identify.
- **Reversal handling** — always process `reversed` status. If a
  benefit was granted and the conversion later reverses, the grant is
  revoked but any usage during the good-faith window stays. Users
  don't lose data.

## Testing

- Postmark-style webhook replay tool: `pnpm affiliate:replay
fixtures/cf-approved.json` — POSTs a captured payload to
  `http://localhost:3000/api/affiliate/postback/commission_factory`
  with a valid signature so we can dev without a live network.
- Fixtures per network in `apps/web/__fixtures__/affiliate/`.

## Migration path to real auth

When we add user accounts (probably needed at some point for
cross-device grants), the schema barely changes: add `user_id` column
to `affiliate_clicks`, `affiliate_conversions`, `device_grants`. The
grants system operates on user_id when present, falls back to device_id
otherwise. Existing device-only grants get migrated on first login.
