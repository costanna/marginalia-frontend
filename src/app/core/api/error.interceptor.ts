import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../toast/toast.service';
import { SILENT_ERRORS } from './api.service';
import { ApiError, toApiError } from './api-error';
import { API_ERROR_CODES } from './error-codes';

/**
 * Turns every failed API call into an ApiError with a stable code, and shows it in a translated
 * toast (unless the caller asked to handle it itself). The backend never translates messages: the
 * text comes from `errors.api.<code>`, with the response `details` as parameters.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const transloco = inject(TranslocoService);
  const toasts = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !request.url.startsWith(environment.apiUrl)) {
        return throwError(() => error);
      }
      const apiError = toApiError(error);
      if (!request.context.get(SILENT_ERRORS)) {
        toasts.error(messageFor(transloco, apiError));
      }
      return throwError(() => apiError);
    }),
  );
};

/** The translation key for an error code; unknown codes map to the generic message. */
export function errorTranslationKey(code: string): string {
  if (code === 'network' || code === 'unknown') {
    return `errors.${code}`;
  }
  return (API_ERROR_CODES as readonly string[]).includes(code)
    ? `errors.api.${code}`
    : 'errors.unknown';
}

/** The translated message for an error (details, such as a length limit, fill its parameters). */
export function messageFor(transloco: TranslocoService, error: ApiError): string {
  return transloco.translate(errorTranslationKey(error.code), error.details);
}
