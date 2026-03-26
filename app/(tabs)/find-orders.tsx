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
const PRIMARY     = '#f0a92d';

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
    .routes{margin-top:10px;border-top:1px solid #EEE;padding-top:10px}
    .routes-title{font-size:11px;font-weight:800;color:#666;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px}
    .route-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 10px;margin-bottom:6px;
      border:1px solid #E5E7EB;border-radius:10px;background:#fff;color:#1A1A1A;cursor:pointer;font-size:12px;font-weight:700}
    .route-btn small{display:block;font-size:10px;font-weight:700;color:#6B7280}
    .route-btn.active{border-color:#f0a92d;box-shadow:0 0 0 3px rgba(240,169,45,0.15)}
    .route-btn:disabled{opacity:0.55;cursor:not-allowed}
    .accept-btn{display:block;width:100%;margin-top:10px;padding:10px;background:#f0a92d;color:#fff;
      border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-align:center}
    .accept-btn:active{opacity:0.8}
    .accept-btn:disabled{opacity:0.55;cursor:not-allowed}
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
    + '<circle cx="18" cy="18" r="17" fill="#f0a92d" fill-opacity="0.2"/>'
    + '<polygon points="18,4 28,30 18,24 8,30" fill="#f0a92d" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
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

      var popupHtml = '<div class="order-popup" id="popup-'+id+'">'
        + '<h3>Delivery Order</h3>'
        + '<p class="lbl">Pick Up</p><p>'+pickup+'</p>'
        + '<p class="lbl" style="margin-top:6px">Drop Off</p><p>'+dropoff+'</p>'
        + '<p class="lbl" style="margin-top:6px">Recipient</p><p>'+name+'</p>'
        + '<p class="lbl" style="margin-top:6px">Vehicle</p><p>'+vehicle+'</p>'
        + '<p class="lbl" style="margin-top:6px">Items</p><p>'+items+'</p>'
        + '<p class="lbl" style="margin-top:6px">Contact</p><p>'+contact+'</p>'
        + '<p class="lbl" style="margin-top:6px">Payment</p><p>'+payment+'</p>'
        + '<div class="routes">'
        +   '<div class="routes-title">Choose a route</div>'
        +   '<div id="routes-'+id+'">'
        +     '<button class="route-btn" disabled>Loading routes…</button>'
        +   '</div>'
        + '</div>'
        + '<button id="accept-'+id+'" class="accept-btn" disabled onclick="acceptOrder(\\''+id+'\\')">Accept Order</button>'
        + '</div>';

      m.bindPopup(popupHtml, {maxWidth:260, minWidth:220});
      m.on('popupopen', function() {
        if (typeof window.loadRoutesForOrder === 'function') {
          window.loadRoutesForOrder(id, lat, lng);
        }
      });
      markers[id] = m;
    });
  }

  renderOrders(orders);

  // ── Alternative routes (driver → pickup) ───────────────────────────────────
  var routeLayers = {};       // { [orderId]: L.Polyline[] }
  var selectedRouteIdx = {};  // { [orderId]: number | null }

  function fmtMin(sec) {
    var m = Math.max(1, Math.round((Number(sec) || 0) / 60));
    return m + ' min';
  }
  function fmtKm(meters) {
    var km = (Number(meters) || 0) / 1000;
    return km.toFixed(1) + ' km';
  }

  function clearRoutes(orderId) {
    var layers = routeLayers[orderId] || [];
    layers.forEach(function(l) { try { map.removeLayer(l); } catch(e){} });
    routeLayers[orderId] = [];
    selectedRouteIdx[orderId] = null;
  }

  function setRouteSelection(orderId, idx) {
    selectedRouteIdx[orderId] = idx;
    var layers = routeLayers[orderId] || [];
    layers.forEach(function(l, i) {
      l.setStyle({
        color: i === idx ? '#f0a92d' : '#9CA3AF',
        weight: i === idx ? 6 : 4,
        opacity: i === idx ? 0.85 : 0.45,
      });
    });

    var acceptBtn = document.getElementById('accept-' + orderId);
    if (acceptBtn) acceptBtn.disabled = (idx == null);

    var wrap = document.getElementById('routes-' + orderId);
    if (wrap) {
      Array.prototype.slice.call(wrap.querySelectorAll('.route-btn')).forEach(function(btn) {
        var bIdx = Number(btn.getAttribute('data-idx'));
        if (isFinite(bIdx) && bIdx === idx) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  }

  async function fetchRoutes(fromLat, fromLng, toLat, toLng) {
    var base =
      'https://api.tomtom.com/routing/1/calculateRoute/' +
      fromLat + ',' + fromLng + ':' + toLat + ',' + toLng +
      '/json?key=' + encodeURIComponent(K) + '&traffic=true';
    // Ask for up to 3 total routes (2 alternatives + 1 main). If unsupported, fall back to single route.
    var url = base + '&maxAlternatives=2';
    var resp = await fetch(url);
    if (!resp.ok) resp = await fetch(base);
    if (!resp.ok) return [];
    var data = await resp.json();
    var routes = (data && data.routes) ? data.routes : [];
    return Array.isArray(routes) ? routes.slice(0, 3) : [];
  }

  function routePoints(route) {
    var pts = route && route.legs && route.legs[0] && route.legs[0].points ? route.legs[0].points : [];
    if (!Array.isArray(pts)) return [];
    return pts.map(function(p){ return [p.latitude, p.longitude]; });
  }

  window.loadRoutesForOrder = async function(orderId, pickupLat, pickupLng) {
    try {
      clearRoutes(orderId);

      var wrap = document.getElementById('routes-' + orderId);
      if (!wrap) return;
      wrap.innerHTML = '<button class="route-btn" disabled>Loading routes…</button>';
      var acceptBtn = document.getElementById('accept-' + orderId);
      if (acceptBtn) acceptBtn.disabled = true;

      var from = driverMarker.getLatLng();
      var routes = await fetchRoutes(from.lat, from.lng, pickupLat, pickupLng);
      if (!routes || routes.length === 0) {
        wrap.innerHTML = '<button class="route-btn" disabled>No routes available</button>';
        return;
      }

      // Draw all routes (grey)
      var layers = [];
      routes.forEach(function(r) {
        var pts = routePoints(r);
        if (!pts || pts.length < 2) return;
        var line = L.polyline(pts, { color:'#9CA3AF', weight:4, opacity:0.45, lineJoin:'round' }).addTo(map);
        layers.push(line);
      });
      routeLayers[orderId] = layers;

      // Build buttons
      wrap.innerHTML = '';
      routes.forEach(function(r, i) {
        var s = r && r.summary ? r.summary : {};
        var t = fmtMin(s.travelTimeInSeconds);
        var d = fmtKm(s.lengthInMeters);
        var btn = document.createElement('button');
        btn.className = 'route-btn';
        btn.setAttribute('data-idx', String(i));
        btn.innerHTML =
          '<div>Route ' + (i+1) + '<small>' + d + '</small></div>' +
          '<div><small>' + t + '</small></div>';
        btn.onclick = function() { setRouteSelection(orderId, i); };
        wrap.appendChild(btn);
      });

      if (routes.length <= 1) {
        // Only one route -> auto-select
        setRouteSelection(orderId, 0);
      } else {
        // Multiple routes -> force explicit pick
        setRouteSelection(orderId, null);
      }

      var b = L.latLngBounds([from, [pickupLat, pickupLng]]);
      map.fitBounds(b, { padding:[50,50] });
    } catch(e) {
      var wrap = document.getElementById('routes-' + orderId);
      if (wrap) wrap.innerHTML = '<button class="route-btn" disabled>Could not load routes</button>';
    }
  };

  // ── Accept order ──────────────────────────────────────────────────────────
  window.acceptOrder = function(id) {
    if (selectedRouteIdx[id] == null) return;
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
          <MaterialIcons name="directions-car" size={64} color="#E8DCC8" />
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
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EDE6DC', backgroundColor: '#fff' },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:            { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  vehicleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY + '14', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  vehicleBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn:  { backgroundColor: '#FEF5E6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
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
