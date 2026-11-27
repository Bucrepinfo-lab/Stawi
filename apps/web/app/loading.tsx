/**
 * Shown the moment a tab or link is tapped, while the next screen is fetched
 * (owner 27/11/26: taps felt frozen for seconds on phones). The bottom bar stays;
 * only the page area shows this light outline of cards. No data, no script.
 */
export default function Loading() {
  return (
    <main className="pg-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="pg-loading-bar" />
      <div className="pg-loading-title" />
      <div className="pg-loading-card" />
      <div className="pg-loading-card short" />
      <div className="pg-loading-card" />
    </main>
  );
}
