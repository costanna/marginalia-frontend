import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, catchError, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { RegisterPayload, TokenResponse, User } from './auth.models';

export const TOKEN_STORAGE_KEY = 'marginalia.token';

/**
 * Session state: the access token and the signed-in user.
 *
 * The token lives in localStorage (see the README for the trade-off against XSS and the
 * httpOnly-cookie alternative). It is what defines "signed in": the profile is fetched in the
 * background and may still be null for a moment on a cold server.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly document = inject(DOCUMENT);

  private readonly tokenState = signal<string | null>(this.readToken());
  private readonly userState = signal<User | null>(null);
  private readonly started = new Subject<User>();

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null);

  /** Emits whenever a session begins (login, sign-up or restore), NOT when the profile is edited. */
  readonly sessionStarted$ = this.started.asObservable();

  login(email: string, password: string): Observable<User> {
    return this.api
      .post<TokenResponse>('/auth/login', { email, password }, { silent: true })
      .pipe(switchMap((response) => this.beginSession(response.access_token)));
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.api
      .post<TokenResponse>('/auth/register', payload, { silent: true })
      .pipe(switchMap((response) => this.beginSession(response.access_token)));
  }

  logout(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.storeToken(null);
  }

  /** On startup: if a token was stored, fetch the profile. An expired token ends the session. */
  restoreSession(): Observable<User | null> {
    if (!this.tokenState()) {
      return of(null);
    }
    return this.api.get<User>('/me', { silent: true }).pipe(
      tap((user) => this.userState.set(user)),
      tap((user) => this.started.next(user)),
      // A rejected token (401) is handled by the auth interceptor, which ends the session; any
      // other failure (e.g. a server still waking up) keeps the token for the next attempt.
      catchError(() => of(null)),
    );
  }

  /** Replaces the cached profile after an edit (does not announce a new session). */
  updateUser(user: User): void {
    this.userState.set(user);
  }

  private beginSession(token: string): Observable<User> {
    this.tokenState.set(token);
    this.storeToken(token);
    return this.api.get<User>('/me', { silent: true }).pipe(
      tap((user) => {
        this.userState.set(user);
        this.started.next(user);
      }),
    );
  }

  // Storage can throw (private mode, blocked site data): the session then lasts until reload.
  private readToken(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(TOKEN_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private storeToken(token: string | null): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (token) {
        storage?.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        storage?.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignored on purpose.
    }
  }
}
