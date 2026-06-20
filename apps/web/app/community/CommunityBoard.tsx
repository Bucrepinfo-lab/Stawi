'use client';

import { useState } from 'react';
import { ModeratedTextarea } from '@/components/ModeratedTextarea';

interface Msg { id: string; author: string; text: string; }

const SEED: Msg[] = [
  { id: '1', author: 'Grace O.', text: 'Reminder: contributions due Friday before the meeting.' },
  { id: '2', author: 'Joseph K.', text: 'I have paid mine via M-Pesa, receipt downloaded.' },
];

export function CommunityBoard() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {msgs.map((m) => (
          <div key={m.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--forest-deep)' }}>{m.author}</div>
            <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <ModeratedTextarea
        placeholder="Message your group…"
        buttonLabel="Send message"
        onSubmit={(text) => setMsgs((prev) => [...prev, { id: Math.random().toString(36).slice(2), author: 'You', text }])}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: 'var(--dim)' }}>
        Try posting something abusive — it will be blocked. Keep Stawi respectful.
      </p>
    </div>
  );
}
