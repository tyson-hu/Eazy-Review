import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import {
  isNetInfoOnline,
  setupQueryFocusManager,
  setupQueryOnlineManager,
} from '@/src/lib/query/lifecycle';

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

    // Initial sync + changes
    handlers[handlers.length - 1]('active');
    expect(focusSpy).toHaveBeenCalledWith(true);
    handlers[handlers.length - 1]('background');
    expect(focusSpy).toHaveBeenCalledWith(false);

    cleanup();
    expect(remove).toHaveBeenCalled();

    focusSpy.mockRestore();
  });
});
