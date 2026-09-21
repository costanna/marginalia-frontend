import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../toast/toast.service';
import { SILENT_ERRORS } from './api.service';
import { ApiError, toApiError } from './api-error';

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

/** The translated message for an error; falls back to a generic one for unknown codes. */
export function messageFor(transloco: TranslocoService, error: ApiError): string {
  const key =
    error.code === 'network' || error.code === 'unknown'
      ? `errors.${error.code}`
      : `errors.api.${error.code}`;
  const translated = transloco.translate(key, error.details);
  // Transloco returns the key itself when it is missing (a code the frontend does not know yet).
  return translated === key ? transloco.translate('errors.unknown') : translated;
}
