/**
 * Production phone auth via Supabase (Expo). Two steps: enter phone → SMS code.
 * One flow covers new and returning members — Supabase creates the user on first
 * verify. Only rendered when EXPO_PUBLIC_SUPABASE_URL is set (see App.tsx). On
 * success the session updates and App swaps to the group view automatically.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { phoneRule, toE164 } from '@stawi/core';
import { colors, radius, spacing } from '../theme/tokens';
import { supabase } from '../lib/supabase';

export function SupabasePhoneLogin() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [e164Phone, setE164Phone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  async function sendCode() {
    const e164 = toE164(phone);
    if (!e164) { setErr('Enter a valid phone number.'); return; }
    setBusy(true); setErr(undefined);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setE164Phone(e164); setStage('code');
  }

  async function verify() {
    setBusy(true); setErr(undefined);
    const { error } = await supabase.auth.verifyOtp({ phone: e164Phone, token: code.trim(), type: 'sms' });
    setBusy(false);
    if (error) { setErr('That code did not match. Try again.'); return; }
    // Session change is observed by App's SupabaseGate; nothing else to do.
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={s.kicker}>SAVE TOGETHER · GROW TOGETHER</Text>
      <Text style={s.h1}>{stage === 'phone' ? 'Enter with your phone' : 'Enter the code'}</Text>
      <Text style={s.sub}>{stage === 'phone' ? 'No email needed. We’ll text you a one-time code.' : `Sent to ${e164Phone}.`}</Text>

      {stage === 'phone' ? (
        <>
          <Text style={s.label}>Phone number</Text>
          <View style={s.row}>
            <View style={s.cc}><Text style={s.ccTxt}>🇰🇪 +254</Text></View>
            <TextInput style={s.input} value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={phoneRule('KE').localMaxDigits} placeholder={phoneRule('KE').placeholder} placeholderTextColor={colors.faint} />
          </View>
          <TouchableOpacity style={[s.cta, busy && s.disabled]} disabled={busy} onPress={sendCode}><Text style={s.ctaTxt}>{busy ? 'Sending…' : 'Send code →'}</Text></TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.label}>6-digit code</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" placeholderTextColor={colors.faint} />
          <TouchableOpacity style={[s.cta, busy && s.disabled]} disabled={busy} onPress={verify}><Text style={s.ctaTxt}>{busy ? 'Verifying…' : 'Verify & continue →'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setStage('phone'); setCode(''); }}><Text style={s.back}>← Use a different number</Text></TouchableOpacity>
        </>
      )}
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
