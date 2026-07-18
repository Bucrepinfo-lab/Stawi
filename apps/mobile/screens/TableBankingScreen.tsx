/** Table-banking capital view (Pillar 1) — extracted from the original home. */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { applyContribution, computeCapitalShares, formatMoney, type MemberContribution } from '@stawi/core';
import { colors, radius, spacing } from '../theme/tokens';

const SEED: (MemberContribution & { role: string })[] = [
  { memberId: 'a', name: 'Amina Wanjiru', role: 'Treasurer', totalCents: 4_200_000 },
  { memberId: 'b', name: 'Joseph Kamau', role: 'Chairman', totalCents: 3_800_000 },
  { memberId: 'c', name: 'Grace Otieno', role: 'Secretary', totalCents: 3_100_000 },
  { memberId: 'd', name: 'David Mwangi', role: 'Member', totalCents: 2_400_000 },
];

export function TableBankingScreen() {
  const [members, setMembers] = useState(SEED);
  const snap = useMemo(() => computeCapitalShares(members), [members]);
  function contribute(id: string) {
    const next = applyContribution(members, id, 500_000);
    setMembers((prev) => prev.map((m) => ({ ...m, totalCents: next.members.find((x) => x.memberId === m.memberId)!.totalCents })));
  }
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={s.balance}>
        <Text style={s.label}>Total group capital</Text>
        <Text style={s.big}>KES {formatMoney(snap.totalCents)}</Text>
      </View>
      <Text style={s.section}>Capital ratio · tap to add KES 5,000</Text>
      {snap.members.map((m) => (
        <TouchableOpacity key={m.memberId} style={s.row} onPress={() => contribute(m.memberId)}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{m.name}</Text>
            <View style={s.barBg}><View style={[s.barFill, { width: `${m.sharePct}%` }]} /></View>
          </View>
          <Text style={s.pct}>{m.sharePct.toFixed(1)}%</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  balance: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  label: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  big: { color: colors.forestDeep, fontSize: 30, fontWeight: '700', marginTop: 4 },
  section: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 14, fontWeight: '600', color: colors.ink },
  barBg: { height: 6, borderRadius: 6, backgroundColor: colors.bone2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: colors.gold },
  pct: { fontVariant: ['tabular-nums'], fontWeight: '600', color: colors.ink2 },
});
