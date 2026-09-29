import { ErrorHandler, Injectable } from '@angular/core';

/** Set once we have already tried to recover in this tab, so a real, repeating error doesn't reload forever. */
export const RELOAD_GUARD_KEY = 'marginalia:chunk-reload-attempted';

const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|Loading chunk .* failed/i;

/**
 * After a new deploy, a tab left open still points to the old build's file names. When the
 * router then lazy-loads a page, the browser asks for a JS chunk that no longer exists;
 * Vercel's SPA fallback answers with index.html instead of a 404, which the browser rejects
 * for not being a JS module. The fix is a fresh load: this catches that specific failure and
 * reloads the page once, which pulls the current index.html and its real chunk names.
 */
@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    if (CHUNK_LOAD_ERROR.test(message) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      window.location.reload();
      return;
    }

    console.error(error);
  }
}
