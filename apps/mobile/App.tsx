import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  applyContribution,
  computeCapitalShares,
  formatMoney,
  type MemberContribution,
} from '@stawi/core';
import { colors, radius, spacing } from './theme/tokens';
import { SaccoScreen } from './SaccoScreen';

const SEED: (MemberContribution & { role: string })[] = [
  { memberId: 'a', name: 'Amina Wanjiru', role: 'Treasurer', totalCents: 4_200_000 },
  { memberId: 'b', name: 'Joseph Kamau', role: 'Chairman', totalCents: 3_800_000 },
  { memberId: 'c', name: 'Grace Otieno', role: 'Secretary', totalCents: 3_100_000 },
  { memberId: 'd', name: 'David Mwangi', role: 'Member', totalCents: 2_400_000 },
];

export default function App() {
  const [screen, setScreen] = useState<'home' | 'sacco'>('home');
  const [members, setMembers] = useState(SEED);
  const snap = useMemo(() => computeCapitalShares(members), [members]);

  function contribute(id: string) {
    const next = applyContribution(members, id, 500_000); // +KES 5,000
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        totalCents: next.members.find((x) => x.memberId === m.memberId)!.totalCents,
      })),
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.greet}>Umoja Women Group</Text>
        <Text style={styles.h1}>{screen === 'home' ? 'Group capital, live' : 'SACCO+ — save, borrow, graduate'}</Text>
        <View style={styles.tabs}>
          {(['home', 'sacco'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setScreen(t)} style={[styles.tab, screen === t && styles.tabOn]}>
              <Text style={[styles.tabTxt, screen === t && styles.tabTxtOn]}>
                {t === 'home' ? 'Table banking' : 'SACCO+'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {screen === 'sacco' ? (
        <SaccoScreen />
      ) : (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.balance}>
          <Text style={styles.label}>Total group capital</Text>
          <Text style={styles.big}>KES {formatMoney(snap.totalCents)}</Text>
        </View>

        <Text style={styles.section}>Capital ratio · tap to add KES 5,000</Text>
        {snap.members.map((m) => (
          <TouchableOpacity key={m.memberId} style={styles.row} onPress={() => contribute(m.memberId)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${m.sharePct}%` }]} />
              </View>
            </View>
            <Text style={styles.pct}>{m.sharePct.toFixed(1)}%</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bone },
  header: { backgroundColor: colors.forestDeep, padding: spacing.xl, paddingTop: spacing.xl + 8 },
  greet: { color: colors.bone, opacity: 0.8, fontSize: 13 },
  h1: { color: colors.bone, fontSize: 24, fontWeight: '600', marginTop: 2 },
  balance: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  label: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  big: { color: colors.forestDeep, fontSize: 30, fontWeight: '700', marginTop: 4 },
  section: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 14, fontWeight: '600', color: colors.ink },
  barBg: { height: 6, borderRadius: 6, backgroundColor: colors.bone2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: colors.gold },
  pct: { fontVariant: ['tabular-nums'], fontWeight: '600', color: colors.ink2 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(246,241,231,0.35)' },
  tabOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabTxt: { color: colors.bone, fontSize: 12, fontWeight: '700' },
  tabTxtOn: { color: colors.forestDeep },
});
