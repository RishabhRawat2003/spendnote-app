import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  DetectedPayment,
  DetectionActivity,
  DetectionDiagnostics,
  PaymentDetectorModuleEvents,
} from './PaymentDetector.types';

declare class PaymentDetectorModule extends NativeModule<PaymentDetectorModuleEvents> {
  isListenerEnabled(): boolean;
  openListenerSettings(): void;
  getPendingPayments(): DetectedPayment[];
  removePendingPayments(ids: string[]): void;
  configure(enabled: boolean, minAmountPaise: number): void;
  simulatePayment(packageName: string, title: string, text: string): boolean;
  /** Used to recognise payments to and from the user's own accounts. */
  setOwnerName(name: string): void;
  getDiagnostics(): DetectionDiagnostics;
  getActivity(): DetectionActivity[];
  clearActivity(): void;
  /** Forces Android to bind the listener again. Returns false when access is off or it's already bound. */
  reconnect(): boolean;
}

/** `null` in Expo Go, on iOS and on web, where the native module isn't compiled in. */
export default requireOptionalNativeModule<PaymentDetectorModule>('PaymentDetector');
