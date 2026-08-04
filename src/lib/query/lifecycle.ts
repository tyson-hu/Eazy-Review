import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type LifecycleCleanup = () => void;

/**
 * Treat only an explicit offline signal as offline. Unknown / null
 * connectivity stays online so transient NetInfo probes do not thrash queries.
 */
export function isNetInfoOnline(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  // true or null reachability with non-false connection → treat as online.
  return true;
}

/**
 * Wire TanStack Query onlineManager to NetInfo. Subscribe once per app launch.
 */
export function setupQueryOnlineManager(): LifecycleCleanup {
  onlineManager.setEventListener((setOnline) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(isNetInfoOnline(state));
    });
    return unsubscribe;
  });

  return () => {
    onlineManager.setEventListener(() => () => {});
  };
}

/**
 * Map React Native AppState to TanStack Query focus. On web, Query uses the
 * document visibility API; skip the native AppState bridge there.
 */
export function setupQueryFocusManager(): LifecycleCleanup {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  };

  // Align initial focus with current state once.
  onChange(AppState.currentState);

  const subscription = AppState.addEventListener('change', onChange);
  return () => {
    subscription.remove();
  };
}

/**
 * Coordinate Supabase auth token refresh with foreground/background so RN
 * does not keep refresh timers running while suspended. No-op on web.
 */
export function setupAuthAppStateRefresh(
  client: AppSupabaseClient,
): LifecycleCleanup {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const onChange = (status: AppStateStatus) => {
    if (status === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  };

  onChange(AppState.currentState);
  const subscription = AppState.addEventListener('change', onChange);
  return () => {
    subscription.remove();
  };
}

/**
 * Install network + focus (+ optional auth) lifecycle bridges.
 * Returns a single cleanup that tears all listeners down.
 */
export function setupQueryLifecycle(options?: {
  supabase?: AppSupabaseClient;
}): LifecycleCleanup {
  const cleanups = [
    setupQueryOnlineManager(),
    setupQueryFocusManager(),
  ];
  if (options?.supabase) {
    cleanups.push(setupAuthAppStateRefresh(options.supabase));
  }
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
