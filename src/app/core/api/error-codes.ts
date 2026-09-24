/** Stable error codes returned by the API (`error.code`). The backend never translates messages:
 * every code has a translation under `errors.api.<code>` in the i18n files. */
export const API_ERROR_CODES = [
  'validation_error',
  'invalid_credentials',
  'email_taken',
  'unauthorized',
  'not_found',
  'rate_limit_exceeded',
  'daily_quota_exceeded',
  'text_too_short',
  'text_too_long',
  'llm_unavailable',
  'llm_invalid_response',
  'llm_capacity_reached',
  'exercise_already_attempted',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** The error body every failed API response has. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}
