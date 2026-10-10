import { useCallback, useState } from 'react';

import { haptics } from './haptics';
import { ingestPendingPayments } from './paymentDetection';
import { loadUserData } from './sync';
import { reportSyncError } from './syncErrors';
import { useAppColors } from './theme';

/**
 * Props for <RefreshControl /> that re-fetch everything from the server. `refreshKey` changes after
 * each pull so date-based labels ("Today", "Yesterday") are recomputed too.
 */
export function usePullToRefresh() {
  const colors = useAppColors();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.press();
    try {
      await ingestPendingPayments();
      await loadUserData();
    } catch (err) {
      reportSyncError(err, 'Couldn’t refresh');
    } finally {
      setRefreshKey((k) => k + 1);
      setRefreshing(false);
    }
  }, []);

  return {
    refreshKey,
    refreshControlProps: {
      refreshing,
      onRefresh,
      colors: [colors.brand],
      tintColor: colors.brand,
      progressBackgroundColor: colors.card,
    },
  };
}
