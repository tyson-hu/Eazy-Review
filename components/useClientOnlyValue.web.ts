import { useSyncExternalStore } from 'react';

// `useSyncExternalStore` lets us return server and client values without a setState effect.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore(
    () => () => {},
    () => client as S | C,
    () => server as S | C
  );
}
