'use client';

import { useState } from 'react';
import { moderateText } from '@stawi/core';

interface Props {
  placeholder?: string;
  buttonLabel?: string;
  onSubmit?: (text: string) => void;
}

/**
 * A text composer with a live content-safety gate. Abusive, inciteful, or hateful
 * input is blocked inline before it can be submitted. (The server re-checks too —
 * this is the friendly first line, not the only line.)
 */
export function ModeratedTextarea({ placeholder, buttonLabel = 'Post', onSubmit }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onChange(v: string) {
    setText(v);
    if (error) setError(null);
  }

  function submit() {
    const r = moderateText(text);
    if (!r.allowed) {
      setError(r.reason);
      return;
    }
    onSubmit?.(text);
    setText('');
    setError(null);
  }

  const blocked = !!error;
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Write a message…'}
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${blocked ? 'var(--danger)' : 'var(--line)'}`,
          background: 'var(--paper)',
          fontFamily: 'inherit',
          fontSize: 14,
          color: 'var(--ink)',
        }}
      />
      {blocked && (
        <div role="alert" style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(196,69,47,.08)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          onClick={submit}
          disabled={text.trim().length === 0}
          style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: text.trim() ? 'var(--gold)' : 'var(--bone-2)', color: text.trim() ? 'var(--forest-deep)' : 'var(--dim)', fontWeight: 700, fontSize: 14, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
