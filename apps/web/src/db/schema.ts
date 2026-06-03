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

// Inferred TS types — use these in API routes and helpers.
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type AlertProjection = typeof alertProjections.$inferSelect;
export type NewAlertProjection = typeof alertProjections.$inferInsert;
