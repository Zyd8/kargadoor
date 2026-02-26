/**
 * Find Orders — DRIVER only
 * Shows a Leaflet map centred on the driver's location.
 * Pending orders within the selected radius appear as amber pins.
 * Driver can tap a pin to see details and accept the order.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const TOMTOM_KEY  = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;
const PRIMARY     = '#1B6B4A';

const RADIUS_OPTIONS = [2, 5, 10, 20, 9999] as const;
const RADIUS_LABELS: Record<number, string> = { 2: '2 km', 5: '5 km', 10: '10 km', 20: '20 km', 9999: 'Any' };

const VEHICLE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  motorcycle: 'two-wheeler',
  car:        'directions-car',
  truck:      'local-shipping',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type VehicleRow = {
  ID: string;
  DRIVER_ID: string;
  PLATE: string | null;
  MODEL: string | null;
  TYPE: string | null;
  IS_ACTIVE: boolean;
};

type PendingOrder = {
  ID: string;
  PICKUP_ADDRESS: string | null;
  RECIPIENT_ADDRESS: string | null;
  PICKUP_LAT: number;
  PICKUP_LNG: number;
  VEHICLE_TYPE: string | null;
  ITEM_TYPES: string | null;
  RECIPIENT_NAME: string | null;
  ORDER_CONTACT: string | null;
  PAYMENT_METHOD: string | null;
  SENDER_AVATAR_URL?: string | null;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildMapHTML(
  apiKey: string,
  driverLat: number,
  driverLng: number,
  orders: PendingOrder[],
  radiusKm: number,
): string {
  const ordersJson = JSON.stringify(orders).replace(/<\//g, '<\\/');
  const circleRadiusM = radiusKm < 9999 ? radiusKm * 1000 : 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%}
    #map{width:100%;height:100%}
    .order-popup{font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-width:220px}
    .order-popup h3{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:8px}
    .order-popup p{font-size:12px;color:#555;margin-bottom:4px;line-height:1.4}
    .order-popup .lbl{font-weight:600;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
    .accept-btn{display:block;width:100%;margin-top:10px;padding:10px;background:#1B6B4A;color:#fff;
      border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-align:center}
    .accept-btn:active{opacity:0.8}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var K = '${apiKey}';
  var orders = ${ordersJson};
  var markers = {};

  var map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([${driverLat},${driverLng}], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key='+K+'&tileSize=256',
    {maxZoom:22,errorTileUrl:''}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);

  // ── Radius circle ─────────────────────────────────────────────────────────
  var radiusCircle = ${circleRadiusM > 0
    ? `L.circle([${driverLat},${driverLng}],{radius:${circleRadiusM},color:'${PRIMARY}',fillColor:'${PRIMARY}',fillOpacity:0.06,weight:1.5,dashArray:'6,4'}).addTo(map)`
    : 'null'
  };

  window.updateRadius = function(km) {
    if(radiusCircle) {
      if(km >= 9999) { radiusCircle.setRadius(0); }
      else { radiusCircle.setRadius(km * 1000); }
    } else if(km < 9999) {
      radiusCircle = L.circle(driverMarker.getLatLng(),{radius:km*1000,color:'${PRIMARY}',fillColor:'${PRIMARY}',fillOpacity:0.06,weight:1.5,dashArray:'6,4'}).addTo(map);
    }
  };

  // ── Driver arrow: rotate only the inner div so we don't overwrite Leaflet's position transform
  var arrowHTML = '<div class="driver-arrow-outer">'
    + '<div class="driver-arrow-inner" style="width:36px;height:36px;transition:transform 0.25s linear">'
    + '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">'
    + '<circle cx="18" cy="18" r="17" fill="#1B6B4A" fill-opacity="0.2"/>'
    + '<polygon points="18,4 28,30 18,24 8,30" fill="#1B6B4A" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
    + '</svg></div></div>';

  var driverMarker = L.marker([${driverLat},${driverLng}], {
    icon: L.divIcon({className:'driver-marker-icon',html:arrowHTML,iconSize:[36,36],iconAnchor:[18,18]}),
    zIndexOffset: 9999
  }).addTo(map);

  var arrowEl = null;
  map.whenReady(function(){ arrowEl = document.querySelector('.driver-arrow-inner'); });

  // Global handler for avatar load errors (avoids fragile inline quote escaping)
  window.orderAvatarError = function(img) {
    img.style.display = 'none';
    var next = img.nextElementSibling;
    if (next) next.style.display = 'flex';
  };

  // ── Order marker: circle with avatar or fallback person icon ─────────────────
  function orderIcon(id, avatarUrl) {
    var url = (avatarUrl || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    var showFallback = !url;
    var imgHtml = url ? '<img src="'+url+'" class="order-avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="orderAvatarError(this)"/>' : '';
    var fallbackHtml = '<div class="order-avatar-fallback" style="display:'+(showFallback?'flex':'none')+';width:100%;height:100%;border-radius:50%;background:#E5E7EB;align-items:center;justify-content:center">'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="#9CA3AF"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    var html = '<div id="pin-'+id+'" style="display:flex;flex-direction:column;align-items:center">'
      +'<div style="width:40px;height:40px;border-radius:50%;border:3px solid #F59E0B;overflow:hidden;background:#fff;box-sizing:border-box">'
      +imgHtml+fallbackHtml
      +'</div>'
      +'<div style="margin-top:2px;background:#F59E0B;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">PENDING</div>'
      +'</div>';
    return L.divIcon({
      className:'',
      html: html,
      iconSize:[40,54], iconAnchor:[20,54]
    });
  }

  // ── Render order pins (normalize keys for RPC/json) ────────────────────────
  function renderOrders(list) {
    Object.values(markers).forEach(function(m){ map.removeLayer(m); });
    markers = {};
    if (!Array.isArray(list)) return;

    list.forEach(function(o) {
      var lat = o.PICKUP_LAT != null ? o.PICKUP_LAT : (o.pickup_lat);
      var lng = o.PICKUP_LNG != null ? o.PICKUP_LNG : (o.pickup_lng);
      if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return;
      var id = o.ID != null ? o.ID : o.id;
      var avatarUrl = (o.SENDER_AVATAR_URL != null ? o.SENDER_AVATAR_URL : (o.sender_avatar_url || '')) || '';
      var m = L.marker([lat, lng], {icon: orderIcon(id, avatarUrl)}).addTo(map);

      var pickup  = (o.PICKUP_ADDRESS || o.pickup_address) || 'Unknown pickup';
      var dropoff = (o.RECIPIENT_ADDRESS || o.recipient_address) || 'Unknown dropoff';
      var vType   = o.VEHICLE_TYPE || o.vehicle_type;
      var vehicle = vType ? (String(vType).charAt(0).toUpperCase()+String(vType).slice(1)) : '\u2014';
      var items   = (o.ITEM_TYPES != null ? o.ITEM_TYPES : o.item_types) || '\u2014';
      var contact = (o.ORDER_CONTACT != null ? o.ORDER_CONTACT : o.order_contact) || '\u2014';
      var pMeth   = o.PAYMENT_METHOD || o.payment_method;
      var payment = pMeth ? (String(pMeth).charAt(0).toUpperCase()+String(pMeth).slice(1)) : '\u2014';
      var name    = (o.RECIPIENT_NAME != null ? o.RECIPIENT_NAME : o.recipient_name) || '\u2014';

      var popupHtml = '<div class="order-popup">'
        + '<h3>Delivery Order</h3>'
        + '<p class="lbl">Pick Up</p><p>'+pickup+'</p>'
        + '<p class="lbl" style="margin-top:6px">Drop Off</p><p>'+dropoff+'</p>'
        + '<p class="lbl" style="margin-top:6px">Recipient</p><p>'+name+'</p>'
        + '<p class="lbl" style="margin-top:6px">Vehicle</p><p>'+vehicle+'</p>'
        + '<p class="lbl" style="margin-top:6px">Items</p><p>'+items+'</p>'
        + '<p class="lbl" style="margin-top:6px">Contact</p><p>'+contact+'</p>'
        + '<p class="lbl" style="margin-top:6px">Payment</p><p>'+payment+'</p>'
        + '<button class="accept-btn" onclick="acceptOrder(\\''+o.ID+'\\')">Accept Order</button>'
        + '</div>';

      m.bindPopup(popupHtml, {maxWidth:260, minWidth:220});
      markers[id] = m;
    });
  }

  renderOrders(orders);

  // ── Accept order ──────────────────────────────────────────────────────────
  window.acceptOrder = function(id) {
    window.ReactNativeWebView.postMessage(JSON.stringify({action:'accept',id:id}));
  };

  window.removeOrderPin = function(id) {
    if(markers[id]){ map.removeLayer(markers[id]); delete markers[id]; }
  };

  window.updatePosition = function(lat,lng) {
    driverMarker.setLatLng([lat,lng]);
    if(radiusCircle) radiusCircle.setLatLng([lat,lng]);
  };

  window.updateHeading = function(deg) {
    if(arrowEl) arrowEl.style.transform = 'rotate('+deg+'deg)';
  };

  window.reloadOrders = function(json) {
    renderOrders(JSON.parse(json));
  };
</script>
</body>
</html>`;
}

export default function FindOrdersScreen() {
  const { user } = useAuth();
  const webRef  = useRef<WebView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeVehicleRef = useRef<VehicleRow | null>(null);

  const [coords, setCoords]                 = useState<{ lat: number; lng: number } | null>(null);
  const [allOrders, setAllOrders]           = useState<PendingOrder[]>([]);
  const [loading, setLoading]               = useState(true);
  const [accepting, setAccepting]           = useState(false);
  const [radiusKm, setRadiusKm]             = useState<number>(10);
  const [locationDenied, setLocationDenied] = useState(false);
  const [vehicleGate, setVehicleGate]       = useState(false);
  const [activeVehicle, setActiveVehicle]   = useState<VehicleRow | null>(null);

  const getVisible = useCallback(
    (orders: PendingOrder[], c: { lat: number; lng: number } | null, r: number) =>
      c
        ? orders.filter((o) => r >= 9999 || haversineKm(c.lat, c.lng, o.PICKUP_LAT, o.PICKUP_LNG) <= r)
        : orders,
    []
  );

  const visibleOrders = getVisible(allOrders, coords, radiusKm);

  // When radius changes, update map pins + circle
  useEffect(() => {
    if (!coords) return;
    const visible = getVisible(allOrders, coords, radiusKm);
    webRef.current?.injectJavaScript(
      `typeof reloadOrders!=='undefined'&&reloadOrders(${JSON.stringify(JSON.stringify(visible))});true`
    );
    webRef.current?.injectJavaScript(
      `typeof updateRadius!=='undefined'&&updateRadius(${radiusKm});true`
    );
  }, [radiusKm, allOrders, coords]);

  const fetchOrders = useCallback(async (vehicleType: string | null = null) => {
    const driverId = user?.id ?? null;
    const { data } = await supabase.rpc('get_pending_orders', {
      p_driver_id: driverId,
      p_vehicle_type: vehicleType,
    });
    const list = (Array.isArray(data) ? data : []) as PendingOrder[];
    setAllOrders(list);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setVehicleGate(false);
      setActiveVehicle(null);
      activeVehicleRef.current = null;

      let posSub: Location.LocationSubscription | null = null;
      let headSub: Location.LocationSubscription | null = null;

      (async () => {
        const driverId = user?.id;
        if (!driverId) { setLoading(false); return; }

        // ── 1. Check for active vehicle ────────────────────────────────────
        const { data: vehicleData } = await supabase.rpc('get_vehicles', { p_driver_id: driverId });
        const vehicleList = (Array.isArray(vehicleData) ? vehicleData : []) as VehicleRow[];
        let active = vehicleList.find((v) => v.IS_ACTIVE) ?? null;

        if (!active && vehicleList.length > 0) {
          await supabase.rpc('set_active_vehicle', {
            p_vehicle_id: vehicleList[0].ID,
            p_driver_id: driverId,
          });
          active = { ...vehicleList[0], IS_ACTIVE: true };
        }

        if (!active) {
          setVehicleGate(true);
          setLoading(false);
          return;
        }
        setActiveVehicle(active);
        activeVehicleRef.current = active;

        // ── 2. Get location ────────────────────────────────────────────────
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationDenied(status !== 'granted');
        const pos = status === 'granted'
          ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          : null;
        const c = pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude }
          : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
        setCoords(c);

        // ── 3. Fetch orders for this vehicle type ──────────────────────────
        await fetchOrders(active.TYPE ?? null);
        setLoading(false);

        if (status === 'granted') {
          posSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
            (loc) => {
              webRef.current?.injectJavaScript(
                `typeof updatePosition!=='undefined'&&updatePosition(${loc.coords.latitude},${loc.coords.longitude});true`
              );
            }
          );
          headSub = await Location.watchHeadingAsync((h) => {
            const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
            webRef.current?.injectJavaScript(
              `typeof updateHeading!=='undefined'&&updateHeading(${deg});true`
            );
          });
        }
      })();

      pollRef.current = setInterval(
        () => fetchOrders(activeVehicleRef.current?.TYPE ?? null),
        30_000
      );

      return () => {
        posSub?.remove();
        headSub?.remove();
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchOrders, user?.id])
  );

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { action: string; id: string };
      if (msg.action !== 'accept' || !msg.id) return;
      if (accepting) return;
      setAccepting(true);

      const { data: result, error } = await supabase
        .rpc('accept_order', { p_package_id: msg.id });

      setAccepting(false);

      if (error || !result?.ok) {
        Alert.alert('Could not accept', error?.message ?? result?.error ?? 'Order already taken.');
        return;
      }

      // Remove pin immediately
      webRef.current?.injectJavaScript(
        `typeof removeOrderPin!=='undefined'&&removeOrderPin('${msg.id}');true`
      );
      setAllOrders((prev) => prev.filter((o) => o.ID !== msg.id));

      // Notify sender (best-effort)
      supabase.functions.invoke('send-notification', {
        body: {
          to_package_id: msg.id,
          title: 'Order Accepted!',
          body: 'A driver is heading to pick up your package.',
        },
      }).catch((e: unknown) => console.warn('[send-notification]', e));

      Alert.alert('Order accepted!', 'Head to the pickup location. Check your Orders tab.');
    } catch { /* ignore parse errors */ }
  }, [accepting, user]);

  if (loading || (!vehicleGate && !coords)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  if (vehicleGate) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Orders</Text>
        </View>
        <View style={styles.gateContainer}>
          <MaterialIcons name="directions-car" size={64} color="#C8D8D0" />
          <Text style={styles.gateTitle}>No active vehicle</Text>
          <Text style={styles.gateSub}>
            Add and select a vehicle in your profile before finding orders.
          </Text>
          <TouchableOpacity
            style={styles.gateBtn}
            onPress={() => router.navigate('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.gateBtnText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vehicleIconName = activeVehicle?.TYPE
    ? (VEHICLE_ICON[activeVehicle.TYPE.toLowerCase()] ?? 'directions-car')
    : 'directions-car';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Find Orders</Text>
          {activeVehicle?.TYPE && (
            <View style={styles.vehicleBadge}>
              <MaterialIcons name={vehicleIconName} size={13} color={PRIMARY} />
              <Text style={styles.vehicleBadgeText}>{capitalize(activeVehicle.TYPE)}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {accepting && <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 10 }} />}
          <TouchableOpacity
            onPress={() => fetchOrders(activeVehicle?.TYPE ?? null)}
            style={styles.refreshBtn}
            hitSlop={8}
          >
            <Text style={styles.refreshText}>{visibleOrders.length} pending</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Radius pills */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>Radius:</Text>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusPill, radiusKm === r && styles.radiusPillActive]}
            onPress={() => setRadiusKm(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.radiusPillText, radiusKm === r && styles.radiusPillTextActive]}>
              {RADIUS_LABELS[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {locationDenied && (
        <View style={styles.locationBanner}>
          <MaterialIcons name="location-off" size={16} color="#92400E" />
          <Text style={styles.locationBannerText}>
            Location unavailable — showing default area (Manila)
          </Text>
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ html: buildMapHTML(TOMTOM_KEY, coords!.lat, coords!.lng, visibleOrders, radiusKm) }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={handleMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:            { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  vehicleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY + '14', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  vehicleBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn:  { backgroundColor: '#EEF2EE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  refreshText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  radiusRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#EFEFEF', gap: 6 },
  radiusLabel:         { fontSize: 12, color: '#888', marginRight: 2 },
  radiusPill:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: 'transparent' },
  radiusPillActive:    { backgroundColor: PRIMARY + '18', borderColor: PRIMARY },
  radiusPillText:      { fontSize: 12, color: '#666', fontWeight: '500' },
  radiusPillTextActive:{ color: PRIMARY, fontWeight: '700' },

  map: { flex: 1 },

  locationBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  locationBannerText: { fontSize: 12, color: '#92400E', fontWeight: '500', flex: 1 },

  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  gateTitle:     { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  gateSub:       { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  gateBtn:       { marginTop: 8, backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  gateBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
});
