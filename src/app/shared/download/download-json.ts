/** How long the temporary address of the file lives: enough for the browser to start the download. */
const REVOKE_AFTER_MS = 10_000;

/**
 * Saves `data` on the user's computer as a pretty-printed JSON file.
 *
 * Everything happens in the browser: the data is turned into a Blob, given a temporary address
 * and "clicked" through a hidden link with a `download` name. Nothing is uploaded anywhere.
 */
export function downloadJson(document: Document, filename: string, data: unknown): void {
  const view = document.defaultView;
  if (!view) {
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = view.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // The address holds the whole file in memory until it is released.
  setTimeout(() => view.URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
