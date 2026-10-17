import PaymentDetector, {
  type DetectedPayment,
  type DetectionActivity,
  type DetectionDiagnostics,
} from '@modules/payment-detector';
import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { create } from 'zustand';

import { INCOME_CATEGORY_ID, TRANSFERS_CATEGORY_ID } from '@/data/defaultCategories';
import { SOURCES } from '@/data/sources';
import { ApiError, errorMessage, type DetectedInput } from '@/lib/api';
import { resolveAccountId } from '@/lib/resolveAccount';
import { useAccounts } from '@/store/useAccounts';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';
import type { Source } from '@/types';

/** False in Expo Go, iOS and web: detection needs the native module in an Android build. */
export const isPaymentDetectionAvailable = PaymentDetector != null;

const GPAY_PACKAGE = 'com.google.android.apps.nbu.paisa.user';
const GMAIL_PACKAGE = 'com.google.android.gm';

interface DetectionSyncState {
  lastSyncAt: number | null;
  lastSyncError: string | null;
}

/** Result of the last attempt to send captured payments to the server. */
export const useDetectionSync = create<DetectionSyncState>(() => ({ lastSyncAt: null, lastSyncError: null }));

function toDetectedInput(payment: DetectedPayment): DetectedInput {
  const source: Source = payment.source in SOURCES ? (payment.source as Source) : 'gpay';
  const accounts = useAccounts.getState().accounts;
  const accountId = resolveAccountId(accounts, source, payment.last4);
  return {
    externalId: payment.id,
    amount: payment.amount,
    type: payment.type,
    merchant: payment.merchant ?? `${SOURCES[source].label} payment`,
    ...(payment.upiId ? { upiId: payment.upiId } : {}),
    source,
    date: new Date(payment.postedAt).toISOString(),
    categoryId: payment.isTransfer ? TRANSFERS_CATEGORY_ID : payment.type === 'credit' ? INCOME_CATEGORY_ID : null,
    accountId,
    worthIt: null,
    tags: [],
    isTransfer: payment.isTransfer ?? false,
  };
}

/**
 * One malformed payment makes the server reject the whole batch, which would block the queue forever.
 * Send them separately and drop only the ones the server says are invalid.
 */
async function ingestOneByOne(detector: NonNullable<typeof PaymentDetector>, pending: DetectedPayment[]) {
  const done: string[] = [];
  let networkError: unknown = null;
  for (const payment of pending) {
    try {
      await useTransactions.getState().addDetected([toDetectedInput(payment)]);
      done.push(payment.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) done.push(payment.id);
      else networkError ??= err;
    }
  }
  detector.removePendingPayments(done);
  if (networkError) throw networkError;
}

let ingesting: Promise<number> | null = null;

/**
 * Sends payments captured natively (possibly while the app was closed) to the server. They stay
 * queued on the phone until the server confirms, so nothing is lost when offline.
 */
export function ingestPendingPayments(): Promise<number> {
  const detector = PaymentDetector;
  if (!detector) return Promise.resolve(0);
  // Clearing in `.finally` (not inside the async body) matters: with an empty queue the body never
  // awaits, so an inner `finally` would run before the assignment and the settled promise would stick.
  ingesting ??= sendPending(detector).finally(() => {
    ingesting = null;
  });
  return ingesting;
}

async function sendPending(detector: NonNullable<typeof PaymentDetector>): Promise<number> {
  try {
    const pending = detector.getPendingPayments();
    if (pending.length > 0) {
      try {
        await useTransactions.getState().addDetected(pending.map(toDetectedInput));
        detector.removePendingPayments(pending.map((p) => p.id));
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 400)) throw err;
        await ingestOneByOne(detector, pending);
      }
    }
    useDetectionSync.setState({ lastSyncAt: Date.now(), lastSyncError: null });
    return pending.length;
  } catch (err) {
    useDetectionSync.setState({ lastSyncError: errorMessage(err) });
    throw err;
  }
}

const ingestQuietly = () => void ingestPendingPayments().catch(() => {});

/** Android can leave the listener unbound after an install or update; nudge it whenever we can. */
function ensureListenerConnected() {
  try {
    PaymentDetector?.reconnect();
  } catch {
    // Best effort: the activity screen shows the connection state if this keeps failing.
  }
}

/** Keeps the native side in sync with settings and pulls in new payments. Mount once while logged in. */
export function usePaymentDetection(active: boolean, ownerName: string | undefined) {
  const autoDetect = useSettings((s) => s.autoDetect);
  const minPromptAmount = useSettings((s) => s.minPromptAmount);

  useEffect(() => {
    PaymentDetector?.configure(autoDetect, minPromptAmount);
  }, [autoDetect, minPromptAmount]);

  useEffect(() => {
    PaymentDetector?.setOwnerName(ownerName ?? '');
  }, [ownerName]);

  useEffect(() => {
    if (!active || !PaymentDetector) return;
    ensureListenerConnected();
    ingestQuietly();
    const detected = PaymentDetector.addListener('onPaymentDetected', ingestQuietly);
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      ensureListenerConnected();
      ingestQuietly();
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

interface DetectionReport {
  diagnostics: DetectionDiagnostics | null;
  activity: DetectionActivity[];
}

function readReport(): DetectionReport {
  if (!PaymentDetector) return { diagnostics: null, activity: [] };
  return { diagnostics: PaymentDetector.getDiagnostics(), activity: PaymentDetector.getActivity() };
}

/** What the listener has seen recently, refreshed on new payments and when the app returns to the foreground. */
export function useDetectionReport() {
  const [report, setReport] = useState<DetectionReport>(readReport);
  const refresh = useCallback(() => setReport(readReport()), []);

  useEffect(() => {
    if (!PaymentDetector) return;
    const detected = PaymentDetector.addListener('onPaymentDetected', refresh);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const synced = useDetectionSync.subscribe(refresh);
    return () => {
      detected.remove();
      appState.remove();
      synced();
    };
  }, [refresh]);

  const reconnect = () => {
    ensureListenerConnected();
    setTimeout(refresh, 1500);
  };

  const clearActivity = () => {
    PaymentDetector?.clearActivity();
    refresh();
  };

  return { ...report, refresh, reconnect, clearActivity };
}

/** Runs a fake GPay notification through the real native pipeline. */
export function sendTestPayment(): boolean {
  if (!PaymentDetector) return false;
  const rupees = 120 + Math.floor(Math.random() * 380);
  return PaymentDetector.simulatePayment(GPAY_PACKAGE, 'Payment successful', `₹${rupees} paid to Test Café`);
}

/** Runs a fake slice Gmail alert through the same pipeline used for real email notifications. */
export function sendTestSliceEmail(): boolean {
  if (!PaymentDetector) return false;
  const rupees = 120 + Math.floor(Math.random() * 380);
  return PaymentDetector.simulatePayment(
    GMAIL_PACKAGE,
    'slice <noreply@sliceit.com>',
    `₹${rupees} spent on your slice card at Test Merchant. Total due ₹1,200.`,
  );
}
