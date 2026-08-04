import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import {
  isNetInfoOnline,
  setupAuthAppStateRefresh,
  setupQueryFocusManager,
  setupQueryLifecycle,
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

function createAuthClient() {
  return {
    auth: {
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  } as unknown as AppSupabaseClient;
}

function mockAppStateSubscription() {
  const handlers: ((status: string) => void)[] = [];
  const remove = jest.fn();
  const spy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      handlers.push(handler as (status: string) => void);
      return { remove };
    });
  return { handlers, remove, spy };
}

function setAppStateCurrent(status: string) {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => status,
  });
}

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
  afterEach(() => {
    jest.restoreAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockReset();
  });

  it('updates TanStack Query online state from NetInfo and cleans up', () => {
    let netListener: ((state: NetState) => void) | undefined;
    const netUnsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      netListener = cb;
      return netUnsubscribe;
    });

    const setOnlineSpy = jest.spyOn(onlineManager, 'setOnline');
    const setEventListenerSpy = jest.spyOn(onlineManager, 'setEventListener');
    const cleanup = setupQueryOnlineManager();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(netListener).toBeDefined();

    netListener?.({ isConnected: false, isInternetReachable: true });
    expect(setOnlineSpy).toHaveBeenCalledWith(false);

    netListener?.({ isConnected: true, isInternetReachable: false });
    expect(setOnlineSpy).toHaveBeenCalledWith(false);

    netListener?.({ isConnected: true, isInternetReachable: true });
    expect(setOnlineSpy).toHaveBeenCalledWith(true);

    // Unknown / null connectivity must not incorrectly force offline.
    netListener?.({ isConnected: null, isInternetReachable: null });
    expect(setOnlineSpy).toHaveBeenCalledWith(true);

    const listenerCallsBeforeCleanup = setEventListenerSpy.mock.calls.length;
    cleanup();
    // Replacing the event listener should detach the NetInfo subscription.
    expect(netUnsubscribe).toHaveBeenCalled();
    // Cleanup restores default online manager listener setup.
    expect(setEventListenerSpy.mock.calls.length).toBeGreaterThan(
      listenerCallsBeforeCleanup,
    );

    setOnlineSpy.mockRestore();
    setEventListenerSpy.mockRestore();
  });
});

describe('setupQueryFocusManager', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
    jest.restoreAllMocks();
  });

  it('applies initial AppState and maps active / inactive / background', () => {
    const { handlers, remove } = mockAppStateSubscription();
    setAppStateCurrent('active');
    const focusSpy = jest.spyOn(focusManager, 'setFocused');

    const cleanup = setupQueryFocusManager();

    // Initial AppState is applied immediately.
    expect(focusSpy).toHaveBeenCalledWith(true);
    expect(handlers.length).toBeGreaterThanOrEqual(1);

    handlers[handlers.length - 1]('active');
    expect(focusSpy).toHaveBeenCalledWith(true);
    handlers[handlers.length - 1]('inactive');
    expect(focusSpy).toHaveBeenCalledWith(false);
    handlers[handlers.length - 1]('background');
    expect(focusSpy).toHaveBeenCalledWith(false);

    cleanup();
    expect(remove).toHaveBeenCalled();
    // Cleanup clears the forced focus override so defaults apply again.
    expect(focusSpy).toHaveBeenCalledWith(undefined);
  });

  it('does not install the native AppState focus bridge on web', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    const focusSpy = jest.spyOn(focusManager, 'setFocused');

    const cleanup = setupQueryFocusManager();
    expect(appStateSpy).not.toHaveBeenCalled();
    expect(focusSpy).not.toHaveBeenCalled();
    cleanup();
  });
});

describe('setupAuthAppStateRefresh', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
    jest.restoreAllMocks();
  });

  it('starts auth refresh when AppState is active', () => {
    const { handlers } = mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    setupAuthAppStateRefresh(client);

    expect(client.auth.startAutoRefresh).toHaveBeenCalled();
    handlers[0]('active');
    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('stops auth refresh on inactive and background', () => {
    const { handlers } = mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    setupAuthAppStateRefresh(client);

    handlers[0]('inactive');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    handlers[0]('background');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('starts refresh for an initially active AppState', () => {
    mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    setupAuthAppStateRefresh(client);

    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(client.auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('cleanup removes the AppState listener and stops auth refresh', () => {
    const { remove } = mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    const cleanup = setupAuthAppStateRefresh(client);

    cleanup();
    expect(remove).toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).toHaveBeenCalled();
  });

  it('does not install the native auth refresh listener on web', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    const client = createAuthClient();

    const cleanup = setupAuthAppStateRefresh(client);
    expect(appStateSpy).not.toHaveBeenCalled();
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
    cleanup();
  });
});

describe('setupQueryLifecycle', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
    jest.restoreAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockReset();
  });

  it('installs online, focus, and auth lifecycles when Supabase is supplied', () => {
    const netUnsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation(() => netUnsubscribe);
    const { remove: appStateRemove } = mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    const cleanup = setupQueryLifecycle({ supabase: client });

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(AppState.addEventListener).toHaveBeenCalled();
    expect(client.auth.startAutoRefresh).toHaveBeenCalled();

    cleanup();
    expect(netUnsubscribe).toHaveBeenCalled();
    expect(appStateRemove).toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).toHaveBeenCalled();
  });

  it('omits auth lifecycle when no Supabase client is supplied', () => {
    const netUnsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation(() => netUnsubscribe);
    mockAppStateSubscription();
    setAppStateCurrent('active');

    const client = createAuthClient();
    const cleanup = setupQueryLifecycle();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).not.toHaveBeenCalled();

    cleanup();
  });

  it('runs every cleanup even when earlier work already cleaned partial state', () => {
    const netUnsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation(() => netUnsubscribe);
    const { remove: appStateRemove } = mockAppStateSubscription();
    setAppStateCurrent('active');
    const client = createAuthClient();

    const cleanup = setupQueryLifecycle({ supabase: client });

    // Combined cleanup must invoke every registered teardown.
    cleanup();
    expect(netUnsubscribe).toHaveBeenCalledTimes(1);
    expect(appStateRemove).toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).toHaveBeenCalled();
  });
});
