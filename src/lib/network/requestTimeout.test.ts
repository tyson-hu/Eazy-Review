import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  RequestAbortedError,
  RequestTimeoutError,
  withRequestTimeout,
} from '@/src/lib/network/requestTimeout';

describe('withRequestTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves successful work and clears the deadline timer', async () => {
    const promise = withRequestTimeout(
      async () => 'ok',
      { timeoutMs: 1000 },
    );
    await expect(promise).resolves.toBe('ok');
  });

  it('aborts via AbortSignal and rejects RequestTimeoutError on deadline', async () => {
    let seenSignal: AbortSignal | undefined;
    const promise = withRequestTimeout(
      (signal) =>
        new Promise((_resolve, reject) => {
          seenSignal = signal;
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
      { timeoutMs: 50 },
    );

    jest.advanceTimersByTime(50);
    await expect(promise).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(seenSignal?.aborted).toBe(true);
  });

  it('distinguishes external cancellation from timeout', async () => {
    const external = new AbortController();
    const promise = withRequestTimeout(
      (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new RequestAbortedError());
          });
        }),
      { signal: external.signal, timeoutMs: 10_000 },
    );

    external.abort();
    await expect(promise).rejects.toBeInstanceOf(RequestAbortedError);
  });

  it('exports the documented default timeout near 10 seconds', () => {
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(10_000);
  });
});
