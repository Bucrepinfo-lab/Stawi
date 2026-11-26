'use client';

/** Print, or "Save as PDF" in the phone's print screen. */
export function PrintButton() {
  return <button type="button" className="mr-btn go" onClick={() => window.print()}>Save as PDF / Print</button>;
}
