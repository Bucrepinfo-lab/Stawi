'use client';

import { useState } from 'react';
import {
  stepsForTrack,
  formalizationProgress,
  type FormalizationTrack,
} from '@stawi/core';

export function FormalizeWizard() {
  const [track, setTrack] = useState<FormalizationTrack>('SHG');
  const [doneKeys, setDoneKeys] = useState<Record<string, string[]>>({ SHG: [], SACCO: [] });

  const steps = stepsForTrack(track);
  const completed = doneKeys[track] ?? [];
  const progress = formalizationProgress(track, completed);

  function toggle(key: string) {
    setDoneKeys((prev) => {
      const cur = prev[track] ?? [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...prev, [track]: next };
    });
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Track toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bone-2)', padding: 6, borderRadius: 999, width: 'fit-content' }}>
        {(['SHG', 'SACCO'] as FormalizationTrack[]).map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, background: track === t ? 'var(--forest-deep)' : 'transparent', color: track === t ? 'var(--bone)' : 'var(--ink-2)' }}
          >
            {t === 'SHG' ? 'Self-Help Group' : 'SACCO'}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div style={{ marginTop: 18, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {progress.completed} of {progress.total} steps
          </span>
          <span className="mono" style={{ fontWeight: 600, color: 'var(--gold-deep)' }}>{progress.pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 10, background: 'var(--bone-2)', overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${progress.pct}%`, borderRadius: 10, background: 'linear-gradient(90deg,var(--gold),var(--forest))', transition: 'width .4s ease' }} />
        </div>
        {progress.done ? (
          <p style={{ marginTop: 12, color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>
            ✓ All steps complete. Your group is ready to lodge its {track === 'SHG' ? 'Self-Help Group' : 'SACCO'} application.
          </p>
        ) : (
          <p style={{ marginTop: 12, color: 'var(--ink-2)', fontSize: 14 }}>
            Next: <b>{progress.nextStep?.title}</b>
          </p>
        )}
      </div>

      {/* Steps */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => {
          const checked = completed.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              style={{ textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--paper)', border: `1px solid ${checked ? 'var(--good)' : 'var(--line)'}`, borderRadius: 'var(--radius-sm)', padding: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow)' }}
            >
              <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, background: checked ? 'var(--good)' : 'var(--bone-2)', color: checked ? '#fff' : 'var(--dim)' }}>
                {checked ? '✓' : i + 1}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: 'var(--ink)', textDecoration: checked ? 'line-through' : 'none' }}>{s.title}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{s.description}</span>
                <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--gold-deep)', background: 'rgba(224,163,46,.14)', padding: '3px 9px', borderRadius: 7 }}>{s.statute}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
