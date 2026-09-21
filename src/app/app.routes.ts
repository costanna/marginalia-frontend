import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

/**
 * Every page is lazy-loaded. A route's `title` is a translation key (see PageTitleStrategy).
 * Signed-in pages use authGuard; login and sign-up use guestGuard.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'nav.login',
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'nav.register',
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'write',
    canActivate: [authGuard],
    title: 'nav.write',
    loadComponent: () => import('./features/write/write.page').then((m) => m.WritePage),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    title: 'nav.history',
    loadComponent: () => import('./features/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'history/:id',
    canActivate: [authGuard],
    title: 'nav.history',
    loadComponent: () =>
      import('./features/history/history-detail.page').then((m) => m.HistoryDetailPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    title: 'nav.settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '**',
    title: 'notFound.title',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
