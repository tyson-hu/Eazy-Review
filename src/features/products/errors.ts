import { PublicEnvError } from '@/src/lib/env/publicEnv';
import { isRequestTimeoutError } from '@/src/lib/network/requestTimeout';

export type CatalogErrorCode =
  | 'offline'
  | 'timeout'
  | 'not-found'
  | 'unauthorized'
  | 'invalid-response'
  | 'server-error';

export type CatalogErrorSource =
  | 'configuration'
  | 'transport'
  | 'response'
  | 'server';

type CatalogErrorOptions = {
  source?: CatalogErrorSource;
  status?: number;
  cause?: unknown;
};

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;
  readonly source: CatalogErrorSource;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(
    code: CatalogErrorCode,
    message: string,
    options: CatalogErrorOptions = {},
  ) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
    this.source = options.source ?? defaultSource(code);
    this.status = options.status;
    this.cause = options.cause;
  }
}

function defaultSource(code: CatalogErrorCode): CatalogErrorSource {
  if (code === 'offline' || code === 'timeout') {
    return 'transport';
  }
  if (code === 'server-error') {
    return 'server';
  }
  return 'response';
}

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

function readName(value: unknown): string | undefined {
  const name = asRecord(value)?.name;
  return typeof name === 'string' ? name : undefined;
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
    /network request failed|failed to fetch|networkerror|load failed/i.test(
      readMessage(value),
    )
  );
}

export function normalizeCatalogError(
  error: unknown,
  options: { isOffline?: boolean } = {},
): CatalogError {
  if (error instanceof CatalogError) {
    return error;
  }

  if (error instanceof PublicEnvError) {
    return new CatalogError(
      'invalid-response',
      'Catalog configuration is invalid.',
      { source: 'configuration', cause: error },
    );
  }

  const status = readStatus(error);
  const code = readCode(error);
  const name = readName(error);

  if (status === 401 || status === 403 || code === '42501') {
    return new CatalogError(
      'unauthorized',
      'Anonymous catalog access was denied.',
      { status, cause: error },
    );
  }

  if (status === 404 || code === 'PGRST116') {
    return new CatalogError('not-found', 'Product not found.', {
      status,
      cause: error,
    });
  }

  if (isRequestTimeoutError(error) || name === 'TimeoutError') {
    return new CatalogError('timeout', 'The catalog request timed out.', {
      source: 'transport',
      cause: error,
    });
  }

  if (isTransportFailure(error)) {
    return new CatalogError(
      options.isOffline ? 'offline' : 'server-error',
      options.isOffline
        ? 'The device is offline.'
        : 'The catalog service could not be reached.',
      {
        source: 'transport',
        status,
        cause: error,
      },
    );
  }

  if (status != null && status >= 500) {
    return new CatalogError('server-error', 'The catalog service failed.', {
      status,
      cause: error,
    });
  }

  return new CatalogError(
    'invalid-response',
    'The catalog response could not be read.',
    { status, cause: error },
  );
}

export function shouldRetryCatalogQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1 || !(error instanceof CatalogError)) {
    return false;
  }
  return error.code === 'timeout' || error.code === 'server-error';
}

export type CatalogErrorPresentation = {
  title: string;
  message: string;
  canRetry: boolean;
};

export function getCatalogErrorPresentation(
  error: CatalogError,
  surface: 'products' | 'product',
): CatalogErrorPresentation {
  switch (error.code) {
    case 'offline':
      return {
        title: "You're offline.",
        message: 'Connect to the internet and try again.',
        canRetry: true,
      };
    case 'timeout':
      return {
        title: `Could not load ${surface}`,
        message: 'The request took too long. Please try again.',
        canRetry: true,
      };
    case 'unauthorized':
      return {
        title: 'Catalog access unavailable',
        message: 'Anonymous access to the public catalog was denied.',
        canRetry: false,
      };
    case 'invalid-response':
      return error.source === 'configuration'
        ? {
            title: 'Catalog configuration is invalid',
            message: 'Set valid public Supabase configuration and relaunch.',
            canRetry: false,
          }
        : {
            title: 'Catalog data could not be read',
            message: 'The server returned an unexpected public catalog response.',
            canRetry: false,
          };
    case 'not-found':
      return {
        title: 'Product not found',
        message: 'This product is not publicly available.',
        canRetry: false,
      };
    case 'server-error':
      return {
        title: `Could not load ${surface}`,
        message: 'The catalog service is unavailable. Please try again.',
        canRetry: true,
      };
  }
}
