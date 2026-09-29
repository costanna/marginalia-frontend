import { ChunkErrorHandler, RELOAD_GUARD_KEY } from './chunk-error-handler';

describe('ChunkErrorHandler', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reloads once when a chunk fails to load right after a deploy', () => {
    new ChunkErrorHandler().handleError(
      new Error('Failed to fetch dynamically imported module: https://x/chunk-ABC123.js'),
    );

    expect(reload).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(RELOAD_GUARD_KEY)).toBe('1');
  });

  it('does not reload a second time in the same tab, to avoid a loop on a real, repeating error', () => {
    const handler = new ChunkErrorHandler();
    handler.handleError(new Error('Loading chunk 4 failed'));
    handler.handleError(new Error('Loading chunk 4 failed'));

    expect(reload).toHaveBeenCalledOnce();
  });

  it('leaves unrelated errors alone', () => {
    new ChunkErrorHandler().handleError(new Error('boom'));

    expect(reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
