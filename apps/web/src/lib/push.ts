// Server-side helper for dispatching web-push notifications.
//
// Lazy VAPID setup: web-push reads details from a module-level call, which
// would crash on import if env vars are missing (build-time evaluation).
// `ensureVapidConfigured()` runs on the first send() instead.
//
// Caller should handle the `gone` sentinel by marking the subscription
// revoked — browsers return 410/404 when the user has uninstalled the PWA
// or revoked permission, and we shouldn't keep retrying.

import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';

let configured = false;

function ensureVapidConfigured(): void {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      'VAPID env vars missing. Need VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.',
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep link the SW will open on click. Optional — falls back to the
   *  app root. */
  url?: string;
  /** Used by the SW to dedupe / replace prior notifications of the same
   *  kind (e.g. multiple spend-by reminders for one card). */
  tag?: string;
}

export type SendPushResult =
  | { ok: true; statusCode: number }
  | { ok: false; gone: true; statusCode: number }
  | { ok: false; gone: false; statusCode: number; error: string };

/**
 * Send a single push. Returns a discriminated result so callers can react
 * to expired subscriptions (`gone: true`) without parsing exception
 * messages.
 */
export async function sendPush(
  subscription: WebPushSubscription,
  payload: PushPayload,
): Promise<SendPushResult> {
  ensureVapidConfigured();
  try {
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // expire after 24h if undelivered
    );
    return { ok: true, statusCode: res.statusCode };
  } catch (err) {
    // web-push throws WebPushError with .statusCode on HTTP failures.
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: unknown }).statusCode) || 0
        : 0;
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, gone: true, statusCode };
    }
    return {
      ok: false,
      gone: false,
      statusCode,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Convert a stored db row into the shape web-push expects. */
export function subscriptionFromDb(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): WebPushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}
