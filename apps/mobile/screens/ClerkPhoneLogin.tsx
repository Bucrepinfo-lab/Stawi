/**
 * Production phone auth via Clerk (Expo). Two steps: enter phone → SMS code.
 * Handles both new and returning members: tries sign-in, falls back to sign-up.
 * Only rendered when EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set (see App.tsx).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { phoneRule } from '@stawi/core';
import { colors, radius, spacing } from '../theme/tokens';

export function ClerkPhoneLogin() {
  const { signIn, setActive: setSignInActive, isLoaded: siLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: suLoaded } = useSignUp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  function e164(p: string) {
    const d = p.replace(/[^\d]/g, '');
    if (d.startsWith('0')) return '+254' + d.slice(1);
    if (d.startsWith('254')) return '+' + d;
    return p.startsWith('+') ? p : '+' + d;
  }

  async function sendCode() {
    if (!siLoaded || !suLoaded) return;
    setBusy(true); setErr(undefined);
    const identifier = e164(phone);
    try {
      await signIn.create({ identifier });
      const f = signIn.supportedFirstFactors?.find((x: any) => x.strategy === 'phone_code');
      await signIn.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId: (f as any).phoneNumberId });
      setMode('in'); setStage('code');
    } catch {
      try {
        await signUp.create({ phoneNumber: identifier });
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
        setMode('up'); setStage('code');
      } catch (e2: any) {
        setErr(e2?.errors?.[0]?.message ?? 'Could not send the code. Check the number.');
      }
    } finally { setBusy(false); }
  }

  async function verify() {
    setBusy(true); setErr(undefined);
    try {
      if (mode === 'in') {
        const r = await signIn.attemptFirstFactor({ strategy: 'phone_code', code });
        if (r.status === 'complete') await setSignInActive({ session: r.createdSessionId });
      } else {
        const r = await signUp.attemptPhoneNumberVerification({ code });
        if (r.status === 'complete') await setSignUpActive({ session: r.createdSessionId });
      }
    } catch (e: any) {
      setErr(e?.errors?.[0]?.message ?? 'That code did not match. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={s.kicker}>SAVE TOGETHER · GROW TOGETHER</Text>
      <Text style={s.h1}>{stage === 'phone' ? 'Enter with your phone' : 'Enter the code'}</Text>
      <Text style={s.sub}>{stage === 'phone' ? 'No email needed. We’ll text you a one-time code.' : `Sent to ${e164(phone)}.`}</Text>

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
