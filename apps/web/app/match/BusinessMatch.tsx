'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  generateVentures,
  canAddToShortlist,
  readSavedMatch,
  formatMoney,
  type Industry,
  type Venture,
} from '@stawi/core';

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'agri', label: 'Agribusiness & Food' },
  { value: 'retail', label: 'Retail & Trade' },
  { value: 'services', label: 'Services' },
  { value: 'manufacturing', label: 'Light Manufacturing' },
  { value: 'digital', label: 'Digital & Tech' },
  { value: 'transport', label: 'Transport & Logistics' },
];

const RISK_COLOR: Record<Venture['risk'], string> = {
  Low: 'var(--good)',
  Moderate: 'var(--gold-deep)',
  Higher: 'var(--danger)',
};

const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  padding: 22,
  boxShadow: 'var(--shadow)',
};
const tag: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: 8,
};

/** The phone keeps the shortlist between tabs (tester 27/11/26: it reset to 0/3). */
const STORE_KEY = 'stawi.match.v1';

function parseCapital(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
}

export function BusinessMatch() {
  const [industry, setIndustry] = useState<Industry>('agri');
  const [capital, setCapital] = useState('120,000');
  const [seed, setSeed] = useState(1);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [saved, setSaved] = useState<Venture[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const run = useCallback(
    (nextSeed: number) => {
      const capCents = parseCapital(capital) * 100;
      if (capCents <= 0) {
        setVentures([]);
        setNote('Enter a capital amount to generate ventures.');
        return;
      }
      setVentures(generateVentures({ industry, capitalCents: capCents, seed: nextSeed }));
      setNote(null);
    },
    [industry, capital],
  );

  // Generate on first mount and whenever industry changes.
  useEffect(() => {
    run(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  // Bring back what this phone saved, after the first draw so the server and
  // phone render the same page.
  useEffect(() => {
    let back: ReturnType<typeof readSavedMatch> = null;
    try {
      back = readSavedMatch(JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null'));
    } catch {
      back = null;
    }
    if (back) {
      setIndustry(back.industry);
      if (back.capital) setCapital(back.capital);
      setSeed(back.seed);
      setSaved(back.saved);
      const capCents = parseCapital(back.capital || capital) * 100;
      if (capCents > 0) setVentures(generateVentures({ industry: back.industry, capitalCents: capCents, seed: back.seed }));
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ industry, capital, seed, saved }));
    } catch {
      // Private mode or full storage: the page still works, it just forgets.
    }
  }, [ready, industry, capital, seed, saved]);

  function generate() {
    run(seed);
  }
  function reroll() {
    const s = seed + 1;
    setSeed(s);
    run(s);
  }
  function reset() {
    setSaved([]);
    const s = Math.floor(Math.random() * 1e6);
    setSeed(s);
    run(s);
    flash('Re-rolled · shortlist cleared');
  }

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2600);
  }

  function isSaved(v: Venture) {
    return saved.some((s) => s.title === v.title);
  }
  function toggleSave(v: Venture) {
    if (isSaved(v)) {
      setSaved((prev) => prev.filter((s) => s.title !== v.title));
      return;
    }
    if (!canAddToShortlist(saved)) {
      flash('Three saved — remove one to add another.');
      return;
    }
    setSaved((prev) => [...prev, v]);
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="s-card" style={card}>
        {/* Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <label>
            <span style={labelStyle}>Industry</span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as Industry)}
              style={inputStyle}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Capital available (KES)</span>
            <input
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              onBlur={generate}
              inputMode="numeric"
              className="mono"
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={generate} style={btnPrimary}>
            ⟲ Generate ventures
          </button>
          <button onClick={reroll} style={btnGhost}>
            Re-roll
          </button>
          <button onClick={reset} style={btnGhost}>
            Reset
          </button>
        </div>

        {note && (
          <div style={{ marginTop: 12, color: 'var(--gold-deep)', fontWeight: 600, fontSize: 13 }}>
            {note}
          </div>
        )}

        {/* Venture grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
            marginTop: 18,
          }}
        >
          {ventures.map((v) => (
            <div
              key={v.title}
              style={{
                position: 'relative',
                background: 'var(--bone)',
                border: `1px solid ${isSaved(v) ? 'var(--gold)' : 'var(--line)'}`,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <button
                onClick={() => toggleSave(v)}
                aria-label={isSaved(v) ? 'Remove from shortlist' : 'Save to shortlist'}
                style={{
                  position: 'absolute',
                  top: 11,
                  right: 11,
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${isSaved(v) ? 'var(--gold)' : 'var(--line)'}`,
                  background: isSaved(v) ? 'var(--gold)' : 'var(--paper)',
                  color: isSaved(v) ? 'var(--forest-deep)' : 'var(--faint)',
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                {isSaved(v) ? '★' : '☆'}
              </button>
              <div style={{ fontWeight: 700, fontSize: 14.5, paddingRight: 28 }}>{v.title}</div>
              <div style={{ fontSize: 12, color: 'var(--dim)', margin: '5px 0 10px', minHeight: 34 }}>
                {v.description}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...tag, background: 'rgba(31,77,58,.10)', color: 'var(--forest)' }}>
                  KES {formatMoney(v.startupCents)}
                </span>
                <span style={{ ...tag, background: 'rgba(224,163,46,.16)', color: 'var(--gold-deep)' }}>
                  ~{v.marginPct}% margin
                </span>
                <span style={{ ...tag, background: 'var(--bone-2)', color: RISK_COLOR[v.risk] }}>
                  {v.risk} risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortlist */}
      <div style={{ ...card, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>
            Shortlist to discuss
          </h2>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-deep)' }}>
            {saved.length} / 3 saved
          </span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => {
            const v = saved[i];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 11,
                  border: `1px ${v ? 'solid' : 'dashed'} var(--line)`,
                  background: v ? 'var(--paper)' : 'var(--bone)',
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: v ? 'var(--gold)' : 'var(--forest-deep)',
                    color: v ? 'var(--forest-deep)' : 'var(--bone)',
                  }}
                >
                  {v ? '★' : i + 1}
                </span>
                {v ? (
                  <>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{v.title}</span>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      KES {formatMoney(v.startupCents)}
                    </span>
                    {/* The group chose this one: write the funding proposal from it (owner 26/11/26). */}
                    <a
                      className="mr-btn go"
                      style={{ minHeight: 34, fontSize: 12.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                      href={`/proposal?${new URLSearchParams({ title: v.title, industry: v.industry, startup: String(v.startupCents), margin: String(v.marginPct), risk: v.risk, desc: v.description })}`}
                    >
                      Write the funding proposal
                    </a>
                    <button
                      onClick={() => toggleSave(v)}
                      aria-label="Remove"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--faint)',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span style={{ color: 'var(--dim)', fontSize: 13 }}>
                    Save an idea to fill this slot…
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {saved.length >= 3 && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--good)', fontWeight: 600 }}>
            ✓ Three ideas saved — ready to book a group discussion to decide.
          </p>
        )}
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
          Your shortlist stays on this phone when you open other tabs. To change it, tap × to take an idea off
          and ☆ on another to add it. To change the name, the cost or the plan, tap Write the funding proposal:
          everything there can be edited.
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.07em',
  color: 'var(--dim)',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--bone)',
  fontFamily: 'inherit',
  fontSize: 14,
  color: 'var(--ink)',
};
const btnPrimary: React.CSSProperties = {
  padding: '11px 18px',
  borderRadius: 11,
  border: 'none',
  background: 'var(--forest-deep)',
  color: 'var(--bone)',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnGhost: React.CSSProperties = {
  padding: '11px 18px',
  borderRadius: 11,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--forest-deep)',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
