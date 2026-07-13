/**
 * Phone-first login — Pillar 1.
 * The member enters the number their group registered them with; Stawi matches it
 * against every roster and hands back the groups they belong to. No email.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { findMemberGroups, type MemberGroupLink } from '@stawi/core';
import { DIRECTORIES } from '../data/seed';
import { colors, radius, spacing } from '../theme/tokens';

const DEMO = [
  { phone: '0712345678', who: 'Amina · Chairperson' },
  { phone: '0722000111', who: 'Grace · Treasurer' },
  { phone: '0701222333', who: 'David · Member' },
  { phone: '0790000000', who: 'New number' },
];

export function PhoneLoginScreen({ onLogin }: { onLogin: (phone: string, links: MemberGroupLink[]) => void }) {
  const [phone, setPhone] = useState('');

  function go(p: string) {
    const v = (p ?? phone).trim();
    onLogin(v, findMemberGroups(v, DIRECTORIES));
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={s.kicker}>SAVE TOGETHER · GROW TOGETHER</Text>
      <Text style={s.h1}>Enter with your phone</Text>
      <Text style={s.sub}>No email needed. Use the number your group registered you with — your groups appear the moment you’re in.</Text>

      <Text style={s.label}>Phone number</Text>
      <View style={s.phoneRow}>
        <View style={s.cc}><Text style={s.ccTxt}>🇰🇪 +254</Text></View>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" placeholderTextColor={colors.faint} />
      </View>
      <TouchableOpacity style={s.cta} onPress={() => go(phone)}>
        <Text style={s.ctaTxt}>Send code &amp; continue →</Text>
      </TouchableOpacity>
      <Text style={s.note}>We’ll text a one-time code. (Prototype: continues instantly.)</Text>

      <Text style={[s.label, { marginTop: spacing.xl }]}>Try a demo number</Text>
      {DEMO.map((d) => (
        <TouchableOpacity key={d.phone} style={s.demo} onPress={() => { setPhone(d.phone); go(d.phone); }}>
          <Text style={s.demoPhone}>{d.phone}</Text>
          <Text style={s.demoWho}>{d.who}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kicker: { color: colors.goldDeep, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  h1: { color: colors.forestDeep, fontSize: 28, fontWeight: '700', marginTop: 6 },
  sub: { color: colors.ink2, fontSize: 14, lineHeight: 21, marginTop: 8 },
  label: { color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.xl, marginBottom: spacing.sm },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  cc: { justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper },
  ccTxt: { fontWeight: '700', color: colors.ink },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  cta: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  ctaTxt: { color: colors.forestDeep, fontWeight: '800', fontSize: 15 },
  note: { color: colors.dim, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  demo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  demoPhone: { fontVariant: ['tabular-nums'], fontWeight: '700', color: colors.forestDeep },
  demoWho: { color: colors.dim, fontSize: 12.5 },
});
