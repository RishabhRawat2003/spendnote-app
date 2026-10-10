import { Alert } from 'react-native';

import { errorMessage } from './api';

const QUIET_PERIOD_MS = 4000;
let lastShownAt = 0;

/** Tells the user a background save failed. Throttled so a burst of failures shows one alert. */
export function reportSyncError(err: unknown, title: string) {
  const now = Date.now();
  if (now - lastShownAt < QUIET_PERIOD_MS) return;
  lastShownAt = now;
  Alert.alert(title, errorMessage(err));
}
