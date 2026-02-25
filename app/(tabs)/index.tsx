import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

const PRIMARY  = '#1B6B4A';
const CARD_BG  = '#1A5A3A';
const MINT_BG  = '#B0D4C4';
const APP_BG   = '#EEF2EE';

// Placeholder data — will be replaced with Supabase PACKAGES query
const CURRENT_TRACKING = { id: '#546264', location: 'Caloocan, Ph' };
const RECENT_SHIPMENTS = [
  { id: '#546264', status: 'In Progress', active: true },
  { id: '#675423', status: 'Complete',    active: false },
];

// TomTom static map centred on Caloocan (placeholder — will use active delivery coords)
const STATIC_MAP_URL =
  `https://api.tomtom.com/map/1/staticimage` +
  `?key=${TOMTOM_KEY}&zoom=12&center=120.9667,14.6507` +
  `&width=220&height=140&format=png&layer=basic&style=main`;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.logo}>
            <MaterialIcons name="local-shipping" size={22} color={PRIMARY} />
            <Text style={styles.logoText}>KARGADOOR</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <MaterialIcons name="notifications-none" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* ── Current Tracking Card ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardLabel}>Current Tracking</Text>
            <Text style={styles.cardTrackNum}>{CURRENT_TRACKING.id}</Text>
            <Text style={styles.cardLabel}>Current Location</Text>
            <Text style={styles.cardLocation}>{CURRENT_TRACKING.location}</Text>
          </View>

          <View style={styles.mapThumb}>
            <Image
              source={{ uri: STATIC_MAP_URL }}
              style={styles.mapImage}
              contentFit="cover"
            />
          </View>
        </View>

        {/* ── Recent Shipping ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent Shipping</Text>
        <View style={styles.shipmentCard}>
          {RECENT_SHIPMENTS.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.shipmentRow,
                idx < RECENT_SHIPMENTS.length - 1 && styles.shipmentRowBorder,
              ]}
            >
              <Text style={styles.shipmentId}>{item.id}</Text>
              <Text style={[styles.shipmentStatus, item.active && styles.shipmentStatusActive]}>
                {item.status}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: APP_BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoText: {
    fontSize: 17, fontWeight: '800',
    color: '#1A1A1A', letterSpacing: 1.5,
  },

  // Tracking card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    shadowColor: CARD_BG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLeft:     { flex: 1, paddingRight: 12 },
  cardLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 3 },
  cardTrackNum: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 14 },
  cardLocation: { fontSize: 15, fontWeight: '600', color: '#fff' },
  mapThumb: {
    width: 110, height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  mapImage: { width: '100%', height: '100%' },

  // Recent Shipping
  sectionTitle: {
    fontSize: 17, fontWeight: '700',
    color: '#1A1A1A', marginBottom: 12,
  },
  shipmentCard: {
    backgroundColor: MINT_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  shipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  shipmentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  shipmentId: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  shipmentStatus: { fontSize: 14, fontWeight: '500', color: '#555' },
  shipmentStatusActive: { color: PRIMARY, fontWeight: '600' },

  seeAllBtn: { alignItems: 'center', paddingVertical: 14 },
  seeAllText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
});
