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
}

export type PaymentDetectorModuleEvents = {
  onPaymentDetected: (payment: DetectedPayment) => void;
};
