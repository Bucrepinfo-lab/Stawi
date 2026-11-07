/**
 * Keep a page's filters in the URL without a reload, so a refresh, the back
 * button or a shared link reopens the same view. The server reads the same
 * params (and only accepts values the caller is allowed to see).
 * `undefined` leaves a param untouched; `null` or '' removes it.
 */
export function setUrlParams(params: Record<string, string | null | undefined>): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue; // leave as is
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k); // null or '' clears it
  }
  window.history.replaceState(window.history.state, '', url.toString());
}
