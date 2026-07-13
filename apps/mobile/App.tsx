import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { MemberGroupLink } from '@stawi/core';
import { colors, radius, spacing } from './theme/tokens';
import { PhoneLoginScreen } from './screens/PhoneLoginScreen';
import { GroupsHomeScreen } from './screens/GroupsHomeScreen';
import { CockpitScreen } from './screens/CockpitScreen';
import { TableBankingScreen } from './screens/TableBankingScreen';
import { SaccoScreen } from './SaccoScreen';
import { CHARTER, MEETINGS } from './data/seed';

type View3 = 'login' | 'groups' | 'group';
type GroupTab = 'records' | 'money' | 'sacco';

export default function App() {
  const [view, setView] = useState<View3>('login');
  const [phone, setPhone] = useState('');
  const [links, setLinks] = useState<MemberGroupLink[]>([]);
  const [activeId, setActiveId] = useState('umoja');
  const [gtab, setGtab] = useState<GroupTab>('records');

  const link = links.find((l) => l.groupId === activeId);
  const canEdit = link ? link.isOfficial : true; // preview groups are editable
  const groupName = link?.groupName ?? CHARTER.name;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {view === 'login' && <><Text style={styles.greet}>Stawi</Text><Text style={styles.h1}>Save together, grow together</Text></>}
        {view === 'groups' && <><Text style={styles.greet}>Signed in · {phone}</Text><Text style={styles.h1}>Your groups</Text></>}
        {view === 'group' && (
          <>
            <TouchableOpacity onPress={() => setView('groups')}><Text style={styles.back}>← Groups</Text></TouchableOpacity>
            <Text style={styles.h1}>{groupName}</Text>
            <View style={styles.tabs}>
              {([['records', 'Records'], ['money', 'Table banking'], ['sacco', 'SACCO+']] as [GroupTab, string][]).map(([k, lbl]) => (
                <TouchableOpacity key={k} onPress={() => setGtab(k)} style={[styles.tab, gtab === k && styles.tabOn]}>
                  <Text style={[styles.tabTxt, gtab === k && styles.tabTxtOn]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {view === 'login' && (
        <PhoneLoginScreen onLogin={(p, l) => { setPhone(p); setLinks(l); setView('groups'); }} />
      )}
      {view === 'groups' && (
        <GroupsHomeScreen phone={phone} links={links} onOpen={(id) => { setActiveId(id); setGtab('records'); setView('group'); }} onSwitch={() => setView('login')} />
      )}
      {view === 'group' && gtab === 'records' && <CockpitScreen charter={CHARTER} meetings={MEETINGS} canEdit={canEdit} />}
      {view === 'group' && gtab === 'money' && <TableBankingScreen />}
      {view === 'group' && gtab === 'sacco' && <SaccoScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bone },
  header: { backgroundColor: colors.forestDeep, padding: spacing.xl, paddingTop: spacing.xl + 8 },
  greet: { color: colors.bone, opacity: 0.8, fontSize: 13 },
  back: { color: colors.gold, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  h1: { color: colors.bone, fontSize: 22, fontWeight: '600', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(246,241,231,0.35)' },
  tabOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabTxt: { color: colors.bone, fontSize: 12, fontWeight: '700' },
  tabTxtOn: { color: colors.forestDeep },
});
