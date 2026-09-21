import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Pages an anonymous visitor can be on: an expired session must not kick them off these. */
const PUBLIC_URLS = ['/', '/login', '/register'];

function isPublic(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_URLS.includes(path);
}

/**
 * Sends the Bearer token to OUR API only (never to other origins), and ends the session when the
 * API rejects a token we did send.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const isApiRequest = request.url.startsWith(environment.apiUrl);
  const sendsToken = isApiRequest && token !== null;

  const outgoing = sendsToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      // A 401 WITHOUT a token is just "wrong password" from the login form: not a dead session.
      if (sendsToken && error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        if (!isPublic(router.url)) {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};
