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
const CODE_FALLBACK = /\b([0-9]{9})\b/; // Google's codes are 9 digits
const URL_REGEX = /https:\/\/mail-settings\.google\.com\/[^\s"'<>]+/i;

export function parseGmailVerification(email: ParsedInboundEmail): ParserOutcome | null {
  // Subject guard so we don't false-positive on any 9-digit run in
  // marketing mail from Google.
  const isVerification =
    /forwarding\s+confirmation/i.test(email.subject) ||
    /gmail\s+forwarding/i.test(email.subject) ||
    /confirm\s+your\s+email\s+forwarding/i.test(email.subject);
  if (!isVerification) return null;

  const body = email.text;
  const codeMatch = body.match(CODE_REGEX) ?? body.match(CODE_FALLBACK);
  if (!codeMatch || !codeMatch[1]) return null;

  const urlMatch = body.match(URL_REGEX);

  return {
    kind: 'gmail_verification',
    code: codeMatch[1],
    confirmUrl: urlMatch?.[0],
  };
}

/**
 * POSTs the confirmation URL Google embedded in the mail to complete
 * the forwarding setup automatically. Returns true when the request
 * succeeds; false otherwise (caller logs to email_events.detail).
 *
 * Note: Google's confirmation URL is a plain GET — no auth, the URL's
 * opaque token IS the auth. That's why we ignore the code once we
 * have the URL; visiting the URL confirms.
 */
export async function confirmGmailForwardingUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      // No cookies, no referer — this endpoint auths on the URL token.
      redirect: 'follow',
    });
    return res.ok;
  } catch {
    return false;
  }
}
