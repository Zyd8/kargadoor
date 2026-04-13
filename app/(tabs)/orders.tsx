import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import ActiveDeliveryModal from '@/components/ActiveDeliveryModal';
import { useAuth } from '@/contexts/auth-context';
import { CARTO_LIGHT_TILE_URL } from '@/lib/map-tiles';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#f0a92d';
const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

type Package = {
  ID: string;
  SENDER_ID?: string | null;
  DRIVER_ID?: string | null;
  PICKUP_ADDRESS: string | null;
  PICKUP_LAT: number | null;
  PICKUP_LNG: number | null;
  RECIPIENT_ADDRESS: string | null;
  DROPOFF_LAT: number | null;
  DROPOFF_LNG: number | null;
  RECIPIENT_NAME: string | null;
  RECIPIENT_NUMBER: string | null;
  ORDER_CONTACT: string | null;
  VEHICLE_TYPE: string | null;
  PAYMENT_METHOD: string | null;
  ITEM_TYPES: string | null;
  NOTES: string | null;
  STATUS: string | null;
  PRICE: number | null;
  CREATED_AT: string | null;
  ACCEPTED_AT: string | null;
  COMPLETED_AT: string | null;
  PICKUP_CONFIRMED_AT: string | null;
  PICKUP_POD: string | null;
  DRIVER_AVATAR_URL: string | null;
  DRIVER_NAME: string | null;
  TRACKING_TOKEN: string | null;
};

type DriverProfile = {
  FULL_NAME: string | null;
  AVATAR_URL: string | null;
  PHONE_NUMBER: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:     '#F59E0B',
  IN_PROGRESS: PRIMARY,
  COMPLETE:    '#6B7280',
  CANCELLED:   '#EF4444',
};

const VEHICLE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  motorcycle: 'two-wheeler',
  car:        'directions-car',
  truck:      'local-shipping',
};

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? 'PENDING';
  const color = STATUS_COLOR[label] ?? '#888';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label.replace('_', ' ')}</Text>
    </View>
  );
}

function routeThumbnailHTML(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): string {
  const centerLat = (pickupLat + dropoffLat) / 2;
  const centerLng = (pickupLng + dropoffLng) / 2;
  const K = TOMTOM_KEY;
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script></head>
<body style="margin:0"><div id="m" style="width:100%;height:100%;min-height:72px;"></div>
<script>
var map = L.map('m',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLng}], 12);
L.tileLayer('${CARTO_LIGHT_TILE_URL}',{maxZoom:19}).addTo(map);
L.circleMarker([${pickupLat},${pickupLng}],{radius:6,fillColor:'#f0a92d',color:'#fff',weight:2,fillOpacity:1}).addTo(map);
L.circleMarker([${dropoffLat},${dropoffLng}],{radius:6,fillColor:'#F59E0B',color:'#fff',weight:2,fillOpacity:1}).addTo(map);
var line = L.polyline([[${pickupLat},${pickupLng}],[${dropoffLat},${dropoffLng}]],{color:'#f0a92d',weight:3,opacity:0.7}).addTo(map);
map.fitBounds(line.getBounds(),{padding:[8,8]});
</script></body></html>`;
}

function RouteThumbnail({ pickupLat, pickupLng, dropoffLat, dropoffLng }: {
  pickupLat: number; pickupLng: number; dropoffLat: number; dropoffLng: number;
}) {
  const html = routeThumbnailHTML(pickupLat, pickupLng, dropoffLat, dropoffLng);
  return (
    <View style={styles.thumbnailWrap}>
      <WebView
        source={{ html }}
        style={styles.thumbnailMap}
        scrollEnabled={false}
        pointerEvents="none"
        originWhitelist={['*']}
      />
    </View>
  );
}

function OrderCard({
  item,
  isDriver,
  onPress,
}: {
  item: Package;
  isDriver: boolean;
  onPress: (pkg: Package) => void;
}) {
  const vehicleIcon = VEHICLE_ICON[item.VEHICLE_TYPE ?? ''] ?? 'local-shipping';
  const pickup  = item.PICKUP_ADDRESS   ?? '—';
  const dropoff = item.RECIPIENT_ADDRESS ?? '—';
  const hasRoute = item.PICKUP_LAT != null && item.PICKUP_LNG != null && item.DROPOFF_LAT != null && item.DROPOFF_LNG != null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      {hasRoute && (
        <RouteThumbnail
          pickupLat={item.PICKUP_LAT!}
          pickupLng={item.PICKUP_LNG!}
          dropoffLat={item.DROPOFF_LAT!}
          dropoffLng={item.DROPOFF_LNG!}
        />
      )}
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

      <View style={styles.cardFooter}>
        {item.RECIPIENT_NAME ? (
          <Text style={styles.cardSub}>
            To: {item.RECIPIENT_NAME}
            {item.VEHICLE_TYPE ? `  ·  ${item.VEHICLE_TYPE.charAt(0).toUpperCase() + item.VEHICLE_TYPE.slice(1)}` : ''}
          </Text>
        ) : null}
        {item.PRICE ? (
          <Text style={styles.cardPrice}>
            ₱{Number(item.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
        ) : null}
      </View>

    </TouchableOpacity>
  );
}

function OrderDetailModal({
  item,
  isDriver,
  onClose,
  onCancel,
  isCancelling,
}: {
  item: Package;
  isDriver: boolean;
  onClose: () => void;
  onCancel: (pkg: Package) => void;
  isCancelling: boolean;
}) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    setDriverProfile(null);

    const driverId = item.DRIVER_ID ?? null;
    const shouldFetch =
      !isDriver &&
      (item.STATUS === 'IN_PROGRESS' || item.STATUS === 'COMPLETE') &&
      driverId &&
      (!item.DRIVER_NAME || !item.DRIVER_AVATAR_URL);

    if (!shouldFetch) return () => { mounted = false; };

    (async () => {
      const { data, error } = await supabase
        .from('PROFILE')
        .select('FULL_NAME, AVATAR_URL, PHONE_NUMBER')
        .eq('ID', driverId)
        .maybeSingle();

      if (!mounted) return;
      if (error || !data) return;
      setDriverProfile(data as DriverProfile);
    })();

    return () => { mounted = false; };
  }, [isDriver, item.DRIVER_AVATAR_URL, item.DRIVER_ID, item.DRIVER_NAME, item.STATUS]);

  const driverName = item.DRIVER_NAME ?? driverProfile?.FULL_NAME ?? null;
  const driverAvatarUrl = item.DRIVER_AVATAR_URL ?? driverProfile?.AVATAR_URL ?? null;

  const vehicleLabel = (item.VEHICLE_TYPE ?? '—').charAt(0).toUpperCase() + (item.VEHICLE_TYPE ?? '').slice(1);
  const paymentLabel = (item.PAYMENT_METHOD ?? '—').charAt(0).toUpperCase() + (item.PAYMENT_METHOD ?? '').slice(1);

  const formatDate = (s: string | null) => {
    if (!s) return '—';
    try {
      const d = new Date(s);
      return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return s; }
  };

  // Generate tracking URL using mock format
  const APP_SCHEME = Constants.expoConfig?.scheme ?? 'frontend';
  const trackingUrl = `${APP_SCHEME}://track/${item.TRACKING_TOKEN}`;

  // Your deployed tracking website URL
  const TRACKING_WEBSITE_URL = 'https://kargadoorshare.vercel.app';

  const handleShareTrackingLink = async () => {
    // Full tracking URL for web sharing
    const shareUrl = `${TRACKING_WEBSITE_URL}/track/${item.TRACKING_TOKEN}`;
    
    try {
      // Use React Native's built-in Share
      await Share.share({
        title: 'Track Your Order',
        message: `Track your delivery here: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      // Fallback to opening URL
      try {
        await Linking.openURL(shareUrl);
      } catch {
        await Linking.openURL(trackingUrl);
      }
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.modalClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {!isDriver && (item.STATUS === 'IN_PROGRESS' || item.STATUS === 'COMPLETE') && (
              <View style={styles.driverRow}>
                {driverAvatarUrl ? (
                  <Image source={{ uri: driverAvatarUrl }} style={styles.driverAvatar} />
                ) : (
                  <View style={styles.driverAvatarFallback}>
                    <MaterialIcons name="local-shipping" size={22} color={PRIMARY} />
                  </View>
                )}
                <View>
                  <Text style={styles.driverLabel}>Your Driver</Text>
                  <Text style={styles.driverName}>{driverName ?? 'Driver'}</Text>
                </View>
              </View>
            )}
            <DetailRow label="Status" value={(item.STATUS ?? '—').replace('_', ' ')} />
            <DetailRow label="Pick-up" value={item.PICKUP_ADDRESS ?? '—'} />
            <DetailRow label="Drop-off" value={item.RECIPIENT_ADDRESS ?? '—'} />
            <DetailRow label="Recipient" value={item.RECIPIENT_NAME ?? '—'} />
            <DetailRow label="Contact" value={item.ORDER_CONTACT ?? item.RECIPIENT_NUMBER ?? '—'} />
            <DetailRow label="Vehicle" value={vehicleLabel} />
            <DetailRow label="Payment" value={paymentLabel} />
            <DetailRow label="Items" value={item.ITEM_TYPES ?? '—'} />
            {item.NOTES ? <DetailRow label="Notes" value={item.NOTES} /> : null}
            <DetailRow label="Price" value={item.PRICE != null ? `₱${Number(item.PRICE).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'} />
            <DetailRow label="Created" value={formatDate(item.CREATED_AT)} />
            {item.ACCEPTED_AT ? <DetailRow label="Accepted" value={formatDate(item.ACCEPTED_AT)} /> : null}
            {item.COMPLETED_AT ? <DetailRow label="Completed" value={formatDate(item.COMPLETED_AT)} /> : null}

            {/* Tracking Link Section - Only show for IN_PROGRESS orders */}
            {(item.TRACKING_TOKEN && item.STATUS === 'IN_PROGRESS') && (
              <View style={styles.trackingLinkSection}>
                <Text style={styles.trackingLinkLabel}>Tracking Token</Text>
                <Text style={styles.trackingLinkSubtext}>
                  Share this token with the recipient to track their order
                </Text>
                <TouchableOpacity
                  style={styles.shareTrackingBtn}
                  onPress={handleShareTrackingLink}
                >
                  <MaterialIcons name="share" size={18} color={PRIMARY} />
                  <Text style={styles.shareTrackingBtnText}>Open Tracking</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isDriver && item.STATUS === 'PENDING' && (
              <TouchableOpacity
                style={[styles.cancelOrderBtn, isCancelling && { opacity: 0.6 }]}
                onPress={() => onCancel(item)}
                disabled={isCancelling}
              >
                {isCancelling
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
                }
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>{value}</Text>
    </View>
  );
}

export default function OrdersScreen() {
  const { user, userRole } = useAuth();
  const isDriver = (userRole ?? 'USER').toUpperCase() === 'DRIVER';
  const [orders, setOrders]         = useState<Package[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder]   = useState<Package | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Package | null>(null);
  const [cancellingId, setCancellingId]     = useState<string | null>(null);

  const handleCardPress = useCallback((pkg: Package) => {
    if (isDriver && pkg.STATUS === 'IN_PROGRESS') {
      setActiveDelivery(pkg);
    } else {
      setSelectedOrder(pkg);
    }
  }, [isDriver]);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); setRefreshing(false); return; }
    
    // For drivers, use the RPC
    if (isDriver) {
      const { data, error: fetchErr } = await supabase.rpc('get_my_orders', {
        p_user_id: user.id,
        p_is_driver: isDriver,
      });
      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError(null);
      const list = Array.isArray(data) ? (data as Package[]) : [];
      setOrders(list);
    } else {
      // For regular users: select all + join driver profile so we can show driver avatar and name
      const { data, error: fetchErr } = await supabase
        .from('PACKAGES')
        .select('*, driver:DRIVER_ID(ID, FULL_NAME, AVATAR_URL)')
        .eq('SENDER_ID', user.id)
        .order('CREATED_AT', { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError(null);
      type Row = Package & { driver?: { FULL_NAME?: string; AVATAR_URL?: string } | null };
      const list = (Array.isArray(data) ? data : []).map((row: Row) => ({
        ...row,
        DRIVER_NAME: row.driver?.FULL_NAME ?? (row as Package).DRIVER_NAME ?? null,
        DRIVER_AVATAR_URL: row.driver?.AVATAR_URL ?? (row as Package).DRIVER_AVATAR_URL ?? null,
      })) as Package[];
      setOrders(list);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id, isDriver]);

  const handleCancelOrder = useCallback((pkg: Package) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(pkg.ID);
            const { data: result, error: rpcErr } = await supabase.rpc('cancel_order', {
              p_package_id: pkg.ID,
            });
            setCancellingId(null);
            if (rpcErr || !result?.ok) {
              Alert.alert('Error', rpcErr?.message ?? result?.error ?? 'Could not cancel order.');
              return;
            }
            setSelectedOrder(null);
            fetchOrders();
          },
        },
      ]
    );
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();

      // Real-time updates for USER — keeps order status in sync without manual refresh
      if (!isDriver && user) {
        const channel = supabase
          .channel(`orders-user-${user.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'PACKAGES' }, () => {
            fetchOrders();
          })
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      }
    }, [fetchOrders, isDriver, user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{isDriver ? 'My Deliveries' : 'Orders'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="wifi-off" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>Could not load orders</Text>
          <TouchableOpacity onPress={() => { setLoading(true); fetchOrders(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.ID}
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              isDriver={isDriver}
              onPress={handleCardPress}
            />
          )}
          contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="local-shipping" size={52} color="#E8DCC8" />
              <Text style={styles.emptyTitle}>
                {isDriver ? 'No deliveries yet' : 'No orders yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isDriver
                  ? 'Accept orders from the Find Orders map.'
                  : 'Tap the + button to create your first delivery.'}
              </Text>
            </View>
          }
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          item={selectedOrder}
          isDriver={isDriver}
          onClose={() => setSelectedOrder(null)}
          onCancel={handleCancelOrder}
          isCancelling={cancellingId === selectedOrder.ID}
        />
      )}

      {activeDelivery && (
        <ActiveDeliveryModal
          visible={!!activeDelivery}
          pkg={activeDelivery}
          onClose={() => setActiveDelivery(null)}
          onDelivered={() => { setActiveDelivery(null); fetchOrders(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F6F2' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EDE6DC', backgroundColor: '#fff' },
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
    overflow: 'hidden',
  },
  thumbnailWrap:  { height: 72, width: '100%', marginBottom: 10, backgroundColor: '#F0EDE6', borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' },
  thumbnailMap:   { flex: 1, height: 72 },
  cardTop:      { flexDirection: 'row', alignItems: 'center' },
  vehicleCircle:{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#FEF5E6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardMid:      { flex: 1, marginRight: 8 },
  cardRoute:    { fontSize: 13, color: '#333', fontWeight: '500' },
  cardArrow:    { fontSize: 11, color: '#C0C8C0', marginVertical: 1 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginLeft: 52 },
  cardSub:      { fontSize: 12, color: '#999', flex: 1 },
  cardPrice:    { fontSize: 13, fontWeight: '700', color: PRIMARY },

  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  deliverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 11,
  },
  deliverBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyTitle:   { fontSize: 17, fontWeight: '600', color: '#444', marginTop: 14, marginBottom: 6 },
  emptySubtitle:{ fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 40 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  modalTitle:      { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  modalClose:      { padding: 4 },
  modalScroll:     { maxHeight: 500 },
  modalScrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 },
  detailRow:       { marginBottom: 14 },
  detailLabel:     { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailValue:     { fontSize: 15, color: '#1A1A1A', lineHeight: 22 },
  modalDeliverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, marginHorizontal: 20, marginBottom: 24, paddingVertical: 14, borderRadius: 12 },
  modalDeliverBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  cancelOrderBtn: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  cancelOrderBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  retryText: { color: PRIMARY, fontWeight: '600', marginTop: 12, fontSize: 15 },

  driverRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF5E6', borderRadius: 12, padding: 12, marginBottom: 16 },
  driverAvatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8DCC8' },
  driverAvatarFallback:{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8F6F2', alignItems: 'center', justifyContent: 'center' },
  driverLabel:         { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName:          { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },

  // Tracking link section
  trackingLinkSection: { backgroundColor: '#FEF5E6', borderRadius: 12, padding: 16, marginTop: 16 },
  trackingLinkLabel:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  trackingLinkSubtext: { fontSize: 12, color: '#666', marginBottom: 12 },
  shareTrackingBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: PRIMARY },
  shareTrackingBtnText:{ fontSize: 14, fontWeight: '600', color: PRIMARY },
});
