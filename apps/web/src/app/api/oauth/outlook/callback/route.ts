// GET /api/oauth/outlook/callback?code=…&state=…
//
// Second half of the Outlook OAuth flow. Microsoft redirects here
// after the user consents (or declines). We:
//   1. Verify the state matches the cookie nonce (CSRF protection).
//   2. Extract the deviceId from the state.
//   3. Exchange the auth code for tokens (access + refresh).
//   4. Fetch the user's email from Graph /me so we can display it.
//   5. Encrypt the refresh token via lib/oauth-crypto.
//   6. Upsert into linked_outlook_accounts by device_id (reconnects
//      overwrite; no duplicate rows).
//   7. Redirect back to the app with a success flag.
//
// Errors redirect to the app with an ?error= flag rather than
// returning JSON — this callback is browser-driven, users need to
// land somewhere sensible in either case.

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { linkedOutlookAccounts } from '@/db/schema';
import { encryptToken } from '@/lib/oauth-crypto';

export const runtime = 'nodejs';

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const STATE_COOKIE = 'ph-outlook-oauth-state';
// Where in the app to land after the callback runs. Deep-link back
// to Journeys > Balances since that's where the Sync wizard lives.
const APP_LANDING = '/journeys?tab=balances';

function redirectHome(req: NextRequest, params: Record<string, string>) {
  const url = new URL(APP_LANDING, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url.toString());
  res.cookies.delete(STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectHome(req, { outlook: 'config_error' });
  }

  const url = req.nextUrl;
  // MS forwards ?error=<code>&error_description=... on decline. Land
  // the user back home with a friendly flag rather than blank JSON.
  const msError = url.searchParams.get('error');
  if (msError) {
    return redirectHome(req, { outlook: 'declined' });
  }

  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  if (!code || !stateRaw) {
    return redirectHome(req, { outlook: 'missing_params' });
  }

  // State check: parse the base64 payload, compare its nonce to the
  // cookie, extract the deviceId. Either mismatch → bail.
  let deviceId: string | null = null;
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
      nonce?: string;
      deviceId?: string;
    };
    const cookieNonce = req.cookies.get(STATE_COOKIE)?.value;
    if (!parsed.nonce || !parsed.deviceId || !cookieNonce || parsed.nonce !== cookieNonce) {
      return redirectHome(req, { outlook: 'state_mismatch' });
    }
    deviceId = parsed.deviceId;
  } catch {
    return redirectHome(req, { outlook: 'state_malformed' });
  }

  // Exchange the auth code for tokens. The redirect_uri MUST match
  // what start/route.ts used — MS compares byte-for-byte.
  const redirectUri = new URL('/api/oauth/outlook/callback', req.nextUrl.origin).toString();
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  let tokens: { access_token: string; refresh_token?: string; expires_in: number };
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    if (!res.ok) {
      return redirectHome(req, { outlook: 'token_exchange_failed' });
    }
    tokens = await res.json();
  } catch {
    return redirectHome(req, { outlook: 'token_exchange_network' });
  }

  if (!tokens.refresh_token) {
    // Should never happen if we requested offline_access, but guard
    // anyway — no refresh_token means we can't sync later.
    return redirectHome(req, { outlook: 'no_refresh_token' });
  }

  // Fetch the user's email address so we can display it in the UI.
  let email = '';
  try {
    const meRes = await fetch(GRAPH_ME_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as { mail?: string; userPrincipalName?: string };
      email = me.mail ?? me.userPrincipalName ?? '';
    }
  } catch {
    // Non-fatal — we can still sync without knowing the email; UI
    // just shows "Outlook connected" instead of the address.
  }

  const encrypted = encryptToken(tokens.refresh_token);
  const db = getDb();

  // Upsert by device_id — a reconnect overwrites the previous row
  // (new refresh token, cleared revoked_at).
  const existing = await db
    .select({ id: linkedOutlookAccounts.id })
    .from(linkedOutlookAccounts)
    .where(eq(linkedOutlookAccounts.deviceId, deviceId))
    .limit(1);
  if (existing[0]) {
    await db
      .update(linkedOutlookAccounts)
      .set({
        refreshTokenEncrypted: encrypted,
        email,
        connectedAt: new Date(),
        revokedAt: null,
      })
      .where(and(eq(linkedOutlookAccounts.id, existing[0].id)));
  } else {
    await db.insert(linkedOutlookAccounts).values({
      deviceId,
      refreshTokenEncrypted: encrypted,
      email,
    });
  }

  return redirectHome(req, { outlook: 'connected' });
}
