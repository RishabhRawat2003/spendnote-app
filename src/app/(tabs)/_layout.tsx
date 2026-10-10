import { BlurTargetView } from 'expo-blur';
import Tabs from 'expo-router/js-tabs';
import { useRef } from 'react';
import { View } from 'react-native';

import { FloatingTabBar, TabBarBridge } from '@/components/TabBar';
import type { IconName } from '@/types';

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  transactions: ['list', 'list-outline'],
  stats: ['pie-chart', 'pie-chart-outline'],
  settings: ['settings', 'settings-outline'],
};

export default function TabsLayout() {
  const blurTarget = useRef<View | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <TabBarBridge {...props} />}
          screenOptions={{
            headerShown: false,
            // Mount every tab up front (behind the launch intro) so switching never waits on a first render.
            lazy: false,
            animation: 'shift',
            transitionSpec: { animation: 'timing', config: { duration: 180 } },
          }}>
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
          <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
      </BlurTargetView>
      <FloatingTabBar blurTarget={blurTarget} icons={TAB_ICONS} />
    </View>
  );
}
