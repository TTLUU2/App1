// Shared types for the unified add-card flow.

export interface CollectedCard {
  cardId: string | null;
  last4: string | null;
  expiryMonthYear: string | null;
  activationDate: string | null;
  annualFeeNextDueDate: string | null;
  bonusReceived: boolean | null;
  bonusTarget: number | null;
  bonusSpendWindowEndDate: string | null;
}

export interface ChatBubble {
  /** Prompt shown by the assistant. */
  question: string;
  /** Human-readable rendering of the user's answer (for the history). */
  answerLabel: string;
}

export type PhotoOption = 'capture' | 'upload' | 'manual';
