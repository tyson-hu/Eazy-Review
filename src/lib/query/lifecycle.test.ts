import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import {
  isNetInfoOnline,
  setupAuthAppStateRefresh,
  setupQueryFocusManager,
  setupQueryOnlineManager,
} from '@/src/lib/query/lifecycle';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

type NetState = {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
};

describe('isNetInfoOnline', () => {
  it('treats unknown connectivity conservatively (online)', () => {
    expect(
      isNetInfoOnline({ isConnected: null, isInternetReachable: null }),
    ).toBe(true);
    expect(
      isNetInfoOnline({ isConnected: true, isInternetReachable: null }),
    ).toBe(true);
  });

  it('treats explicit offline as offline', () => {
    expect(
      isNetInfoOnline({ isConnected: false, isInternetReachable: true }),
    ).toBe(false);
    expect(
      isNetInfoOnline({ isConnected: true, isInternetReachable: false }),
    ).toBe(false);
  });
});

describe('setupQueryOnlineManager', () => {
  it('updates TanStack Query online state from NetInfo and cleans up', () => {
    let netListener: ((state: NetState) => void) | undefined;
    const netUnsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      netListener = cb;
      return netUnsubscribe;
    });

    const setOnlineSpy = jest.spyOn(onlineManager, 'setOnline');
    const cleanup = setupQueryOnlineManager();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(netListener).toBeDefined();

    netListener?.({ isConnected: false, isInternetReachable: true });
    expect(setOnlineSpy).toHaveBeenCalledWith(false);

    netListener?.({ isConnected: true, isInternetReachable: true });
    expect(setOnlineSpy).toHaveBeenCalledWith(true);

    cleanup();
    // Replacing the event listener should detach the NetInfo subscription.
    expect(netUnsubscribe).toHaveBeenCalled();

    setOnlineSpy.mockRestore();
  });
});

describe('setupQueryFocusManager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks focused when AppState becomes active and cleans up', () => {
    const handlers: ((status: string) => void)[] = [];
    const remove = jest.fn();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        handlers.push(handler as (status: string) => void);
        return { remove };
      });
    const focusSpy = jest.spyOn(focusManager, 'setFocused');

    const cleanup = setupQueryFocusManager();
    expect(handlers.length).toBeGreaterThanOrEqual(1);

    handlers[handlers.length - 1]('active');
    expect(focusSpy).toHaveBeenCalledWith(true);
    handlers[handlers.length - 1]('background');
    expect(focusSpy).toHaveBeenCalledWith(false);

    cleanup();
    expect(remove).toHaveBeenCalled();
    // Cleanup clears the forced focus override so defaults apply again.
    expect(focusSpy).toHaveBeenCalledWith(undefined);
  });
});

describe('setupAuthAppStateRefresh', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createAuthClient() {
    return {
      auth: {
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
    } as unknown as AppSupabaseClient;
  }

  it('starts auth refresh when AppState is active', () => {
    const handlers: ((status: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      handlers.push(handler as (status: string) => void);
      return { remove: jest.fn() };
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });

    const client = createAuthClient();
    setupAuthAppStateRefresh(client);

    expect(client.auth.startAutoRefresh).toHaveBeenCalled();
    handlers[0]('active');
    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('stops auth refresh on inactive and background', () => {
    const handlers: ((status: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      handlers.push(handler as (status: string) => void);
      return { remove: jest.fn() };
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });

    const client = createAuthClient();
    setupAuthAppStateRefresh(client);

    handlers[0]('inactive');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    handlers[0]('background');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('cleanup removes the AppState listener and stops auth refresh', () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({
      remove,
    }));
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });

    const client = createAuthClient();
    const cleanup = setupAuthAppStateRefresh(client);

    cleanup();
    expect(remove).toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).toHaveBeenCalled();
  });
});
