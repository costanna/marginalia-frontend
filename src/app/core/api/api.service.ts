import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** When true, the error interceptor does not show a toast (the caller shows the error itself). */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export interface RequestOptions {
  /** Do not show a toast on failure: the caller handles and displays the error. */
  silent?: boolean;
}

/** Thin wrapper over HttpClient that targets the API base URL. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.url(path), { context: this.context(options) });
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.url(path), body, { context: this.context(options) });
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(this.url(path), body, { context: this.context(options) });
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), { context: this.context(options) });
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private context(options?: RequestOptions): HttpContext {
    return new HttpContext().set(SILENT_ERRORS, options?.silent ?? false);
  }
}
