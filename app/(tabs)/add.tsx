import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>New Delivery</Text>
      </View>
      <View style={styles.empty}>
        <MaterialIcons name="add-circle-outline" size={52} color="#C8D8D0" />
        <Text style={styles.emptyTitle}>Create a delivery order</Text>
        <Text style={styles.emptySubtitle}>Booking and package details form coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#EEF2EE' },
  header:        { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E4EAE4' },
  title:         { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyTitle:    { fontSize: 17, fontWeight: '600', color: '#444', marginTop: 14, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 40 },
});
