// Gmail forwarding-address auto-verification.
//
// When a user adds our forwarding address to their Gmail settings,
// Google fires a confirmation email to *that* address (i.e. lands in
// our Postmark inbox) containing:
//
//   - A short numeric confirmation code (~9 digits)
//   - A URL of the form
//     https://mail-settings.google.com/mail/vf-%5B...%5D
//     that clicking would confirm the setup
//
// Instead of surfacing the code to the user (Decision #31 promises
// "we auto-verify"), the inbound-email route hits Google's URL server-
// side using the extracted code. That's what makes the forwarding
// setup feel like "paste address, done" from the user's perspective.
//
// Reference: Google has never published a formal API for this flow;
// the pattern is well-known from mail-forwarder services (Fastmail
// docs describe it, Kill the Newsletter uses the same trick, etc.).
// If Google changes the email format, this handler needs a matching
// update — regressions surface as "verification code detected but no
// URL" ignored rows in email_events.

import type { ParsedInboundEmail, ParserOutcome } from './index';

const CODE_REGEX = /confirmation\s+code[^0-9]{0,30}([0-9]{6,12})/i;
const CODE_FALLBACK = /\b([0-9]{9})\b/; // Older Google templates use 9 digits.
// Google's current confirmation URL host is `mail.google.com/mail/vf-...`
// (older docs quoted `mail-settings.google.com` — that variant is dead but
// harmless to keep in the alternation for defensive resilience). We anchor
// on the `/vf-` path so we don't false-positive on marketing links to
// mail.google.com. Trailing `[^\s"'<>]+` grabs the whole opaque token,
// including URL-encoded brackets (%5B / %5D) that Google embeds.
const URL_REGEX =
  /https:\/\/(?:mail-settings\.google\.com\/mail|mail\.google\.com\/mail)\/vf-[^\s"'<>]+/i;

export function parseGmailVerification(email: ParsedInboundEmail): ParserOutcome | null {
  // Subject guard so we don't false-positive on any 9-digit run in
  // marketing mail from Google.
  const isVerification =
    /forwarding\s+confirmation/i.test(email.subject) ||
    /gmail\s+forwarding/i.test(email.subject) ||
    /confirm\s+your\s+email\s+forwarding/i.test(email.subject);
  if (!isVerification) return null;

  const body = email.text;
  // Google's current forwarding template ships URL only — no numeric
  // code. Either signal is sufficient to auto-verify (hitting the URL
  // is what actually completes the setup; the code is a legacy
  // alternative). We short-circuit as long as ONE of them is present.
  const codeMatch = body.match(CODE_REGEX) ?? body.match(CODE_FALLBACK);
  const urlMatch = body.match(URL_REGEX);

  if (!codeMatch?.[1] && !urlMatch) return null;

  return {
    kind: 'gmail_verification',
    // Code stays as an empty string when Google omits it — the caller
    // only needs it for logging / manual paste fallback; the URL is
    // the actual verification action.
    code: codeMatch?.[1] ?? '',
    confirmUrl: urlMatch?.[0],
  };
}

/**
 * Server-side auto-verify is currently DISABLED.
 *
 * Historical intent: hit Google's confirm URL from our server so the
 * user experience is "paste address, done" — no click required. Real-
 * world testing (2026-08-24) showed the token behaves as single-use
 * AND requires a signed-in Gmail browser session to actually verify.
 * A plain server-side fetch either (a) gets a 200 "sign in to continue"
 * page while leaving the URL usable, OR (b) follows a redirect that
 * Google treats as consuming the token — leaving the user's own click
 * with a 400. Either way, the server hit is at best useless and at
 * worst breaks the manual path.
 *
 * Behaviour now: the parser still extracts the URL and logs it into
 * `email_events.detail.confirmUrl`. The forwarding-noreply email
 * received here still arrives at the user's Gmail (Google sends it
 * to both the recipient AND the setup account), so the user clicks
 * the link themselves — normal manual flow.
 *
 * When we resurrect server-side confirm, options are:
 *   1. Save the browser cookies out-of-band (impractical).
 *   2. Ship a browser extension that clicks on the user's behalf.
 *   3. Wait until Google publishes a real API for this.
 * Meanwhile: return false; parser reports confirmed=false; user
 * clicks the URL themselves.
 */
export async function confirmGmailForwardingUrl(_url: string): Promise<boolean> {
  void _url;
  return false;
}
