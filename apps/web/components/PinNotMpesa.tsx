/**
 * Owner 28/11/26: members must never mistake the Stawi PIN for their M-Pesa
 * PIN. The phone card says M-Pesa prompts go to their number, so right after
 * it a "PIN" box can read as a request for the M-Pesa PIN. Every screen that
 * asks for or changes the Stawi PIN shows this line.
 */
export function PinNotMpesa({ compact = false }: { compact?: boolean }) {
  return (
    <p
      role="note"
      style={{
        margin: 0,
        padding: compact ? '6px 10px' : '10px 12px',
        borderRadius: 10,
        background: 'rgba(224,163,46,0.12)',
        border: '1px solid rgba(224,163,46,0.45)',
        color: 'var(--ink, #16261f)',
        fontSize: compact ? 12.5 : 13.5,
        lineHeight: 1.45,
        textAlign: 'left',
      }}
    >
      <b>This is your Stawi PIN, not your M-Pesa PIN.</b> It only opens the Stawi app.
      {compact ? null : (
        <>
          {' '}Stawi never asks for your M-Pesa PIN. You type that only on your own phone, in the M-Pesa prompt from Safaricom.
        </>
      )}
      <br />
      <span style={{ opacity: 0.85 }}>Hii ni PIN ya Stawi, si PIN yako ya M-Pesa.</span>
    </p>
  );
}
