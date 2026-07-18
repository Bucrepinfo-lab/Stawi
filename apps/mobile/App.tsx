import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { findMemberGroups, type GroupCharter, type Meeting, type MemberGroupLink } from '@stawi/core';
import { colors, radius, spacing } from './theme/tokens';
import { PhoneLoginScreen } from './screens/PhoneLoginScreen';
import { ClerkPhoneLogin } from './screens/ClerkPhoneLogin';
import { GroupsHomeScreen } from './screens/GroupsHomeScreen';
import { CockpitScreen } from './screens/CockpitScreen';
import { TableBankingScreen } from './screens/TableBankingScreen';
import { SaccoScreen } from './SaccoScreen';
import { CHARTER, MEETINGS, DIRECTORIES } from './data/seed';
import { api, setAuthTokenProvider } from './lib/api';
import { tokenCache } from './lib/tokenCache';

const CLERK_PK = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface Session { phone: string; getToken: () => Promise<string | null>; signOut: () => void; }

// Root: use Clerk auth when configured, else the self-contained demo flow.
export default function App() {
  if (CLERK_PK) {
    return (
      <ClerkProvider publishableKey={CLERK_PK} tokenCache={tokenCache}>
        <ClerkGate />
      </ClerkProvider>
    );
  }
  return <MainApp />;
}

function ClerkGate() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  if (!isLoaded) {
    return <SafeAreaView style={styles.root}><View style={styles.loading}><ActivityIndicator color={colors.forest} /></View></SafeAreaView>;
  }
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}><Text style={styles.greet}>Stawi</Text><Text style={styles.h1}>Save together, grow together</Text></View>
        <ClerkPhoneLogin />
      </SafeAreaView>
    );
  }
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? '';
  return <MainApp session={{ phone, getToken: () => getToken(), signOut: () => signOut() }} />;
}

type View3 = 'login' | 'groups' | 'group';
type GroupTab = 'records' | 'money' | 'sacco';

function MainApp({ session }: { session?: Session }) {
  const [view, setView] = useState<View3>(session ? 'groups' : 'login');
  const [phone, setPhone] = useState(session?.phone ?? '');
  const [links, setLinks] = useState<MemberGroupLink[]>([]);
  const [gtab, setGtab] = useState<GroupTab>('records');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [cockpit, setCockpit] = useState<{ charter: GroupCharter; meetings: Meeting[]; groupId: string; groupName: string } | null>(null);
  const [activeLink, setActiveLink] = useState<MemberGroupLink | null>(null);

  // When Clerk-authenticated: register the bearer-token provider and auto-load groups.
  useEffect(() => {
    if (!session) { setAuthTokenProvider(null); return; }
    setAuthTokenProvider(session.getToken);
    onLogin(session.phone, findMemberGroups(session.phone, DIRECTORIES));
    return () => setAuthTokenProvider(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phone]);

  async function onLogin(p: string, seedLinks: MemberGroupLink[]) {
    setPhone(p); setView('groups'); setLoading(true);
    const remote = await api.groupsByPhone(p);
    setLive(remote !== null);
    setLinks(remote ?? seedLinks);
    setLoading(false);
  }

  async function openGroup(groupId: string, link: MemberGroupLink | null) {
    setActiveLink(link); setGtab('records'); setView('group'); setLoading(true);
    const remote = await api.cockpit(groupId);
    setLive(remote !== null);
    if (remote) setCockpit({ charter: remote.charter, meetings: remote.meetings, groupId: remote.groupId, groupName: remote.groupName });
    else setCockpit({ charter: CHARTER, meetings: MEETINGS, groupId, groupName: link?.groupName ?? CHARTER.name });
    setLoading(false);
  }

  const canEdit = activeLink ? activeLink.isOfficial : true;
  const groupName = cockpit?.groupName ?? activeLink?.groupName ?? CHARTER.name;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {view === 'login' && <><Text style={styles.greet}>Stawi</Text><Text style={styles.h1}>Save together, grow together</Text></>}
        {view === 'groups' && (
          <>
            <View style={styles.hrow}><Text style={styles.greet}>Signed in · {phone || '—'}</Text><ConnPill live={live} /></View>
            <Text style={styles.h1}>Your groups</Text>
          </>
        )}
        {view === 'group' && (
          <>
            <TouchableOpacity onPress={() => setView('groups')}><Text style={styles.back}>← Groups</Text></TouchableOpacity>
            <View style={styles.hrow}><Text style={styles.h1}>{groupName}</Text><ConnPill live={live} /></View>
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

      {loading && <View style={styles.loading}><ActivityIndicator color={colors.forest} /><Text style={styles.loadTxt}>Loading…</Text></View>}

      {!loading && view === 'login' && <PhoneLoginScreen onLogin={onLogin} />}
      {!loading && view === 'groups' && (
        <GroupsHomeScreen
          phone={phone}
          links={links}
          onOpen={(id) => openGroup(id, links.find((l) => l.groupId === id) ?? null)}
          onSwitch={() => (session ? session.signOut() : setView('login'))}
        />
      )}
      {!loading && view === 'group' && cockpit && gtab === 'records' && (
        <CockpitScreen
          charter={cockpit.charter}
          meetings={cockpit.meetings}
          canEdit={canEdit}
          onSaveMeeting={(m) => api.saveMeeting(cockpit.groupId, m)}
          onPostMeeting={(m, doc) => api.postMeeting(cockpit.groupId, m.meetingNo, doc)}
        />
      )}
      {!loading && view === 'group' && gtab === 'money' && <TableBankingScreen />}
      {!loading && view === 'group' && gtab === 'sacco' && <SaccoScreen />}
    </SafeAreaView>
  );
}

function ConnPill({ live }: { live: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: live ? 'rgba(47,125,82,0.25)' : 'rgba(246,241,231,0.18)' }]}>
      <Text style={styles.pillTxt}>{live ? '● Live' : '○ Offline'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bone },
  header: { backgroundColor: colors.forestDeep, padding: spacing.xl, paddingTop: spacing.xl + 8 },
  hrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greet: { color: colors.bone, opacity: 0.8, fontSize: 13 },
  back: { color: colors.gold, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  h1: { color: colors.bone, fontSize: 22, fontWeight: '600', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(246,241,231,0.35)' },
  tabOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabTxt: { color: colors.bone, fontSize: 12, fontWeight: '700' },
  tabTxtOn: { color: colors.forestDeep },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  pillTxt: { color: colors.bone, fontSize: 10.5, fontWeight: '800' },
  loading: { padding: spacing.xl, alignItems: 'center', gap: 8 },
  loadTxt: { color: colors.dim, fontSize: 13 },
});
