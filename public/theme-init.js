// Sets the theme BEFORE the first paint, so the page never flashes the wrong colours. A plain
// static file (not inlined in index.html) so a strict Content-Security-Policy can allow it with
// `script-src 'self'`, no per-build hash to keep in sync (see vercel.json).
(function () {
  try {
    var saved = localStorage.getItem('marginalia.theme') || 'system';
    var dark =
      saved === 'dark' ||
      (saved === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
