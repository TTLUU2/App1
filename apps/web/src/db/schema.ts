// Postgres schema for server-side state. Everything user-owned still lives
// in IndexedDB on the client (cards, redemptions, balances) — Postgres is
// only for things the server itself needs: push-notification subscriptions
// and the alert projections the daily cron scans to know when to fire.
//
// Design principle: the server never sees user PII. `device_id` is an opaque
// client-generated UUID stored in localStorage; card identifiers stored
// here are the client's local UserCard.id, which itself contains no PAN.

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * One row per (device, push endpoint) pair. A device may have multiple rows
 * if the user enables notifications in more than one browser. Endpoints are
 * stable per-device-per-push-service, so we PK on endpoint indirectly via
 * the unique constraint — the surrogate `id` is just for FK convenience.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Opaque client-generated UUID stored in localStorage. Survives logout
     *  / IndexedDB clears, lets a returning user keep their subscriptions. */
    deviceId: text('device_id').notNull(),
    /** The push service endpoint URL — unique per device per service. */
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    /** User-Agent string at subscribe time — helpful for debugging which
     *  browser unsubscribed, etc. Not used for personalisation. */
    userAgent: text('user_agent'),
    /** Which alert types this subscription opted into. Future-proofs the
     *  bonus-radar / transfer-bonus feeds; current list:
     *  'spend_by', 'fee_due', 'benefit_expiry'. */
    optedInTypes: jsonb('opted_in_types')
      .$type<string[]>()
      .notNull()
      .default(['spend_by', 'fee_due', 'benefit_expiry']),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set when the browser tells us the subscription is gone (410 on send),
     *  or when the user explicitly turns off notifications. Soft-delete so
     *  we keep an audit trail. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    endpointUniq: uniqueIndex('push_subscriptions_endpoint_uniq').on(t.endpoint),
    deviceIdx: index('push_subscriptions_device_idx').on(t.deviceId),
  }),
);

/**
 * Forward-projected alert rows the cron scans daily. Client computes the
 * fire dates from local card state (spend-by deadline minus 7 days, fee
 * due minus 7 days, etc.) and POSTs them up. Server holds them until the
 * fire date arrives, then dispatches and marks `dispatchedAt`.
 *
 * Idempotent upsert via the unique constraint — re-syncing the same
 * projections (e.g. after a card edit) replaces in place rather than
 * stacking duplicates.
 */
export const alertProjections = pgTable(
  'alert_projections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: text('device_id').notNull(),
    /** e.g. 'spend_by_T-7', 'spend_by_T-1', 'fee_due_T-7', 'benefit_expiry_T-7' */
    alertType: text('alert_type').notNull(),
    /** Client's local UserCard.id — opaque to the server. */
    sourceCardId: text('source_card_id').notNull(),
    /** When to dispatch the push (UTC date, AET resolved at dispatch time). */
    fireOnDate: date('fire_on_date').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** Optional deep link the notification opens, e.g. '/spend?card=uc_abc'. */
    dataUrl: text('data_url'),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex('alert_projections_uniq').on(
      t.deviceId,
      t.alertType,
      t.sourceCardId,
      t.fireOnDate,
    ),
    /** Cron scan index: WHERE fire_on_date <= today AND dispatched_at IS NULL */
    pendingIdx: index('alert_projections_pending_idx').on(t.fireOnDate, t.dispatchedAt),
  }),
);

/**
 * Per-device forwarding slug used by the balances auto-sync flow
 * (see DECISIONS.md #31). Each device gets one `{slug}@phcopilot.app`
 * address; users set up mail-provider filters to forward balance
 * emails from Qantas / Velocity / etc. to it. Postmark inbound webhook
 * dispatches to /api/inbound-email, which looks up the deviceId here.
 *
 * Slug format: three lowercase words hyphen-joined + 4 random digits
 * (e.g. `aurora-fox-7301`). Human-recognisable when the user pastes
 * it into Gmail's filter UI, low enough entropy to enumerate on paper
 * — but the address only accepts mail; it can't be used to read.
 */
export const linkedEmailForwards = pgTable(
  'linked_email_forwards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: text('device_id').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set when the user rotates their address (e.g. leaked to a bulk
     *  list). Old slug 404s from that point; a new row is inserted. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    slugUniq: uniqueIndex('linked_email_forwards_slug_uniq').on(t.slug),
    deviceIdx: index('linked_email_forwards_device_idx').on(t.deviceId),
  }),
);

/**
 * Full inbound-email log — one row per Postmark webhook, keyed by
 * Postmark's own MessageID for idempotency (a retried webhook doesn't
 * double-count a balance). Raw text/HTML is kept so a parser fix can
 * replay historical mail without re-forwarding. Also captures the
 * unmatched cases (unknown slug, unknown sender, parser miss) so we
 * can see the miss rate per program.
 *
 * Status transitions:
 *   received → matched → parsed  (balance made it to balance_updates)
 *   received → matched → ignored (Gmail verification, non-balance mail)
 *   received → matched → error   (parser threw)
 *   received → unmatched          (slug not in linked_email_forwards)
 */
export const emailEvents = pgTable(
  'email_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Postmark's MessageID — used as the idempotency key. */
    messageId: text('message_id').notNull(),
    /** The slug portion of the To address (before @phcopilot.app). */
    toSlug: text('to_slug').notNull(),
    /** Resolved device from linked_email_forwards.slug lookup; null
     *  when the slug isn't recognised. */
    deviceId: text('device_id'),
    fromEmail: text('from_email').notNull(),
    subject: text('subject').notNull(),
    /** 'received' | 'matched' | 'parsed' | 'ignored' | 'unmatched' | 'error' */
    status: text('status').notNull(),
    /** Populated when a parser recognises the sender. */
    programId: text('program_id'),
    /** Free-form details — parser output on success, error message on
     *  failure, ignore reason on 'ignored'. */
    detail: jsonb('detail').$type<Record<string, unknown>>(),
    /** Raw email payload (text body). Kept for replay. HTML is derivable
     *  from Postmark's inbound object if we ever need it — for now
     *  most parsers work off the text part. */
    rawText: text('raw_text'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Postmark can retry a webhook up to 3 days; the messageId lets us
     *  return 200 immediately on the second delivery without double-
     *  inserting. */
    messageIdUniq: uniqueIndex('email_events_message_id_uniq').on(t.messageId),
    deviceIdx: index('email_events_device_idx').on(t.deviceId),
    slugIdx: index('email_events_slug_idx').on(t.toSlug),
  }),
);

/**
 * Server-authoritative balance updates. Client's Zustand balances store
 * is still the source of truth for user edits — server pushes here
 * *only* originate from parsed inbound emails, and the client applies
 * them on next foreground fetch. Manual edits always win over auto
 * (client compares timestamps and prefers whichever is newer, with a
 * bias toward manual on tie).
 *
 * One row per (deviceId, programId, receivedAt) — history is kept, not
 * overwritten, so we can show "last 6 balances" for trend lines and
 * back out a bad parser output without losing the previous good value.
 */
export const balanceUpdates = pgTable(
  'balance_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: text('device_id').notNull(),
    /** Matches the client-side Program.id ('qantas', 'velocity', 'amex_mr', …). */
    programId: text('program_id').notNull(),
    /** Points balance in whole units (no fractional points at any AU program). */
    balance: text('balance').notNull(),
    /** Where this came from: 'forward' (Postmark inbound), 'gmail'
     *  (OAuth scrape), 'outlook' (OAuth scrape). Server-only origin
     *  — client-authored updates never write here. */
    source: text('source').notNull(),
    /** FK-ish reference back to the email_events row that produced this,
     *  so a support session can trace balance → email. Nullable because
     *  we may seed rows from other sources later. */
    sourceEventId: uuid('source_event_id'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Client polls: WHERE device_id = ? AND received_at > lastSyncAt */
    devicePollIdx: index('balance_updates_device_poll_idx').on(t.deviceId, t.receivedAt),
    /** Latest-per-program query: SELECT MAX(received_at) GROUP BY program. */
    deviceProgramIdx: index('balance_updates_device_program_idx').on(t.deviceId, t.programId),
  }),
);

// Inferred TS types — use these in API routes and helpers.
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type AlertProjection = typeof alertProjections.$inferSelect;
export type NewAlertProjection = typeof alertProjections.$inferInsert;
export type LinkedEmailForward = typeof linkedEmailForwards.$inferSelect;
export type NewLinkedEmailForward = typeof linkedEmailForwards.$inferInsert;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type NewEmailEvent = typeof emailEvents.$inferInsert;
export type BalanceUpdate = typeof balanceUpdates.$inferSelect;
export type NewBalanceUpdate = typeof balanceUpdates.$inferInsert;
