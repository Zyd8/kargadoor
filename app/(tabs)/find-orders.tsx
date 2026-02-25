/**
 * Find Orders — DRIVER only
 * Shows a Leaflet map centred on the driver's location.
 * Pending orders with coordinates appear as amber pins.
 * Driver can tap a pin to see details and accept the order.
 */
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
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

const TOMTOM_KEY   = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const DEFAULT_LAT  = 14.5995;
const DEFAULT_LNG  = 120.9842;

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
};

function buildMapHTML(apiKey: string, driverLat: number, driverLng: number, orders: PendingOrder[]): string {
  // Serialise orders safely for injection into JS
  const ordersJson = JSON.stringify(orders).replace(/<\//g, '<\\/');

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

  // ── Driver arrow marker ──────────────────────────────────────────────────────
  var arrowHTML = '<div style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear">'
    + '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">'
    + '<circle cx="18" cy="18" r="17" fill="#1B6B4A" fill-opacity="0.2"/>'
    + '<polygon points="18,4 28,30 18,24 8,30" fill="#1B6B4A" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
    + '</svg></div>';

  var driverMarker = L.marker([${driverLat},${driverLng}], {
    icon: L.divIcon({className:'',html:arrowHTML,iconSize:[36,36],iconAnchor:[18,18]}),
    zIndexOffset: 1000
  }).addTo(map);

  var arrowEl = null;
  map.whenReady(function(){ arrowEl = document.querySelector('#map .leaflet-marker-pane div'); });

  // ── Order pin icon (amber) ───────────────────────────────────────────────────
  function orderIcon(id) {
    return L.divIcon({
      className:'',
      html:'<div id="pin-'+id+'" style="position:relative;width:34px;height:42px">'
        +'<svg viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">'
        +'<path d="M17 0C10.37 0 5 5.37 5 12c0 9 12 30 12 30S29 21 29 12C29 5.37 23.63 0 17 0z" fill="#F59E0B"/>'
        +'<circle cx="17" cy="12" r="5.5" fill="#fff"/>'
        +'</svg>'
        +'<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);'
        +'background:#F59E0B;color:#fff;font-size:9px;font-weight:700;'
        +'padding:1px 4px;border-radius:4px;white-space:nowrap">PENDING</div>'
        +'</div>',
      iconSize:[34,52], iconAnchor:[17,52]
    });
  }

  // ── Render order pins ────────────────────────────────────────────────────────
  function renderOrders(list) {
    // Remove old markers
    Object.values(markers).forEach(function(m){ map.removeLayer(m); });
    markers = {};

    list.forEach(function(o) {
      var m = L.marker([o.PICKUP_LAT, o.PICKUP_LNG], {icon: orderIcon(o.ID)}).addTo(map);

      var pickup  = o.PICKUP_ADDRESS  || 'Unknown pickup';
      var dropoff = o.RECIPIENT_ADDRESS || 'Unknown dropoff';
      var vehicle = o.VEHICLE_TYPE ? (o.VEHICLE_TYPE.charAt(0).toUpperCase()+o.VEHICLE_TYPE.slice(1)) : '—';
      var items   = o.ITEM_TYPES || '—';
      var contact = o.ORDER_CONTACT || '—';
      var payment = o.PAYMENT_METHOD ? (o.PAYMENT_METHOD.charAt(0).toUpperCase()+o.PAYMENT_METHOD.slice(1)) : '—';
      var name    = o.RECIPIENT_NAME || '—';

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
      markers[o.ID] = m;
    });
  }

  renderOrders(orders);

  // ── Accept order ─────────────────────────────────────────────────────────────
  window.acceptOrder = function(id) {
    window.ReactNativeWebView.postMessage(JSON.stringify({action:'accept',id:id}));
  };

  // ── Remove a pin after acceptance ────────────────────────────────────────────
  window.removeOrderPin = function(id) {
    if(markers[id]){ map.removeLayer(markers[id]); delete markers[id]; }
  };

  // ── Called by RN: GPS update ─────────────────────────────────────────────────
  window.updatePosition = function(lat,lng) {
    driverMarker.setLatLng([lat,lng]);
  };

  window.updateHeading = function(deg) {
    if(arrowEl) arrowEl.style.transform = 'rotate('+deg+'deg)';
  };

  // ── Called by RN: reload all pins ───────────────────────────────────────────
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

  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders]   = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  // ── Fetch pending orders via RPC (works without JWT; verifies driver in PROFILE)
  const fetchOrders = useCallback(async () => {
    const driverId = user?.id ?? null;
    const { data } = await supabase.rpc('get_pending_orders', { p_driver_id: driverId });
    const list = (Array.isArray(data) ? data : []) as PendingOrder[];
    setOrders(list);
    // Inject into existing map if it's already mounted
    webRef.current?.injectJavaScript(
      `typeof reloadOrders!=='undefined'&&reloadOrders(${JSON.stringify(JSON.stringify(list))});true`
    );
  }, [user?.id]);

  // ── Init: get GPS + load orders ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      let posSub: Location.LocationSubscription | null = null;
      let headSub: Location.LocationSubscription | null = null;

      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const pos = status === 'granted'
          ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          : null;
        const c = pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude }
          : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
        setCoords(c);

        await fetchOrders();
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

      // Poll every 30 s
      pollRef.current = setInterval(fetchOrders, 30_000);

      return () => {
        posSub?.remove();
        headSub?.remove();
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchOrders])
  );

  // ── Handle accept message from WebView ─────────────────────────────────────
  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { action: string; id: string };
      if (msg.action !== 'accept' || !msg.id) return;
      if (accepting) return;
      setAccepting(true);

      const { error } = await supabase
        .from('PACKAGES')
        .update({
          STATUS:      'IN_PROGRESS',
          DRIVER_ID:   user?.id,
          ACCEPTED_AT: new Date().toISOString(),
        })
        .eq('ID', msg.id)
        .is('DRIVER_ID', null);       // prevent double-accept

      setAccepting(false);

      if (error) {
        Alert.alert('Could not accept', error.message);
        return;
      }

      // Remove pin from map immediately
      webRef.current?.injectJavaScript(
        `typeof removeOrderPin!=='undefined'&&removeOrderPin('${msg.id}');true`
      );
      setOrders((prev) => prev.filter((o) => o.ID !== msg.id));
      Alert.alert('Order accepted!', 'Head to the pickup location. Check your Orders tab.');
    } catch { /* ignore parse errors */ }
  }, [accepting, user]);

  if (loading || !coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B6B4A" />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Orders</Text>
        <View style={styles.headerRight}>
          {accepting && <ActivityIndicator size="small" color="#1B6B4A" style={{ marginRight: 10 }} />}
          <TouchableOpacity onPress={fetchOrders} style={styles.refreshBtn} hitSlop={8}>
            <Text style={styles.refreshText}>{orders.length} pending</Text>
          </TouchableOpacity>
        </View>
      </View>

      <WebView
        ref={webRef}
        source={{ html: buildMapHTML(TOMTOM_KEY, coords.lat, coords.lng, orders) }}
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
  safe:         { flex: 1, backgroundColor: '#fff' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText:  { marginTop: 12, fontSize: 15, color: '#888' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  title:        { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  headerRight:  { flexDirection: 'row', alignItems: 'center' },
  refreshBtn:   { backgroundColor: '#EEF2EE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  refreshText:  { fontSize: 13, color: '#1B6B4A', fontWeight: '600' },
  map:          { flex: 1 },
});
