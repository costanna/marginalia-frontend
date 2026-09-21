import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guards';
import { TOKEN_STORAGE_KEY } from './auth.service';

function run(guard: CanActivateFn, url: string, signedIn: boolean) {
  localStorage.clear();
  if (signedIn) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  }
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  return { result, router: TestBed.inject(Router) };
}

describe('authGuard', () => {
  it('lets a signed-in user through', () => {
    expect(run(authGuard, '/history', true).result).toBe(true);
  });

  it('sends an anonymous visitor to login, remembering where they wanted to go', () => {
    const { result, router } = run(authGuard, '/history?page=2', false);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fhistory%3Fpage%3D2');
  });
});

describe('guestGuard', () => {
  it('lets an anonymous visitor see login and sign-up', () => {
    expect(run(guestGuard, '/login', false).result).toBe(true);
  });

  it('sends a signed-in user to the app instead', () => {
    const { result, router } = run(guestGuard, '/login', true);

    expect(router.serializeUrl(result as UrlTree)).toBe('/write');
  });
});
