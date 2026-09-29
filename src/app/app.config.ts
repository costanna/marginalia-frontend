import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ChunkErrorHandler, RELOAD_GUARD_KEY } from './core/api/chunk-error-handler';
import { errorInterceptor } from './core/api/error.interceptor';
import { ServerWakeService } from './core/api/server-wake.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { provideI18n } from './core/i18n/i18n.providers';
import { PreferencesService } from './core/preferences/preferences.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    provideRouter(routes),
    // Order matters: on the way back an error reaches authInterceptor first (it ends a dead
    // session) and errorInterceptor afterwards (it translates and announces the error).
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    ...provideI18n(),
    // The two below must NOT block the first paint: a sleeping free-tier server can take a minute.
    provideAppInitializer(() => {
      // Reaching here means the current bundle loaded fine: let a later chunk
      // failure (a new deploy, not this one persisting) try to recover again.
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      inject(ServerWakeService).start();
      inject(PreferencesService); // starts listening for sessions, to apply the profile's prefs
      inject(AuthService).restoreSession().subscribe();
    }),
  ],
};
