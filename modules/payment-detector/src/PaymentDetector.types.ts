/** A payment captured from a supported app's notification, waiting to become a transaction. */
export interface DetectedPayment {
  id: string;
  /** SpendNote source id, e.g. "gpay". */
  source: string;
  packageName: string;
  title: string | null;
  text: string | null;
  /** In paise. */
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  upiId: string | null;
  /** Epoch milliseconds. */
  postedAt: number;
  /** Money moved between the user's own accounts (self transfer, card bill). */
  isTransfer?: boolean;
  /** Last 4 digits of the account/card when parsed from SMS/email (e.g. XX1234). */
  last4?: string | null;
}

export type DetectionOutcome = 'saved' | 'duplicate' | 'skipped' | 'disabled';

/** One notification the listener looked at. Personal SMS are never recorded. */
export interface DetectionActivity {
  /** Epoch milliseconds when it was processed. */
  at: number;
  postedAt: number;
  source: string;
  /** e.g. "Google Pay" or "Canara Bank SMS". */
  app: string;
  outcome: DetectionOutcome;
  detail: string;
  /** Title and text of UPI app notifications; absent for SMS. */
  preview?: string;
  amount?: number;
  type?: 'debit' | 'credit';
  merchant?: string | null;
  isTransfer?: boolean;
}

export interface DetectionDiagnostics {
  enabled: boolean;
  minAmountPaise: number;
  /** Notification access is granted in Android settings. */
  listenerEnabled: boolean;
  /** Android has actually bound the listener service right now. */
  listenerConnected: boolean;
  /** Epoch milliseconds, 0 if never. */
  connectedAt: number;
  disconnectedAt: number;
  pendingCount: number;
}

export type PaymentDetectorModuleEvents = {
  onPaymentDetected: (payment: DetectedPayment) => void;
};
