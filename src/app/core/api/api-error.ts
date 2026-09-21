import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from './error-codes';

/** Codes that exist only in the frontend (not returned by the API). */
export type ClientErrorCode = 'network' | 'unknown';

/** A failed API call, normalised: a stable `code` the UI can translate, never a server message. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  const error = (body as ApiErrorBody | null)?.error;
  return typeof error?.code === 'string';
}

export function toApiError(response: HttpErrorResponse): ApiError {
  // status 0: the request never got an answer (offline, CORS, server unreachable).
  if (response.status === 0) {
    return new ApiError('network', 0);
  }
  if (isApiErrorBody(response.error)) {
    const { code, details } = response.error.error;
    return new ApiError(code, response.status, details ?? {});
  }
  return new ApiError('unknown', response.status);
}
