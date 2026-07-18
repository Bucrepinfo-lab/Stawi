/** Groups discovered by the signed-in phone number. */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MemberGroupLink } from '@stawi/core';
import { colors, radius, spacing } from '../theme/tokens';

export function GroupsHomeScreen({ phone, links, onOpen, onSwitch }: {
  phone: string; links: MemberGroupLink[]; onOpen: (groupId: string) => void; onSwitch: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={s.kicker}>YOUR GROUPS</Text>
      <Text style={s.h1}>Linked by your phone number</Text>
      <Text style={s.sub}>Groups whose roster carries {phone || 'this number'}.</Text>

      {links.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 30 }}>📭</Text>
          <Text style={s.emptyT}>No groups linked to {phone || 'this number'} yet.</Text>
          <Text style={s.sub}>When an official adds this number to a group’s roster, it appears here automatically. Or preview a group:</Text>
          <TouchableOpacity style={s.cta} onPress={() => onOpen('umoja')}><Text style={s.ctaTxt}>＋ Preview a group</Text></TouchableOpacity>
        </View>
      ) : links.map((l) => (
        <TouchableOpacity key={l.groupId} style={s.card} onPress={() => onOpen(l.groupId)}>
          <View style={s.rowTop}>
            <Text style={s.gName}>{l.groupName}</Text>
            <View style={[s.badge, l.isOfficial ? s.bOfficial : s.bMember]}>
              <Text style={[s.badgeT, { color: l.isOfficial ? colors.goldDeep : colors.dim }]}>{l.isOfficial ? (l.designation ?? 'Official') : 'Member'}</Text>
            </View>
          </View>
          <Text style={s.meta}>You are {l.memberName} · tap to open workspace →</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.ghost} onPress={onSwitch}><Text style={s.ghostT}>← Use a different number</Text></TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kicker: { color: colors.goldDeep, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  h1: { color: colors.forestDeep, fontSize: 22, fontWeight: '700', marginTop: 4 },
  sub: { color: colors.ink2, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gName: { fontSize: 17, fontWeight: '700', color: colors.forestDeep },
  meta: { color: colors.dim, fontSize: 12.5, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  bOfficial: { backgroundColor: 'rgba(224,163,46,0.16)' },
  bMember: { backgroundColor: colors.bone2 },
  badgeT: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  empty: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', marginTop: spacing.md },
  emptyT: { fontWeight: '700', color: colors.ink, marginTop: 6, textAlign: 'center' },
  cta: { backgroundColor: colors.forestDeep, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 18, marginTop: spacing.md },
  ctaTxt: { color: colors.bone, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.lg },
  ghostT: { color: colors.forestDeep, fontWeight: '700' },
});
