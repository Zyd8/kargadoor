/**
 * ActiveDeliveryModal
 * Full-screen two-phase delivery tracking for IN_PROGRESS orders.
 *
 * Phase 1 — Pickup leg:
 *   Map shows driver → pickup route (amber pin). Driver taps "Mark as Package Received",
 *   takes a proof photo, then the map switches to Phase 2.
 *
 * Phase 2 — Delivery leg:
 *   Map shows driver → dropoff route (red pin + 1 km geofence). Within 1 km the
 *   "Take POD Photo" button enables, completing the order.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

import { supabase } from '@/lib/supabase';

const PRIMARY     = '#1B6B4A';
const TOMTOM_KEY  = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const GEOFENCE_KM = 1;

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'pickup' | 'delivery';

export type ActiveDeliveryPackage = {
  ID: string;
  PICKUP_ADDRESS: string | null;
  PICKUP_LAT: number | null;
  PICKUP_LNG: number | null;
  RECIPIENT_ADDRESS: string | null;
  DROPOFF_LAT: number | null;
  DROPOFF_LNG: number | null;
  PICKUP_CONFIRMED_AT: string | null;
};

export interface ActiveDeliveryModalProps {
  visible: boolean;
  pkg: ActiveDeliveryPackage;
  onClose: () => void;
  onDelivered: () => void;
}

// ── Base64 → Uint8Array (avoids fetch(localUri) which fails on Android) ───────
function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── TomTom route fetch (RN-side to avoid CORS in WebView) ────────────────────
async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<[number, number][]> {
  try {
    const url =
      `https://api.tomtom.com/routing/1/calculateRoute/` +
      `${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pts: { latitude: number; longitude: number }[] =
      data?.routes?.[0]?.legs?.[0]?.points ?? [];
    return pts.map((p) => [p.latitude, p.longitude]);
  } catch {
    return [];
  }
}

// ── Leaflet map HTML ──────────────────────────────────────────────────────────
function buildMapHTML(
  driverLat: number,
  driverLng: number,
  destLat: number,
  destLng: number,
  phase: Phase,
): string {
  const pinColour    = phase === 'pickup' ? '#F59E0B' : '#EF4444';
  const pinLabel     = phase === 'pickup' ? 'PICKUP' : 'DROP OFF';
  const showGeofence = phase === 'delivery';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var driverLat=${driverLat}, driverLng=${driverLng};
  var destLat=${destLat}, destLng=${destLng};
  var curPhase='${phase}';

  var map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([(driverLat+destLat)/2,(driverLng+destLng)/2],13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}&tileSize=256',
    {maxZoom:22,errorTileUrl:''}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);

  // ── Driver arrow ─────────────────────────────────────────────────────────
  var arrowHTML='<div id="user-arrow" style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear">'
    +'<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">'
    +'<circle cx="18" cy="18" r="17" fill="#1B6B4A" fill-opacity="0.2"/>'
    +'<polygon points="18,4 28,30 18,24 8,30" fill="#1B6B4A" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
    +'</svg></div>';
  var arrowEl=null;
  var driverMarker=L.marker([driverLat,driverLng],{
    icon:L.divIcon({className:'',html:arrowHTML,iconSize:[36,36],iconAnchor:[18,18]}),
    zIndexOffset:1000
  }).addTo(map);
  map.whenReady(function(){arrowEl=document.getElementById('user-arrow');});

  // ── Destination pin ──────────────────────────────────────────────────────
  function makePinIcon(colour,label){
    return L.divIcon({
      className:'',
      html:'<div style="position:relative;width:34px;height:52px">'
        +'<svg viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">'
        +'<path d="M17 0C10.37 0 5 5.37 5 12c0 9 12 30 12 30S29 21 29 12C29 5.37 23.63 0 17 0z" fill="'+colour+'"/>'
        +'<circle cx="17" cy="12" r="5.5" fill="#fff"/>'
        +'</svg>'
        +'<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);'
        +'background:'+colour+';color:#fff;font-size:9px;font-weight:700;'
        +'padding:1px 4px;border-radius:4px;white-space:nowrap">'+label+'</div>'
        +'</div>',
      iconSize:[34,52],iconAnchor:[17,52]
    });
  }
  var destMarker=L.marker([destLat,destLng],{icon:makePinIcon('${pinColour}','${pinLabel}')}).addTo(map);

  // ── 1 km geofence (delivery phase only) ─────────────────────────────────
  var geofence=${showGeofence
    ? `L.circle([${destLat},${destLng}],{radius:${GEOFENCE_KM*1000},color:'#EF4444',fillColor:'#EF4444',fillOpacity:0.08,weight:2,dashArray:'6,4'}).addTo(map)`
    : 'null'};

  // ── Route polyline ───────────────────────────────────────────────────────
  var routeLine=null;
  window.drawRoute=function(pts){
    if(routeLine){map.removeLayer(routeLine);}
    if(!pts||pts.length===0)return;
    routeLine=L.polyline(pts,{color:'#1B6B4A',weight:5,opacity:0.75,lineJoin:'round'}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[60,60]});
  };

  // ── Switch to delivery phase from RN ────────────────────────────────────
  window.switchDestination=function(lat,lng){
    curPhase='delivery';
    destLat=lat; destLng=lng;
    destMarker.setLatLng([lat,lng]);
    destMarker.setIcon(makePinIcon('#EF4444','DROP OFF'));
    if(routeLine){map.removeLayer(routeLine); routeLine=null;}
    if(!geofence){
      geofence=L.circle([lat,lng],{radius:${GEOFENCE_KM*1000},color:'#EF4444',fillColor:'#EF4444',fillOpacity:0.08,weight:2,dashArray:'6,4'}).addTo(map);
    } else {
      geofence.setLatLng([lat,lng]);
    }
  };

  // ── Live GPS ────────────────────────────────────────────────────────────
  window.updatePosition=function(lat,lng){
    driverLat=lat; driverLng=lng;
    driverMarker.setLatLng([lat,lng]);
    if(curPhase==='delivery'&&geofence){
      var inside=map.distance([lat,lng],[destLat,destLng])<=${GEOFENCE_KM*1000};
      geofence.setStyle({color:inside?'#1B6B4A':'#EF4444',fillColor:inside?'#1B6B4A':'#EF4444'});
      window.ReactNativeWebView.postMessage(JSON.stringify({
        insideRadius:inside,
        distKm:map.distance([lat,lng],[destLat,destLng])/1000
      }));
    }
  };
  window.updateHeading=function(deg){
    if(arrowEl)arrowEl.style.transform='rotate('+deg+'deg)';
  };

  // initial fit
  map.fitBounds([[driverLat,driverLng],[destLat,destLng]],{padding:[60,60]});
</script>
</body>
</html>`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ActiveDeliveryModal({
  visible,
  pkg,
  onClose,
  onDelivered,
}: ActiveDeliveryModalProps) {
  const webRef = useRef<WebView>(null);

  const [phase, setPhase]               = useState<Phase>(
    pkg.PICKUP_CONFIRMED_AT ? 'delivery' : 'pickup'
  );
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading]     = useState(true);
  const [insideRadius, setInsideRadius] = useState(false);
  const [distKm, setDistKm]             = useState<number | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [delivered, setDelivered]       = useState(false);

  // Determine active destination based on phase
  const destLat = phase === 'pickup' ? pkg.PICKUP_LAT : pkg.DROPOFF_LAT;
  const destLng = phase === 'pickup' ? pkg.PICKUP_LNG : pkg.DROPOFF_LNG;
  const hasCoords = destLat != null && destLng != null;

  // Reset state when pkg changes (modal re-opened for same/different order)
  useEffect(() => {
    setPhase(pkg.PICKUP_CONFIRMED_AT ? 'delivery' : 'pickup');
    setInsideRadius(false);
    setDistKm(null);
    setDelivered(false);
  }, [pkg.ID, pkg.PICKUP_CONFIRMED_AT]);

  // GPS + heading watch
  useEffect(() => {
    if (!visible) return;
    let posSub: Location.LocationSubscription | null = null;
    let headSub: Location.LocationSubscription | null = null;
    setLocLoading(true);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocLoading(false); return; }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setDriverCoords(c);
      setLocLoading(false);

      // Initial delivery-phase distance calc
      if (phase === 'delivery' && destLat != null && destLng != null) {
        const d = haversineKm(c.lat, c.lng, destLat, destLng);
        setDistKm(d);
        setInsideRadius(d <= GEOFENCE_KM);
      }

      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          webRef.current?.injectJavaScript(
            `typeof updatePosition!=='undefined'&&updatePosition(${latitude},${longitude});true`
          );
        }
      );
      headSub = await Location.watchHeadingAsync((h) => {
        const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        webRef.current?.injectJavaScript(
          `typeof updateHeading!=='undefined'&&updateHeading(${deg});true`
        );
      });
    })();

    return () => { posSub?.remove(); headSub?.remove(); };
  }, [visible]);

  // Fetch + inject route whenever driver coords are available or phase changes
  useEffect(() => {
    if (!driverCoords || !hasCoords) return;
    (async () => {
      const points = await fetchRoute(driverCoords.lat, driverCoords.lng, destLat!, destLng!);
      if (points.length > 0) {
        webRef.current?.injectJavaScript(
          `typeof drawRoute!=='undefined'&&drawRoute(${JSON.stringify(points)});true`
        );
      }
    })();
  }, [driverCoords, phase]);

  // Handle WebView messages (delivery phase geofence updates)
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { insideRadius: boolean; distKm: number };
      setInsideRadius(msg.insideRadius);
      setDistKm(msg.distKm);
    } catch { /* ignore */ }
  };

  // ── Pickup confirmation ──────────────────────────────────────────────────
  const handleConfirmPickup = async () => {
    if (submitting) return;

    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (camPerm.status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed for proof of pickup.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      mediaTypes: 'images' as any,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setSubmitting(true);
    try {
      const bytes = base64ToBytes(result.assets[0].base64!);
      const path  = `pickup_${pkg.ID}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('pod-photos')
        .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const podUrl = supabase.storage.from('pod-photos').getPublicUrl(path).data.publicUrl;

      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc('confirm_pickup', { p_package_id: pkg.ID, p_pickup_pod_url: podUrl });
      if (rpcErr) throw rpcErr;
      if (!rpcResult?.ok) throw new Error(rpcResult?.error ?? 'Could not confirm pickup');

      // Switch map to delivery phase
      if (pkg.DROPOFF_LAT != null && pkg.DROPOFF_LNG != null) {
        webRef.current?.injectJavaScript(
          `typeof switchDestination!=='undefined'&&switchDestination(${pkg.DROPOFF_LAT},${pkg.DROPOFF_LNG});true`
        );
      }
      setPhase('delivery');
      setInsideRadius(false);
      setDistKm(null);

      Alert.alert('Package received!', 'Now head to the dropoff location.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not confirm pickup.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delivery confirmation (POD photo) ────────────────────────────────────
  const handleTakeDeliveryPhoto = async () => {
    if (submitting) return;

    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (camPerm.status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed for proof of delivery.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      mediaTypes: 'images' as any,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setSubmitting(true);
    try {
      const bytes = base64ToBytes(result.assets[0].base64!);
      const path  = `${pkg.ID}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('pod-photos')
        .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const podUrl = supabase.storage.from('pod-photos').getPublicUrl(path).data.publicUrl;

      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc('complete_order', { p_package_id: pkg.ID, p_pod_url: podUrl });
      if (rpcErr) throw rpcErr;
      if (!rpcResult?.ok) throw new Error(rpcResult?.error ?? 'Could not complete delivery');

      supabase.functions.invoke('send-notification', {
        body: {
          to_package_id: pkg.ID,
          title: 'Package Delivered!',
          body: 'Your package has been delivered successfully.',
        },
      }).catch((e: unknown) => console.warn('[send-notification]', e));

      setDelivered(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not complete delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const currentDest = phase === 'pickup'
    ? pkg.PICKUP_ADDRESS
    : pkg.RECIPIENT_ADDRESS;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Delivery success overlay */}
        {delivered && (
          <View style={styles.successOverlay}>
            <MaterialIcons name="check-circle" size={72} color={PRIMARY} />
            <Text style={styles.successTitle}>Delivered!</Text>
            <Text style={styles.successSub}>Order marked as complete.</Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => { setDelivered(false); onDelivered(); }}
            >
              <Text style={styles.successBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Active Delivery</Text>
          <View style={[styles.phasePill, phase === 'delivery' && styles.phasePillDelivery]}>
            <Text style={[styles.phasePillText, phase === 'delivery' && styles.phasePillTextDelivery]}>
              {phase === 'pickup' ? 'PICKUP' : 'DELIVERY'}
            </Text>
          </View>
        </View>

        {/* Address strip */}
        {currentDest ? (
          <View style={[styles.addrStrip, phase === 'delivery' && styles.addrStripDelivery]}>
            <MaterialIcons
              name={phase === 'pickup' ? 'place' : 'flag'}
              size={14}
              color={phase === 'pickup' ? '#F59E0B' : '#EF4444'}
            />
            <Text style={styles.addrText} numberOfLines={1}>{currentDest}</Text>
          </View>
        ) : null}

        {/* Map */}
        {locLoading || !driverCoords || !hasCoords ? (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.mapLoaderText}>
              {!hasCoords ? 'No coordinates for this order' : 'Getting your location…'}
            </Text>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{
              html: buildMapHTML(
                driverCoords.lat, driverCoords.lng,
                destLat!, destLng!,
                phase,
              ),
            }}
            style={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={handleMessage}
          />
        )}

        {/* Bottom panel */}
        {phase === 'pickup' ? (
          <View style={styles.bottomPanelPickup}>
            <View style={styles.bottomRow}>
              <MaterialIcons name="place" size={20} color="#92400E" />
              <Text style={styles.bottomTextPickup}>Head to the pickup location</Text>
            </View>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleConfirmPickup}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark as Package Received</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.bottomPanelDelivery,
            insideRadius ? styles.bottomPanelGreen : styles.bottomPanelAmber,
          ]}>
            {insideRadius ? (
              <>
                <View style={styles.bottomRow}>
                  <MaterialIcons name="check-circle" size={20} color={PRIMARY} />
                  <Text style={styles.bottomTextGreen}>You're at the delivery location!</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleTakeDeliveryPhoto}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="camera-alt" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Take POD Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.bottomRow}>
                <MaterialIcons name="directions-walk" size={20} color="#B45309" />
                <Text style={styles.bottomTextAmber}>
                  {distKm != null
                    ? `${distKm.toFixed(2)} km from dropoff — get closer to deliver`
                    : 'Calculating distance…'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EAE4',
    backgroundColor: '#fff',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  phasePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  phasePillDelivery:     { backgroundColor: '#E8F5E9', borderColor: PRIMARY },
  phasePillText:         { fontSize: 11, fontWeight: '700', color: '#92400E' },
  phasePillTextDelivery: { color: PRIMARY },

  addrStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  addrStripDelivery: { backgroundColor: '#FFF5F5', borderBottomColor: '#FDE8E8' },
  addrText: { fontSize: 13, color: '#555', flex: 1 },

  map:       { flex: 1 },
  mapLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapLoaderText: { marginTop: 12, fontSize: 14, color: '#888' },

  // Phase 1 bottom
  bottomPanelPickup: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  bottomTextPickup: { fontSize: 14, fontWeight: '500', color: '#92400E', flex: 1 },

  // Phase 2 bottom
  bottomPanelDelivery:  { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32, borderTopWidth: 1 },
  bottomPanelGreen:     { backgroundColor: '#F0FFF4', borderTopColor: '#C6F6D5' },
  bottomPanelAmber:     { backgroundColor: '#FFFBEB', borderTopColor: '#FDE68A' },
  bottomTextGreen:      { fontSize: 14, fontWeight: '600', color: PRIMARY, flex: 1 },
  bottomTextAmber:      { fontSize: 14, fontWeight: '500', color: '#92400E', flex: 1 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  successTitle:   { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginTop: 20, marginBottom: 8 },
  successSub:     { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32 },
  successBtn:     { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  successBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
