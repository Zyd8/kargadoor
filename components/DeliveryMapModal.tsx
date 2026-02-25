/**
 * DeliveryMapModal
 * Full-screen Leaflet map showing:
 *  - Driver's live GPS position (green arrow)
 *  - Dropoff destination pin (red)
 *  - 1 km geofence circle around the dropoff
 * When the driver is inside the 1 km circle, the "Take POD Photo" button enables.
 * On confirm: takes a photo, uploads to Supabase Storage, marks order COMPLETE.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
const GEOFENCE_KM = 1;

export interface DeliveryMapModalProps {
  visible: boolean;
  packageId: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffAddress: string | null;
  onClose: () => void;
  onDelivered: () => void;
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

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
  driverLat: number,
  driverLng: number,
  dropLat: number,
  dropLng: number,
): string {
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
  var map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([${(driverLat + dropLat) / 2},${(driverLng + dropLng) / 2}], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);

  // Geofence circle around dropoff
  var circle = L.circle([${dropLat},${dropLng}], {
    radius: ${GEOFENCE_KM * 1000},
    color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.08, weight: 2, dashArray: '6,4'
  }).addTo(map);

  // Dropoff pin (red)
  var dropIcon = L.divIcon({
    className:'',
    html:'<div style="position:relative;width:34px;height:42px">'
      +'<svg viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">'
      +'<path d="M17 0C10.37 0 5 5.37 5 12c0 9 12 30 12 30S29 21 29 12C29 5.37 23.63 0 17 0z" fill="#EF4444"/>'
      +'<circle cx="17" cy="12" r="5.5" fill="#fff"/>'
      +'</svg>'
      +'<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);'
      +'background:#EF4444;color:#fff;font-size:9px;font-weight:700;'
      +'padding:1px 4px;border-radius:4px;white-space:nowrap">DROP OFF</div>'
      +'</div>',
    iconSize:[34,52],iconAnchor:[17,52]
  });
  L.marker([${dropLat},${dropLng}],{icon:dropIcon}).addTo(map);

  // Driver arrow (green)
  var arrowHTML='<div style="width:36px;height:36px">'
    +'<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">'
    +'<circle cx="18" cy="18" r="17" fill="#1B6B4A" fill-opacity="0.2"/>'
    +'<polygon points="18,4 28,30 18,24 8,30" fill="#1B6B4A" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
    +'</svg></div>';

  var driverMarker = L.marker([${driverLat},${driverLng}],{
    icon: L.divIcon({className:'',html:arrowHTML,iconSize:[36,36],iconAnchor:[18,18]}),
    zIndexOffset:1000
  }).addTo(map);

  map.fitBounds([
    [${driverLat},${driverLng}],
    [${dropLat},${dropLng}]
  ], {padding:[50,50]});

  window.updateDriverPos = function(lat,lng) {
    driverMarker.setLatLng([lat,lng]);
    var inside = map.distance(driverMarker.getLatLng(), [${dropLat},${dropLng}]) <= ${GEOFENCE_KM * 1000};
    circle.setStyle({color: inside ? '#1B6B4A' : '#EF4444', fillColor: inside ? '#1B6B4A' : '#EF4444'});
    window.ReactNativeWebView.postMessage(JSON.stringify({
      insideRadius: inside,
      distKm: map.distance(driverMarker.getLatLng(),[${dropLat},${dropLng}]) / 1000
    }));
  };
</script>
</body>
</html>`;
}

export default function DeliveryMapModal({
  visible,
  packageId,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
  onClose,
  onDelivered,
}: DeliveryMapModalProps) {
  const webRef = useRef<WebView>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [insideRadius, setInsideRadius] = useState(false);
  const [distKm, setDistKm]             = useState<number | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [locLoading, setLocLoading]     = useState(true);

  const hasDropoff = dropoffLat != null && dropoffLng != null;

  useEffect(() => {
    if (!visible) return;
    let sub: Location.LocationSubscription | null = null;
    setLocLoading(true);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setDriverCoords(c);
      setLocLoading(false);

      if (hasDropoff) {
        const d = haversineKm(c.lat, c.lng, dropoffLat!, dropoffLng!);
        setDistKm(d);
        setInsideRadius(d <= GEOFENCE_KM);
      }

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          webRef.current?.injectJavaScript(
            `typeof updateDriverPos!=='undefined'&&updateDriverPos(${latitude},${longitude});true`
          );
          if (hasDropoff) {
            const d = haversineKm(latitude, longitude, dropoffLat!, dropoffLng!);
            setDistKm(d);
            setInsideRadius(d <= GEOFENCE_KM);
          }
        }
      );
    })();

    return () => { sub?.remove(); };
  }, [visible]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { insideRadius: boolean; distKm: number };
      setInsideRadius(msg.insideRadius);
      setDistKm(msg.distKm);
    } catch { /* ignore */ }
  };

  const handleTakePhoto = async () => {
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
      const path  = `${packageId}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('pod-photos')
        .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });

      if (uploadErr) throw uploadErr;

      const podUrl = supabase.storage.from('pod-photos').getPublicUrl(path).data.publicUrl;

      const { data: result, error: rpcErr } = await supabase
        .rpc('complete_order', { p_package_id: packageId, p_pod_url: podUrl });

      if (rpcErr) throw rpcErr;
      if (!result?.ok) throw new Error(result?.error ?? 'Could not mark as delivered');

      // Notify sender (best-effort)
      supabase.functions.invoke('send-notification', {
        body: {
          to_package_id: packageId,
          title: 'Package Delivered!',
          body: 'Your package has been delivered successfully.',
        },
      }).catch(() => {});

      Alert.alert('Delivered!', 'Order marked as complete.');
      onDelivered();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not complete delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasDropoff) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Mark as Delivered</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.center}>
            <MaterialIcons name="location-off" size={48} color="#CCC" />
            <Text style={styles.noCoordText}>No dropoff coordinates for this order.</Text>
            <Text style={styles.noCoordSub}>You can still mark it delivered without the map.</Text>
            <TouchableOpacity
              style={[styles.photoBtn, { marginTop: 24 }]}
              onPress={handleTakePhoto}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <><MaterialIcons name="camera-alt" size={20} color="#fff" /><Text style={styles.photoBtnText}>Take POD Photo</Text></>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Mark as Delivered</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Dropoff address strip */}
        {dropoffAddress ? (
          <View style={styles.addrStrip}>
            <MaterialIcons name="flag" size={14} color="#EF4444" />
            <Text style={styles.addrText} numberOfLines={1}>{dropoffAddress}</Text>
          </View>
        ) : null}

        {/* Map */}
        {locLoading || !driverCoords ? (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.mapLoaderText}>Getting your location…</Text>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ html: buildMapHTML(driverCoords.lat, driverCoords.lng, dropoffLat!, dropoffLng!) }}
            style={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={handleMessage}
          />
        )}

        {/* Bottom panel */}
        <View style={[styles.bottomPanel, insideRadius ? styles.bottomPanelGreen : styles.bottomPanelAmber]}>
          {insideRadius ? (
            <>
              <View style={styles.bottomRow}>
                <MaterialIcons name="check-circle" size={20} color={PRIMARY} />
                <Text style={styles.bottomTextGreen}>You're at the delivery location!</Text>
              </View>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handleTakePhoto}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="camera-alt" size={20} color="#fff" />
                    <Text style={styles.photoBtnText}>Take POD Photo</Text>
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
      </View>
    </Modal>
  );
}

// SafeAreaView replacement (Modal doesn't inherit safe area)
function SafeAreaView({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flex: 1, backgroundColor: '#fff' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

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

  addrStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE8E8',
  },
  addrText: { fontSize: 13, color: '#555', flex: 1 },

  map:       { flex: 1 },
  mapLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapLoaderText: { marginTop: 12, fontSize: 14, color: '#888' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  noCoordText: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 14, textAlign: 'center' },
  noCoordSub:  { fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center' },

  bottomPanel: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  bottomPanelGreen: { backgroundColor: '#F0FFF4', borderTopColor: '#C6F6D5' },
  bottomPanelAmber: { backgroundColor: '#FFFBEB', borderTopColor: '#FDE68A' },

  bottomRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bottomTextGreen: { fontSize: 14, fontWeight: '600', color: PRIMARY, flex: 1 },
  bottomTextAmber: { fontSize: 14, fontWeight: '500', color: '#92400E', flex: 1 },

  photoBtn: {
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
  photoBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
