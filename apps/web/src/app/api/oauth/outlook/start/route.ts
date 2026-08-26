// GET /api/oauth/outlook/start?deviceId=…
//
// First half of the Outlook OAuth flow. Mints a CSRF-safe state
// token (binds the callback to this specific deviceId + a random
// nonce), stashes it in an HTTP-only cookie, and redirects the user
// to Microsoft's consent screen. When Microsoft redirects back to
// /callback with an auth code, the callback verifies the state
// matches the cookie before exchanging the code.
//
// This is a GET because we're initiating a browser redirect — the
// user taps a link on the Sync wizard. Returning JSON with a URL
// and expecting the client to redirect works but adds a hop.

import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

const AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
// Requested scopes:
//   Mail.Read       — read the user's inbox (server-side filter to
//                     Qantas / Velocity balance emails).
//   offline_access  — long-lived refresh_token (required — access
//                     tokens expire in an hour and we sync on-demand).
//   User.Read       — read basic profile (used to display 'Connected
//                     to alice@outlook.com' in Settings).
const SCOPES = ['Mail.Read', 'offline_access', 'User.Read'];
const STATE_COOKIE = 'ph-outlook-oauth-state';
const STATE_TTL_SECONDS = 60 * 15; // 15 min — user should complete consent well within this

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    // Fail closed so users don't hit Microsoft's error screen for a
    // config we forgot to set. The 503 mirrors how /api/tts and the
    // parse routes behave when their keys are missing.
    return NextResponse.json({ error: 'outlook oauth not configured' }, { status: 503 });
  }

  const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  }

  // State = base64({nonce, deviceId}). Cookie stores the nonce only;
  // callback verifies the cookie's nonce matches the state's nonce
  // AND the state's deviceId matches the query-param deviceId. Bind
  // both prevents a stolen state from being replayed against a
  // different device.
  const nonce = randomBytes(16).toString('base64url');
  const state = Buffer.from(JSON.stringify({ nonce, deviceId })).toString('base64url');

  // Redirect URI must match what's registered in the Azure app.
  const redirectUri = new URL('/api/oauth/outlook/callback', req.nextUrl.origin).toString();

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('state', state);
  // prompt=select_account so users with multiple MS accounts land on
  // the picker rather than SSO-ing whichever they hit first.
  authUrl.searchParams.set('prompt', 'select_account');

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/oauth/outlook',
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
