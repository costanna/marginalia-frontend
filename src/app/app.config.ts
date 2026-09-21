import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/api/error.interceptor';
import { ServerWakeService } from './core/api/server-wake.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { provideI18n } from './core/i18n/i18n.providers';
import { PreferencesService } from './core/preferences/preferences.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Order matters: on the way back an error reaches authInterceptor first (it ends a dead
    // session) and errorInterceptor afterwards (it translates and announces the error).
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    ...provideI18n(),
    // The two below must NOT block the first paint: a sleeping free-tier server can take a minute.
    provideAppInitializer(() => {
      inject(ServerWakeService).start();
      inject(PreferencesService); // starts listening for sessions, to apply the profile's prefs
      inject(AuthService).restoreSession().subscribe();
    }),
  ],
};
