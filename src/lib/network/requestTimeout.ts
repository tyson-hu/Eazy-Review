/**
 * Shared request reliability for connectivity-aware client requests.
 *
 * NetInfo/onlineManager is connectivity evidence, not proof the backend is
 * reachable. User-triggered writes should fail fast when known offline; network
 * requests should use a bounded deadline that aborts the underlying work.
 */

/** Default deadline for connected client requests. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type RequestTimeoutReason = 'timeout' | 'aborted';

export class RequestTimeoutError extends Error {
  readonly reason: 'timeout' = 'timeout';

  constructor(message = 'The request took too long. Please try again.') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

export class RequestAbortedError extends Error {
  readonly reason: 'aborted' = 'aborted';

  constructor(message = 'The request was cancelled.') {
    super(message);
    this.name = 'RequestAbortedError';
  }
}

export type WithRequestTimeoutOptions = {
  /** Existing cancellation (e.g. TanStack Query signal). */
  signal?: AbortSignal;
  /** Deadline in ms. Defaults to DEFAULT_REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
};

/**
 * Run work with a combined AbortSignal:
 * - aborts the controller when the deadline elapses (RequestTimeoutError)
 * - aborts when an external signal aborts (RequestAbortedError)
 * - always clears the timer
 * - passes `signal` into `build` so the underlying fetch can be aborted
 *
 * Prefer this over Promise.race alone, which can leave work running after a
 * timeout winner if the fetch is not aborted.
 */
export async function withRequestTimeout<T>(
  build: (signal: AbortSignal) => PromiseLike<T>,
  options: WithRequestTimeoutOptions = {},
): Promise<T> {
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbort: (() => void) | undefined;

  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new RequestTimeoutError());
    }, timeoutMs);
  });

  const externalAbortPromise = new Promise<never>((_, reject) => {
    const signal = options.signal;
    if (!signal) {
      return;
    }
    const onAbort = () => {
      controller.abort();
      reject(new RequestAbortedError());
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    removeExternalAbort = () => signal.removeEventListener('abort', onAbort);
  });

  try {
    return await Promise.race([
      Promise.resolve(build(controller.signal)),
      timeoutPromise,
      externalAbortPromise,
    ]);
  } catch (error) {
    if (
      didTimeout &&
      !(error instanceof RequestTimeoutError)
    ) {
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    removeExternalAbort?.();
  }
}

export function isRequestTimeoutError(error: unknown): boolean {
  return (
    error instanceof RequestTimeoutError ||
    (error != null &&
      typeof error === 'object' &&
      (error as { name?: string }).name === 'RequestTimeoutError')
  );
}

export function isRequestAbortedError(error: unknown): boolean {
  return (
    error instanceof RequestAbortedError ||
    (error != null &&
      typeof error === 'object' &&
      (error as { name?: string }).name === 'RequestAbortedError')
  );
}
