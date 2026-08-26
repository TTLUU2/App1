// AES-256-GCM helper for encrypting OAuth refresh tokens at rest.
//
// Threat model: a database export or read-replica leak shouldn't
// expose active refresh tokens. Neon already encrypts at rest; this
// adds an app-layer envelope so even a legitimate SQL query (support
// runbook, backup extract) doesn't hand out plaintext tokens.
//
// Key management: OAUTH_TOKEN_ENCRYPTION_KEY is a base64-encoded 32
// random bytes stored in Vercel env. Rotating means re-encrypting
// every row — deliberately not automated here; the runbook is:
//   1. Generate new key, add as OAUTH_TOKEN_ENCRYPTION_KEY_NEXT.
//   2. Deploy a migration route that decrypts with OLD, re-encrypts
//      with NEXT for every linked_outlook_accounts row.
//   3. Swap OAUTH_TOKEN_ENCRYPTION_KEY → new value, delete _NEXT.
// Skipped implementation until we actually rotate.
//
// Format: `v1:{iv-base64}:{tag-base64}:{ciphertext-base64}` — the
// v1 prefix reserves room for future format changes (e.g. adding an
// AAD field or moving to a KMS-wrapped key).

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_ENV = 'OAUTH_TOKEN_ENCRYPTION_KEY';
const ALG = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256

function loadKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(
      `${KEY_ENV} not set. Generate with \`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"\` and add to Vercel env.`,
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${KEY_ENV} must decode to ${KEY_BYTES} bytes; got ${key.length}. Regenerate with the command in ${KEY_ENV}'s missing-key error.`,
    );
  }
  return key;
}

/** Encrypt a plaintext string. Returns a self-describing token string
 *  safe to store in a plain text column. Empty input returns empty
 *  string (callers can pre-check but zero-length is not a security
 *  concern — nothing to hide). */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/** Decrypt a token produced by encryptToken. Throws on missing key,
 *  wrong version, or authentication-tag mismatch (tamper detection).
 *  Callers should treat a throw as 'this token is unusable — user
 *  must reconnect'. */
export function decryptToken(encoded: string): string {
  if (!encoded) return '';
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error(`unrecognised token format (expected v1:iv:tag:ct, got ${parts.length} parts)`);
  }
  const [, ivB64, tagB64, ctB64] = parts;
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('token format v1: missing iv, tag, or ciphertext');
  }
  const key = loadKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return plaintext;
}
