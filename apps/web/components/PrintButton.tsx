'use client';

/** Opens the phone or computer's own print sheet, where "Save as PDF" lives. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="house-go no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
