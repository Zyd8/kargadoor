import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const PRIMARY = '#1B6B4A';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={44} color="#fff" />
        </View>
        <Text style={styles.email}>{user?.email ?? 'Driver'}</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
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
  signOutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, marginHorizontal: 20, borderRadius: 14, padding: 16, justifyContent: 'center' },
  signOutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
