import {
  isRequestAbortedError,
  isRequestTimeoutError,
} from '@/src/lib/network/requestTimeout';

export type RatingErrorCode =
  | 'offline'
  | 'unauthorized'
  | 'validation'
  | 'timeout'
  | 'aborted'
  | 'server-error'
  | 'invalid-response';

export type RatingErrorSource =
  | 'configuration'
  | 'transport'
  | 'response'
  | 'server'
  | 'validation';

type RatingErrorOptions = {
  source?: RatingErrorSource;
  status?: number;
  cause?: unknown;
};

/**
 * Domain error for My Rating / Rated Products UI.
 * `message` is always safe user-facing copy — never raw SDK text.
 */
export class RatingError extends Error {
  readonly code: RatingErrorCode;
  readonly source: RatingErrorSource;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(
    code: RatingErrorCode,
    message: string,
    options: RatingErrorOptions = {},
  ) {
    super(message);
    this.name = 'RatingError';
    this.code = code;
    this.source = options.source ?? defaultSource(code);
    this.status = options.status;
    this.cause = options.cause;
  }
}

function defaultSource(code: RatingErrorCode): RatingErrorSource {
  switch (code) {
    case 'offline':
    case 'timeout':
    case 'aborted':
      return 'transport';
    case 'validation':
      return 'validation';
    case 'server-error':
      return 'server';
    case 'unauthorized':
    case 'invalid-response':
      return 'response';
  }
}

/** Fixed presentation strings for screens (never raw SDK/database text). */
export const RATING_USER_MESSAGES = {
  offline: "You're offline. Connect to the internet and try again.",
  unauthorized: 'Sign in to load or save your rating.',
  loadFailed: 'Could not load your rating. Please try again.',
  listFailed: 'Could not load rated products. Please try again.',
  saveFailed: 'Could not save your rating. Please try again.',
  timeout: 'The request took too long. Please try again.',
  invalidResponse: 'Rating data could not be read. Please try again.',
  validation: 'Check your scores and private note, then try again.',
  privateNoteTooLong: 'Private note must be 500 characters or fewer.',
  scoreInvalid: 'Enter a score from 0 to 10 in half-point steps.',
  scoreIncomplete: 'Rate every category from 0 to 10 before saving.',
  scoreInconsistent:
    'My Rating must be calculated from your category scores.',
  methodologyMismatch:
    'This rating uses an unsupported scoring method. Please update the app.',
  backendUnreachable:
    'Could not reach the server. Check your connection and try again.',
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readStatus(value: unknown): number | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  for (const candidate of [record.status, record.statusCode]) {
    if (typeof candidate === 'number') {
      return candidate;
    }
    if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) {
      return Number(candidate);
    }
  }
  return undefined;
}

function readCode(value: unknown): string | undefined {
  const code = asRecord(value)?.code;
  return typeof code === 'string' ? code : undefined;
}

function readMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  const message = asRecord(value)?.message;
  return typeof message === 'string' ? message : '';
}

function isTransportFailure(value: unknown): boolean {
  return (
    value instanceof TypeError ||
    /network request failed|failed to fetch|networkerror|load failed|fetch failed/i.test(
      readMessage(value),
    )
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return readCode(error) === '23505';
}

export function normalizeRatingError(
  error: unknown,
  options: {
    operation: 'read' | 'list' | 'save';
    isOffline?: boolean;
  } = { operation: 'read' },
): RatingError {
  if (error instanceof RatingError) {
    return error;
  }

  const status = readStatus(error);
  const code = readCode(error);
  const name = asRecord(error)?.name;

  if (options.isOffline === true) {
    return new RatingError('offline', RATING_USER_MESSAGES.offline, {
      source: 'transport',
      status,
      cause: error,
    });
  }

  if (isRequestTimeoutError(error) || name === 'TimeoutError' || name === 'RequestTimeoutError') {
    return new RatingError('timeout', RATING_USER_MESSAGES.timeout, {
      source: 'transport',
      status,
      cause: error,
    });
  }

  // Query cancellation / navigation abort — not presented as a user timeout.
  if (
    isRequestAbortedError(error) ||
    name === 'AbortError' ||
    name === 'RequestAbortedError'
  ) {
    return new RatingError('aborted', RATING_USER_MESSAGES.loadFailed, {
      source: 'transport',
      status,
      cause: error,
    });
  }

  if (status === 401 || status === 403 || code === '42501') {
    return new RatingError('unauthorized', RATING_USER_MESSAGES.unauthorized, {
      status,
      cause: error,
    });
  }

  if (isTransportFailure(error)) {
    // Connected but backend unreachable — not "you're offline".
    return new RatingError(
      'server-error',
      RATING_USER_MESSAGES.backendUnreachable,
      {
        source: 'transport',
        status,
        cause: error,
      },
    );
  }

  if (status != null && status >= 500) {
    return new RatingError('server-error', messageForOperation(options.operation), {
      status,
      cause: error,
    });
  }

  return new RatingError(
    'server-error',
    messageForOperation(options.operation),
    { status, cause: error },
  );
}

function messageForOperation(operation: 'read' | 'list' | 'save'): string {
  switch (operation) {
    case 'list':
      return RATING_USER_MESSAGES.listFailed;
    case 'save':
      return RATING_USER_MESSAGES.saveFailed;
    case 'read':
    default:
      return RATING_USER_MESSAGES.loadFailed;
  }
}

export function getRatingErrorMessage(error: unknown): string {
  if (error instanceof RatingError) {
    if (error.code === 'aborted') {
      // Navigation cancellation should not surface noisy copy.
      return RATING_USER_MESSAGES.loadFailed;
    }
    return error.message;
  }
  return RATING_USER_MESSAGES.saveFailed;
}
