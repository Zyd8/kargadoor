/**
 * LocationMapModal
 * Full-screen Leaflet WebView for dropping a pin on the map.
 * Tap anywhere → pin moves. "Confirm" → reverse-geocodes → calls onConfirm.
 */
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

export type PickedLocation = { address: string; lat: number; lng: number };

interface Props {
  visible: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (loc: PickedLocation) => void;
  onCancel: () => void;
}

function buildHTML(lat: number, lng: number, apiKey: string): string {
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
    #hint{position:absolute;top:12px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.55);color:#fff;font-size:13px;padding:6px 14px;
      border-radius:20px;pointer-events:none;white-space:nowrap;z-index:999;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif}
  </style>
</head>
<body>
  <div id="hint">Tap to place pin</div>
  <div id="map"></div>
  <script>
    var K = '${apiKey}';
    var pinLat = ${lat}, pinLng = ${lng};

    var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([pinLat,pinLng],15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key='+K+'&tileSize=256',
      {maxZoom:22,errorTileUrl:''}).addTo(map);
    L.control.zoom({position:'topright'}).addTo(map);

    var pinIcon = L.divIcon({
      className:'',
      html:'<div style="width:32px;height:40px;position:relative">' +
        '<svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0z" fill="#f0a92d"/>' +
        '<circle cx="16" cy="12" r="5" fill="#fff"/>' +
        '</svg></div>',
      iconSize:[32,40],iconAnchor:[16,40]
    });

    var pin = L.marker([pinLat,pinLng],{icon:pinIcon,draggable:true}).addTo(map);

    pin.on('dragend',function(e){
      var ll = e.target.getLatLng();
      pinLat = ll.lat; pinLng = ll.lng;
      sendCoords();
    });

    map.on('click',function(e){
      pinLat = e.latlng.lat; pinLng = e.latlng.lng;
      pin.setLatLng([pinLat,pinLng]);
      document.getElementById('hint').style.display='none';
      sendCoords();
    });

    function sendCoords(){
      window.ReactNativeWebView.postMessage(JSON.stringify({lat:pinLat,lng:pinLng}));
    }

    // Allow RN to move pin programmatically
    window.movePinTo = function(lat,lng){
      pinLat=lat; pinLng=lng;
      pin.setLatLng([lat,lng]);
      map.setView([lat,lng],15);
    };
  </script>
</body>
</html>`;
}

export default function LocationMapModal({ visible, initialLat, initialLng, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // On open: use initialLat/Lng or device GPS
  useEffect(() => {
    if (!visible) return;
    setPendingCoords(null);
    setConfirming(false);

    if (initialLat != null && initialLng != null) {
      setMapCenter({ lat: initialLat, lng: initialLng });
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMapCenter(c);
      webRef.current?.injectJavaScript(
        `typeof movePinTo!=='undefined'&&movePinTo(${c.lat},${c.lng});true`
      );
    })();
  }, [visible]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const coords = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number };
      setPendingCoords(coords);
    } catch { /* ignore */ }
  };

  const handleConfirm = async () => {
    if (!pendingCoords) return;
    setConfirming(true);
    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${pendingCoords.lat},${pendingCoords.lng}.json?key=${TOMTOM_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      const addr: string =
        json?.addresses?.[0]?.address?.freeformAddress ??
        `${pendingCoords.lat.toFixed(5)}, ${pendingCoords.lng.toFixed(5)}`;
      onConfirm({ address: addr, lat: pendingCoords.lat, lng: pendingCoords.lng });
    } catch {
      onConfirm({
        address: `${pendingCoords.lat.toFixed(5)}, ${pendingCoords.lng.toFixed(5)}`,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.bar}>
          <TouchableOpacity onPress={onCancel} style={styles.barBtn}>
            <Text style={styles.barCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.barTitle}>Pick Location</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.barBtn, styles.barConfirmBtn, (!pendingCoords || confirming) && styles.barConfirmDisabled]}
            disabled={!pendingCoords || confirming}
          >
            {confirming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.barConfirm}>Confirm</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Map */}
        <WebView
          ref={webRef}
          source={{ html: buildHTML(mapCenter.lat, mapCenter.lng, TOMTOM_KEY) }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onMessage={handleMessage}
        />

        {/* Bottom hint */}
        <View style={[styles.hint, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.hintText}>
            {pendingCoords
              ? `Pin: ${pendingCoords.lat.toFixed(5)}, ${pendingCoords.lng.toFixed(5)}`
              : 'Tap on the map to set the pin location'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#fff' },
  bar:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  barBtn:           { minWidth: 70 },
  barTitle:         { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  barCancel:        { fontSize: 15, color: '#888' },
  barConfirmBtn:    { backgroundColor: '#f0a92d', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  barConfirmDisabled:{ opacity: 0.45 },
  barConfirm:       { fontSize: 15, color: '#fff', fontWeight: '700' },
  map:              { flex: 1 },
  hint:             { backgroundColor: '#F4F6F4', paddingHorizontal: 16, paddingTop: 10 },
  hintText:         { fontSize: 13, color: '#666', textAlign: 'center' },
});
