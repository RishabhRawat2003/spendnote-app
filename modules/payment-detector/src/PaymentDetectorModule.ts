import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { DetectedPayment, PaymentDetectorModuleEvents } from './PaymentDetector.types';

declare class PaymentDetectorModule extends NativeModule<PaymentDetectorModuleEvents> {
  isListenerEnabled(): boolean;
  openListenerSettings(): void;
  getPendingPayments(): DetectedPayment[];
  removePendingPayments(ids: string[]): void;
  configure(enabled: boolean, minAmountPaise: number): void;
  simulatePayment(packageName: string, title: string, text: string): boolean;
}

/** `null` in Expo Go, on iOS and on web, where the native module isn't compiled in. */
export default requireOptionalNativeModule<PaymentDetectorModule>('PaymentDetector');
