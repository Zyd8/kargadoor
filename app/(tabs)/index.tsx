import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const PRIMARY  = '#1B6B4A';
const CARD_BG  = '#1A5A3A';
const MINT_BG  = '#B0D4C4';
const APP_BG   = '#EEF2EE';

const STATUS_COLOR: Record<string, string> = {
  PENDING:     '#F59E0B',
  IN_PROGRESS: PRIMARY,
  COMPLETE:    '#6B7280',
  CANCELLED:   '#EF4444',
};

type ActiveOrder = {
  ID: string;
  STATUS: string | null;
  PICKUP_ADDRESS: string | null;
  RECIPIENT_ADDRESS: string | null;
  PICKUP_LAT: number | null;
  PICKUP_LNG: number | null;
  PRICE: number | null;
};

type RecentOrder = {
  ID: string;
  STATUS: string | null;
};

type DriverStats = {
  totalDeliveries: number;
  totalEarnings: number;
  inProgressCount: number;
  cancelledCount: number;
};

type ActiveDelivery = {
  ID: string;
  PICKUP_ADDRESS: string | null;
  RECIPIENT_ADDRESS: string | null;
  RECIPIENT_NAME: string | null;
  RECIPIENT_NUMBER: string | null;
  PRICE: number | null;
};

function staticMapUrl(lat: number, lng: number) {
  return (
    `https://api.tomtom.com/map/1/staticimage` +
    `?key=${TOMTOM_KEY}&zoom=13&center=${lng},${lat}` +
    `&width=220&height=140&format=png&layer=basic&style=main`
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? 'PENDING';
  const color = STATUS_COLOR[label] ?? '#888';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label.replace('_', ' ')}</Text>
    </View>
  );
}

// ── USER home ────────────────────────────────────────────────────────────────

function UserHome({ userId }: { userId: string }) {
  const [active, setActive]   = useState<ActiveOrder | null>(null);
  const [recent, setRecent]   = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from('PACKAGES')
          .select('ID, STATUS, PICKUP_ADDRESS, RECIPIENT_ADDRESS, PICKUP_LAT, PICKUP_LNG, PRICE')
          .eq('SENDER_ID', userId)
          .order('CREATED_AT', { ascending: false })
          .limit(5);
        if (!mounted) return;
        const list = (data ?? []) as ActiveOrder[];
        const act = list.find(o => o.STATUS === 'PENDING' || o.STATUS === 'IN_PROGRESS') ?? null;
        setActive(act);
        setRecent(list);
        setLoading(false);
      })();
      return () => { mounted = false; };
    }, [userId])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const mapUrl = active?.PICKUP_LAT && active?.PICKUP_LNG
    ? staticMapUrl(active.PICKUP_LAT, active.PICKUP_LNG)
    : staticMapUrl(14.5995, 120.9842); // Manila fallback

  return (
    <>
      {/* Active order card */}
      {active ? (
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Active Order</Text>
              <StatusBadge status={active.STATUS} />
            </View>
            <Text style={styles.cardTrackNum}>#{active.ID.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.cardLabel}>From</Text>
            <Text style={styles.cardLocation} numberOfLines={1}>{active.PICKUP_ADDRESS ?? '—'}</Text>
            <Text style={styles.cardLabel}>To</Text>
            <Text style={styles.cardLocation} numberOfLines={1}>{active.RECIPIENT_ADDRESS ?? '—'}</Text>
            {active.PRICE ? (
              <Text style={styles.cardPrice}>
                ₱{Number(active.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            ) : null}
          </View>
          <View style={styles.mapThumb}>
            <Image source={{ uri: mapUrl }} style={styles.mapImage} contentFit="cover" />
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <MaterialIcons name="local-shipping" size={36} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyCardText}>No active orders</Text>
          <Text style={styles.emptyCardSub}>Create one with the button below</Text>
        </View>
      )}

      {/* New Delivery button */}
      <TouchableOpacity
        style={styles.newDeliveryBtn}
        onPress={() => router.navigate('/(tabs)/add')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={20} color="#fff" />
        <Text style={styles.newDeliveryText}>New Delivery</Text>
      </TouchableOpacity>

      {/* Recent orders */}
      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.shipmentCard}>
            {recent.slice(0, 4).map((item, idx) => {
              const label = item.STATUS ?? 'PENDING';
              const color = STATUS_COLOR[label] ?? '#888';
              return (
                <View
                  key={item.ID}
                  style={[styles.shipmentRow, idx < Math.min(recent.length, 4) - 1 && styles.shipmentRowBorder]}
                >
                  <Text style={styles.shipmentId}>#{item.ID.slice(0, 8).toUpperCase()}</Text>
                  <Text style={[styles.shipmentStatus, { color }]}>{label.replace('_', ' ')}</Text>
                </View>
              );
            })}
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.navigate('/(tabs)/orders')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
}

// ── DRIVER home ──────────────────────────────────────────────────────────────

function DriverHome({ userId }: { userId: string }) {
  const [stats, setStats]       = useState<DriverStats>({ totalDeliveries: 0, totalEarnings: 0, inProgressCount: 0, cancelledCount: 0 });
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);

        const [completedRes, activeRes, inProgressRes, cancelledRes] = await Promise.all([
          supabase
            .from('PACKAGES')
            .select('PRICE')
            .eq('DRIVER_ID', userId)
            .eq('STATUS', 'COMPLETE'),
          supabase
            .from('PACKAGES')
            .select('ID, PICKUP_ADDRESS, RECIPIENT_ADDRESS, RECIPIENT_NAME, RECIPIENT_NUMBER, PRICE')
            .eq('DRIVER_ID', userId)
            .eq('STATUS', 'IN_PROGRESS')
            .limit(1)
            .maybeSingle(),
          supabase
            .from('PACKAGES')
            .select('*', { count: 'exact', head: true })
            .eq('DRIVER_ID', userId)
            .eq('STATUS', 'IN_PROGRESS'),
          supabase
            .from('PACKAGES')
            .select('*', { count: 'exact', head: true })
            .eq('DRIVER_ID', userId)
            .eq('STATUS', 'CANCELLED'),
        ]);

        if (!mounted) return;

        const completed = completedRes.data ?? [];
        const totalDeliveries = completed.length;
        const totalEarnings = completed.reduce((sum: number, r: { PRICE: number | null }) => sum + (r.PRICE ?? 0), 0);
        setStats({
          totalDeliveries,
          totalEarnings,
          inProgressCount: inProgressRes.count ?? 0,
          cancelledCount: cancelledRes.count ?? 0,
        });
        setDelivery((activeRes.data as ActiveDelivery | null) ?? null);
        setLoading(false);
      })();
      return () => { mounted = false; };
    }, [userId])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <>
      {/* Stats row — earnings + total deliveries */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { marginLeft: 12 }]}>
          <Text style={styles.statValue}>
            ₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
      </View>

      {/* Status breakdown pills */}
      <View style={styles.statusRow}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: PRIMARY }]} />
          <Text style={styles.statusPillCount}>{stats.inProgressCount}</Text>
          <Text style={styles.statusPillLabel}>In Progress</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: '#6B7280' }]} />
          <Text style={styles.statusPillCount}>{stats.totalDeliveries}</Text>
          <Text style={styles.statusPillLabel}>Complete</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.statusPillCount}>{stats.cancelledCount}</Text>
          <Text style={styles.statusPillLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Active delivery */}
      <Text style={styles.sectionTitle}>Active Delivery</Text>
      {delivery ? (
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryRow}>
            <MaterialIcons name="place" size={16} color={PRIMARY} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.deliveryLabel}>Pick Up</Text>
              <Text style={styles.deliveryAddr} numberOfLines={2}>{delivery.PICKUP_ADDRESS ?? '—'}</Text>
            </View>
          </View>
          <View style={[styles.deliveryRow, { marginTop: 10 }]}>
            <MaterialIcons name="flag" size={16} color="#EF4444" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.deliveryLabel}>Drop Off</Text>
              <Text style={styles.deliveryAddr} numberOfLines={2}>{delivery.RECIPIENT_ADDRESS ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.deliveryFooter}>
            <Text style={styles.deliveryRecipient}>
              {delivery.RECIPIENT_NAME ?? '—'}
              {delivery.RECIPIENT_NUMBER ? `  ·  ${delivery.RECIPIENT_NUMBER}` : ''}
            </Text>
            {delivery.PRICE ? (
              <Text style={styles.deliveryPrice}>
                ₱{Number(delivery.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.noDeliveryCard}>
          <MaterialIcons name="search" size={32} color="#C0C8C0" />
          <Text style={styles.noDeliveryText}>No active delivery</Text>
          <Text style={styles.noDeliverySub}>Find orders to start delivering</Text>
        </View>
      )}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, userRole } = useAuth();
  const isDriver = userRole === 'DRIVER';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <MaterialIcons name="local-shipping" size={22} color={PRIMARY} />
            <Text style={styles.logoText}>KARGADOOR</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <MaterialIcons name="notifications-none" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {user ? (
          isDriver
            ? <DriverHome userId={user.id} />
            : <UserHome userId={user.id} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.noDeliveryText}>Sign in to see your dashboard</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: APP_BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logo:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoText:  { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: 1.5 },

  // Active order card (USER)
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: CARD_BG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLeft:     { flex: 1, paddingRight: 12 },
  cardTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTrackNum: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardLocation: { fontSize: 13, fontWeight: '500', color: '#fff' },
  cardPrice:    { fontSize: 15, fontWeight: '700', color: '#A3D9C0', marginTop: 10 },
  mapThumb:     { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  mapImage:     { width: '100%', height: '100%' },

  badge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  emptyCard:    { backgroundColor: CARD_BG, borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 14 },
  emptyCardText:{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 10 },
  emptyCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  newDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newDeliveryText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  shipmentCard: {
    backgroundColor: MINT_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  shipmentRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  shipmentRowBorder:  { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  shipmentId:         { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  shipmentStatus:     { fontSize: 13, fontWeight: '600' },
  seeAllBtn:          { alignItems: 'center', paddingVertical: 14 },
  seeAllText:         { fontSize: 14, color: PRIMARY, fontWeight: '600' },

  // Driver stats
  statsRow:   { flexDirection: 'row', marginBottom: 12 },
  statCard:   { flex: 1, backgroundColor: CARD_BG, borderRadius: 16, padding: 18, alignItems: 'flex-start' },
  statValue:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  statusRow:       { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statusPill:      { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statusDot:       { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  statusPillCount: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  statusPillLabel: { fontSize: 11, color: '#888', fontWeight: '500', textAlign: 'center' },

  // Active delivery card (DRIVER)
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  deliveryRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  deliveryLabel:    { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  deliveryAddr:     { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  deliveryFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  deliveryRecipient:{ fontSize: 13, color: '#555', flex: 1 },
  deliveryPrice:    { fontSize: 15, fontWeight: '700', color: PRIMARY },

  noDeliveryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  noDeliveryText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 12 },
  noDeliverySub:  { fontSize: 13, color: '#AAA', marginTop: 4 },
});
