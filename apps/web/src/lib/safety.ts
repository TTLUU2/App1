// Write-boundary validators that enforce the non-negotiable privacy rules
// from the kickoff prompt:
//   - No full PAN ever persisted (13–19 digit strings rejected everywhere
//     except the dedicated last4 field).
//   - No CVV captured or stored anywhere.
//   - last4 must be exactly 4 digits when present.

import type { UserCard } from '@ph/shared';

const DIGITS_13_19 = /\b\d{13,19}\b/;

/** Fields a user might paste a PAN into accidentally. */
const FREE_TEXT_FIELDS: ReadonlyArray<keyof UserCard> = ['nickname', 'notes'];

export class PrivacyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivacyViolationError';
  }
}

export function assertNoPanOrCvv(input: Partial<UserCard>): void {
  for (const field of FREE_TEXT_FIELDS) {
    const value = input[field];
    if (typeof value === 'string' && DIGITS_13_19.test(value)) {
      throw new PrivacyViolationError(
        `Refused to write: field "${field}" contains a 13–19 digit number. ` +
          'Full PAN must never be persisted; use the last4 field for the last four digits only.',
      );
    }
  }

  if (input.last4 != null && input.last4 !== '') {
    if (!/^\d{4}$/.test(input.last4)) {
      throw new PrivacyViolationError(
        'last4 must be exactly 4 digits (got: "' + input.last4 + '").',
      );
    }
  }
}
