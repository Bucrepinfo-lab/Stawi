/**
 * Mobile sign-in (Expo): phone number, then the person's own 4-digit PIN — no
 * SMS (owner 20/11/26). The server checks the PIN (POST /api/auth/pin/sign-in
 * with app: true) and hands back the session, which Supabase keeps. A first
 * sign-in, forgotten or locked PIN uses the joining code a group official
 * gave, on the website; then the PIN works here too.
 */
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { phoneRule, toE164 } from '@stawi/core';
import { colors, radius, spacing } from '../theme/tokens';
import { supabase } from '../lib/supabase';

const BASE = (process.env.EXPO_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

export function SupabasePhoneLogin() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  async function signIn() {
    const e164 = toE164(phone);
    if (!e164) { setErr('Enter a valid phone number.'); return; }
    if (!/^\d{4}$/.test(pin)) { setErr('Enter your 4-digit PIN.'); return; }
    if (!BASE) { setErr('Sign-in is not set up in this build.'); return; }
    setBusy(true); setErr(undefined);
    try {
      const res = await fetch(`${BASE}/api/auth/pin/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, pin, app: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session) { setErr(data.error ?? 'Could not sign in. Try again.'); return; }
      const { error } = await supabase.auth.setSession({ access_token: data.session.accessToken, refresh_token: data.session.refreshToken });
      if (error) setErr('Could not sign in. Try again.');
      // Session change is observed by App's SupabaseGate; nothing else to do.
    } catch {
      setErr('No connection. Try again.');
    } finally {
      setBusy(false);
      setPin('');
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={s.kicker}>SAVE TOGETHER · GROW TOGETHER</Text>
      <Text style={s.h1}>Enter with your phone</Text>
      <Text style={s.sub}>Your phone number and your own 4-digit PIN. No email, no SMS.</Text>

      <Text style={s.label}>Phone number</Text>
      <View style={s.row}>
        <View style={s.cc}><Text style={s.ccTxt}>🇰🇪 +254</Text></View>
        <TextInput style={s.input} value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={phoneRule('KE').localMaxDigits} placeholder={phoneRule('KE').placeholder} placeholderTextColor={colors.faint} />
      </View>
      <Text style={s.label}>PIN</Text>
      <TextInput style={s.input} value={pin} onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor={colors.faint} />
      <TouchableOpacity style={[s.cta, busy && s.disabled]} disabled={busy} onPress={signIn}><Text style={s.ctaTxt}>{busy ? 'Checking…' : 'Sign in →'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => { if (BASE) void Linking.openURL(`${BASE}/sign-in?code=1`); }}>
        <Text style={s.back}>Your group added you, or forgot your PIN? Use the code your group official gave you</Text>
      </TouchableOpacity>
      {!!err && <Text style={s.err}>{err}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kicker: { color: colors.goldDeep, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  h1: { color: colors.forestDeep, fontSize: 28, fontWeight: '700', marginTop: 6 },
  sub: { color: colors.ink2, fontSize: 14, lineHeight: 21, marginTop: 8 },
  label: { color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cc: { justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper },
  ccTxt: { fontWeight: '700', color: colors.ink },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  cta: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  ctaTxt: { color: colors.forestDeep, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.5 },
  back: { color: colors.forest, fontWeight: '700', textAlign: 'center', marginTop: spacing.md },
  err: { color: colors.danger, fontWeight: '700', marginTop: spacing.md },
});
