"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toE164 } from "@stawi/core";

/**
 * Phone number, then the person's own 4-digit PIN — no SMS (owner 20/11/26).
 *
 * - "pin":   phone + PIN on any device (a trusted device remembers the number).
 * - "code":  first time, forgotten or locked PIN: phone + the joining code a
 *            group official gave → choose a PIN.
 * - "start": someone starting their own group or books: phone + new PIN.
 */
type Mode = "pin" | "code" | "start";

export function PhoneAuth({ afterAuthUrl = "/dashboard", initialMode = "pin" }: { afterAuthUrl?: string; initialMode?: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") || afterAuthUrl;
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : afterAuthUrl;

  const [mode, setMode] = useState<Mode>(params.get("code") === "1" ? "code" : initialMode);
  const [phoneInput, setPhoneInput] = useState("");
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A trusted device remembers which number signs in here (shown masked).
  useEffect(() => {
    fetch("/api/auth/pin/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.device?.phoneHint) setDeviceHint(d.device.phoneHint);
      })
      .catch(() => undefined);
  }, []);

  const useDevice = mode === "pin" && deviceHint !== null && phoneInput === "";

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setPin("");
    setPin2("");
    setCode("");
  }

  async function post(url: string, body: Record<string, string>) {
    setError(null);
    setLoading(true);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    // On success the button keeps saying "Opening…" until the next page shows.
    if (!res?.ok) setLoading(false);
    return { ok: !!res?.ok, data };
  }

  function phoneOrError(): string | null {
    const e164 = toE164(phoneInput);
    if (!e164) setError("Enter a valid phone number, e.g. 0712 345 678.");
    return e164;
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, string> = { pin };
    if (!useDevice) {
      const phone = phoneOrError();
      if (!phone) return;
      body.phone = phone;
    }
    const { ok, data } = await post("/api/auth/pin/sign-in", body);
    setPin("");
    if (ok) {
      // One clean page load with the new session (was push + refresh: two loads).
      setOpening(true);
      window.location.replace(next);
      return;
    }
    setError(data.error ?? "Could not sign in. Try again.");
    if (data.locked) switchTo("code");
  }

  async function redeem(event: FormEvent) {
    event.preventDefault();
    const phone = phoneOrError();
    if (!phone) return;
    const { ok, data } = await post("/api/auth/join", { phone, code });
    if (!ok) return setError(data.error ?? "Could not check the code. Try again.");
    router.push(`/pin/setup?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    const phone = phoneOrError();
    if (!phone) return;
    if (pin !== pin2) return setError("The two PINs do not match.");
    const { ok, data } = await post("/api/auth/start", { phone, pin });
    if (!ok) {
      setError(data.error ?? "Could not open your account. Try again.");
      if (data.needCode) switchTo("code");
      return;
    }
    router.push(next === "/dashboard" ? "/groups/new" : next);
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid #cbd3c9",
    background: "#fff",
    padding: "13px 14px",
    fontSize: 17,
    outline: "none",
  };
  const pinStyle: React.CSSProperties = { ...inputStyle, textAlign: "center", letterSpacing: "0.6em", fontWeight: 600 };
  const btnStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: 0,
    padding: "13px 16px",
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    background: "var(--forest-deep)",
    cursor: "pointer",
  };
  const linkStyle: React.CSSProperties = { background: "none", border: 0, color: "var(--ink-2)", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 4, fontFamily: "inherit" };
  const four = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const phoneField = (
    <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
      Phone number
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={useDevice ? `${deviceHint} (this device)` : "0712 345 678"}
        value={phoneInput}
        onChange={(event) => setPhoneInput(event.target.value)}
        style={{ ...inputStyle, marginTop: 6 }}
        autoFocus={!deviceHint}
      />
    </label>
  );
  const errorLine = error && <p role="alert" style={{ fontSize: 13.5, color: "#b3261e", margin: 0 }}>{error}</p>;

  if (mode === "code") {
    return (
      <form onSubmit={redeem} style={{ display: "grid", gap: 12, textAlign: "left" }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>
          Your group added you, or you forgot your PIN? Ask your group&apos;s chairperson, secretary or treasurer for your <b>joining code</b>. They hand it to you in person or on WhatsApp. It is never sent by SMS, so there is nothing to wait for. It proves you are the member your group added, so nobody else can open your group&apos;s records.
        </p>
        {phoneField}
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Joining code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="482913"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
            style={{ ...inputStyle, marginTop: 6, textAlign: "center", letterSpacing: "0.3em", fontWeight: 600 }}
          />
        </label>
        {errorLine}
        <button type="submit" disabled={loading || code.replace(/\D/g, "").length < 6} style={{ ...btnStyle, opacity: loading || code.replace(/\D/g, "").length < 6 ? 0.6 : 1 }}>
          {loading ? "Checking…" : "Continue"}
        </button>
        <button type="button" onClick={() => switchTo("pin")} style={linkStyle}>I already have a PIN</button>
      </form>
    );
  }

  if (mode === "start") {
    return (
      <form onSubmit={start} style={{ display: "grid", gap: 12, textAlign: "left" }}>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>
          New to Stawi? Starting a group, trying it out, or keeping your own business books? Open your account with just your phone number and a PIN only you know. No code needed.
        </p>
        {phoneField}
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Choose a 4-digit PIN
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPin(four(e.target.value))} style={{ ...pinStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Repeat the PIN
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin2} onChange={(e) => setPin2(four(e.target.value))} style={{ ...pinStyle, marginTop: 6 }} />
        </label>
        {errorLine}
        <button type="submit" disabled={loading || pin.length < 4 || pin2.length < 4} style={{ ...btnStyle, opacity: loading || pin.length < 4 || pin2.length < 4 ? 0.6 : 1 }}>
          {loading ? "Opening…" : "Open my account"}
        </button>
        <button type="button" onClick={() => switchTo("code")} style={linkStyle}>My group added me — I have a joining code</button>
        <button type="button" onClick={() => switchTo("pin")} style={linkStyle}>I already have a PIN</button>
      </form>
    );
  }

  return (
    <form onSubmit={signIn} style={{ display: "grid", gap: 12, textAlign: "left" }}>
      {phoneField}
      <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
        Your 4-digit PIN
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(event) => setPin(four(event.target.value))}
          style={{ ...pinStyle, marginTop: 6 }}
          autoFocus={!!deviceHint}
        />
      </label>
      <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>
        Use the number your group registered you with. It is also your M-Pesa number for contributions.
      </p>
      {errorLine}
      <button type="submit" disabled={loading || pin.length < 4} style={{ ...btnStyle, opacity: loading || pin.length < 4 ? 0.6 : 1 }}>
        {opening ? "Opening your groups…" : loading ? "Checking…" : "Sign in"}
      </button>
      <button type="button" onClick={() => switchTo("code")} style={linkStyle}>Your group added you, or forgot your PIN? Use the code your group official gave you</button>
      <button type="button" onClick={() => switchTo("start")} style={linkStyle}>New to Stawi? Open an account (phone + PIN, no code)</button>
    </form>
  );
}
