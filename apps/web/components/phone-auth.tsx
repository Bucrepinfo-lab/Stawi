"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toE164 } from "@stawi/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Phone → SMS-OTP auth. One flow covers sign-up AND sign-in (Supabase creates the
 * user on first OTP). The verified phone is the login + M-Pesa identity, and the
 * key a group's roster is registered under — so groups surface automatically.
 */
export function PhoneAuth({ afterAuthUrl = "/dashboard" }: { afterAuthUrl?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || afterAuthUrl;
  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const e164 = toE164(phoneInput);
    if (!e164) {
      setError("Enter a valid phone number, e.g. 0712 345 678.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: true } });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPhone(e164);
    setStep("otp");
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
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

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} style={{ display: "grid", gap: 12, textAlign: "left" }}>
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Phone number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
            autoFocus
          />
        </label>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>
          We&apos;ll text you a 6-digit code. This number is also your M-Pesa number for contributions.
        </p>
        {error && <p style={{ fontSize: 13.5, color: "#b3261e", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} style={{ display: "grid", gap: 12, textAlign: "left" }}>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>
        Enter the code sent to <b>{phone}</b>.
      </p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.4em", fontWeight: 600 }}
        autoFocus
      />
      {error && <p style={{ fontSize: 13.5, color: "#b3261e", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading || code.length < 4} style={{ ...btnStyle, opacity: loading || code.length < 4 ? 0.6 : 1 }}>
        {loading ? "Verifying…" : "Verify & continue"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep("phone");
          setCode("");
          setError(null);
        }}
        style={{ background: "none", border: 0, color: "var(--ink-2)", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
      >
        Use a different number
      </button>
    </form>
  );
}
