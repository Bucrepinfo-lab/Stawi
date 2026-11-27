/**
 * Our own drawn "opens elsewhere" arrow (standing rule 13). The "↗" character
 * shows as a blue emoji box on Windows, so it is never used as text.
 */
export function ArrowOut({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, verticalAlign: '-2px' }}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
