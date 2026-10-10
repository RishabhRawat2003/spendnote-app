import PaymentDetector, { type DetectedPayment } from '@modules/payment-detector';
import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { INCOME_CATEGORY_ID } from '@/data/defaultCategories';
import { SOURCES } from '@/data/sources';
import type { DetectedInput } from '@/lib/api';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';
import type { Source } from '@/types';

/** False in Expo Go, iOS and web: detection needs the native module in an Android build. */
export const isPaymentDetectionAvailable = PaymentDetector != null;

const GPAY_PACKAGE = 'com.google.android.apps.nbu.paisa.user';

function toDetectedInput(payment: DetectedPayment): DetectedInput {
  const source: Source = payment.source in SOURCES ? (payment.source as Source) : 'gpay';
  return {
    externalId: payment.id,
    amount: payment.amount,
    type: payment.type,
    merchant: payment.merchant ?? `${SOURCES[source].label} payment`,
    ...(payment.upiId ? { upiId: payment.upiId } : {}),
    source,
    date: new Date(payment.postedAt).toISOString(),
    categoryId: payment.type === 'credit' ? INCOME_CATEGORY_ID : null,
    worthIt: null,
    tags: [],
  };
}

let ingesting: Promise<number> | null = null;

/**
 * Sends payments captured natively (possibly while the app was closed) to the server. They stay
 * queued on the phone until the server confirms, so nothing is lost when offline.
 */
export function ingestPendingPayments(): Promise<number> {
  if (!PaymentDetector) return Promise.resolve(0);
  const detector = PaymentDetector;
  ingesting ??= (async () => {
    try {
      const pending = detector.getPendingPayments();
      if (pending.length === 0) return 0;
      const added = await useTransactions.getState().addDetected(pending.map(toDetectedInput));
      detector.removePendingPayments(pending.map((p) => p.id));
      return added;
    } finally {
      ingesting = null;
    }
  })();
  return ingesting;
}

const ingestQuietly = () => void ingestPendingPayments().catch(() => {});

/** Keeps the native side in sync with settings and pulls in new payments. Mount once while logged in. */
export function usePaymentDetection(active: boolean) {
  const autoDetect = useSettings((s) => s.autoDetect);
  const minPromptAmount = useSettings((s) => s.minPromptAmount);

  useEffect(() => {
    PaymentDetector?.configure(autoDetect, minPromptAmount);
  }, [autoDetect, minPromptAmount]);

  useEffect(() => {
    if (!active || !PaymentDetector) return;
    ingestQuietly();
    const detected = PaymentDetector.addListener('onPaymentDetected', ingestQuietly);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') ingestQuietly();
    });
    return () => {
      detected.remove();
      appState.remove();
    };
  }, [active]);
}

function needsNotificationPermission() {
  return Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33;
}

/** Live status of the two permissions detection needs, refreshed whenever the app comes back to the foreground. */
export function useDetectionPermissions() {
  const [listenerEnabled, setListenerEnabled] = useState(() => PaymentDetector?.isListenerEnabled() ?? false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(!needsNotificationPermission());

  useEffect(() => {
    if (!PaymentDetector) return;
    const refresh = () => {
      setListenerEnabled(PaymentDetector?.isListenerEnabled() ?? false);
      if (needsNotificationPermission()) {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).then(setNotificationsAllowed);
      }
    };
    const timer = setTimeout(refresh, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  const openListenerSettings = () => PaymentDetector?.openListenerSettings();

  const requestNotifications = async () => {
    if (!needsNotificationPermission()) return;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    setNotificationsAllowed(result === PermissionsAndroid.RESULTS.GRANTED);
  };

  return { listenerEnabled, notificationsAllowed, openListenerSettings, requestNotifications };
}

/** Runs a fake GPay notification through the real native pipeline. */
export function sendTestPayment(): boolean {
  if (!PaymentDetector) return false;
  const rupees = 120 + Math.floor(Math.random() * 380);
  return PaymentDetector.simulatePayment(GPAY_PACKAGE, 'Payment successful', `₹${rupees} paid to Test Café`);
}
