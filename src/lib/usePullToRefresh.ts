import { useCallback, useState } from 'react';

import { haptics } from './haptics';
import { useAppColors } from './theme';

const FAKE_SYNC_MS = 800;

/**
 * Props for <RefreshControl />. With sample data there is nothing to fetch, so this only waits briefly;
 * `refreshKey` changes after each pull so date-based labels ("Today", "Yesterday") can be recomputed.
 */
export function usePullToRefresh() {
  const colors = useAppColors();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    haptics.press();
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setRefreshing(false);
    }, FAKE_SYNC_MS);
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
