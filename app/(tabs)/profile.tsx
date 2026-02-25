import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const PRIMARY = '#1B6B4A';

export default function ProfileScreen() {
  const { user, signOut, debugBypass, setDebugBypass, userRole } = useAuth();

  const handleUseWithAccount = () => {
    setDebugBypass(false);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <MaterialIcons name={userRole === 'DRIVER' ? 'local-shipping' : 'person'} size={44} color="#fff" />
        </View>
        <Text style={styles.email}>
          {debugBypass ? 'Using without account' : (user?.email ?? '—')}
        </Text>
        {!debugBypass && (
          <View style={styles.roleBadge}>
            <MaterialIcons name={userRole === 'DRIVER' ? 'local-shipping' : 'person'} size={14} color={PRIMARY} />
            <Text style={styles.roleText}>{userRole === 'DRIVER' ? 'Driver' : 'User'}</Text>
          </View>
        )}
        {debugBypass && (
          <Text style={styles.bypassBadge}>Email / sign up skipped</Text>
        )}
      </View>

      {debugBypass && (
        <TouchableOpacity
          style={styles.useWithAccountBtn}
          onPress={handleUseWithAccount}
          activeOpacity={0.8}
        >
          <MaterialIcons name="login" size={20} color={PRIMARY} />
          <Text style={styles.useWithAccountText}>Use with account</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.signOutText}>{debugBypass ? 'Sign out (leave app)' : 'Sign Out'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#EEF2EE' },
  header:      { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E4EAE4' },
  title:       { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  avatarRow:   { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  avatar:      { width: 88, height: 88, borderRadius: 44, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  email:       { fontSize: 16, color: '#444', fontWeight: '500' },
  roleBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: 20, borderWidth: 1, borderColor: PRIMARY },
  roleText:     { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  bypassBadge: { fontSize: 12, color: '#888', marginTop: 4 },
  useWithAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 16, backgroundColor: '#E8F5E9', borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: PRIMARY },
  useWithAccountText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },
  signOutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, marginHorizontal: 20, borderRadius: 14, padding: 16, justifyContent: 'center' },
  signOutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
