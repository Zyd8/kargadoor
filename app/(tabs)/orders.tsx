import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#1B6B4A';

type Package = {
  ID: string;
  PICKUP_ADDRESS: string | null;
  RECIPIENT_ADDRESS: string | null;
  RECIPIENT_NAME: string | null;
  VEHICLE_TYPE: string | null;
  STATUS: string | null;
  CREATED_AT: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:       '#F59E0B',
  'IN PROGRESS': PRIMARY,
  COMPLETE:      '#6B7280',
  CANCELLED:     '#EF4444',
};

const VEHICLE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  motorcycle: 'two-wheeler',
  car:        'directions-car',
  truck:      'local-shipping',
};

function StatusBadge({ status }: { status: string | null }) {
  const label = (status ?? 'PENDING').toUpperCase();
  const color = STATUS_COLOR[label] ?? '#888';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function OrderCard({ item }: { item: Package }) {
  const vehicleIcon = VEHICLE_ICON[item.VEHICLE_TYPE ?? ''] ?? 'local-shipping';
  const pickup  = item.PICKUP_ADDRESS   ?? '—';
  const dropoff = item.RECIPIENT_ADDRESS ?? '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.vehicleCircle}>
          <MaterialIcons name={vehicleIcon} size={22} color={PRIMARY} />
        </View>
        <View style={styles.cardMid}>
          <Text style={styles.cardRoute} numberOfLines={1}>{pickup}</Text>
          <Text style={styles.cardArrow}>↓</Text>
          <Text style={styles.cardRoute} numberOfLines={1}>{dropoff}</Text>
        </View>
        <StatusBadge status={item.STATUS} />
      </View>
      {item.RECIPIENT_NAME ? (
        <Text style={styles.cardSub}>
          To: {item.RECIPIENT_NAME}
          {item.VEHICLE_TYPE ? `  ·  ${item.VEHICLE_TYPE.charAt(0).toUpperCase() + item.VEHICLE_TYPE.slice(1)}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('PACKAGES')
      .select('ID, PICKUP_ADDRESS, RECIPIENT_ADDRESS, RECIPIENT_NAME, VEHICLE_TYPE, STATUS, CREATED_AT')
      .eq('SENDER_ID', user.id)
      .order('CREATED_AT', { ascending: false });
    setOrders((data as Package[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.ID}
          renderItem={({ item }) => <OrderCard item={item} />}
          contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="local-shipping" size={52} color="#C8D8D0" />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create your first delivery.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#EEF2EE' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  title:  { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContent:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  emptyContainer: { flex: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'center' },
  vehicleCircle:{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2EE', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardMid:      { flex: 1, marginRight: 8 },
  cardRoute:    { fontSize: 13, color: '#333', fontWeight: '500' },
  cardArrow:    { fontSize: 11, color: '#C0C8C0', marginVertical: 1 },
  cardSub:      { fontSize: 12, color: '#999', marginTop: 8, marginLeft: 52 },

  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyTitle:   { fontSize: 17, fontWeight: '600', color: '#444', marginTop: 14, marginBottom: 6 },
  emptySubtitle:{ fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 40 },
});
