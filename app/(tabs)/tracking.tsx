import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { CARTO_LIGHT_TILE_URL } from '@/lib/map-tiles';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

function buildMapHTML(apiKey: string, lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #map { width: 100%; height: 100%; }

    /* ── Navigation panel (commented out for now) ──────────────────────
    #recalc-banner { ... }
    #panel { ... }
    ── end navigation panel ─────────────────────────────────────────── */
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Navigation panel — disabled until connected to active delivery
  <div id="recalc-banner">Recalculating route\u2026</div>
  <div id="panel">
    <div id="wrap">
      <input id="dest" type="text" placeholder="Search destination..." autocomplete="off" />
      <div id="sugg"></div>
    </div>
    <button id="go">Get Route</button>
    <div id="status"></div>
  </div>
  -->

  <script>
    var K      = '${apiKey}';
    var curLat = ${lat}, curLng = ${lng};
    var arrowEl = null;

    // ── Map (no attribution watermark) ───────────────────────────────────
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([curLat, curLng], 16);

    L.tileLayer('${CARTO_LIGHT_TILE_URL}',{maxZoom:19}).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // ── User arrow marker ────────────────────────────────────────────────
    var arrowHTML =
      '<div id="user-arrow" style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear;">' +
        '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="18" cy="18" r="17" fill="#f0a92d" fill-opacity="0.2"/>' +
          '<polygon points="18,4 28,30 18,24 8,30" fill="#f0a92d" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>' +
      '</div>';

    var userMarker = L.marker([curLat, curLng], {
      icon: L.divIcon({ className: '', html: arrowHTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
    }).addTo(map);

    map.whenReady(function() { arrowEl = document.getElementById('user-arrow'); });

    // ── Called by RN: GPS position update ────────────────────────────────
    window.updatePosition = function(lat, lng) {
      curLat = lat; curLng = lng;
      userMarker.setLatLng([lat, lng]);
      // Off-route detection disabled — re-enable when active delivery is assigned
      // if (destCoord && routePoints.length > 0) { ... }
    };

    // ── Called by RN: compass heading update ─────────────────────────────
    window.updateHeading = function(deg) {
      if (arrowEl) arrowEl.style.transform = 'rotate(' + deg + 'deg)';
      map.setView([curLat, curLng], map.getZoom(), { animate: true, duration: 0.4, noMoveStart: true });
    };

    /* ── Navigation (route calculation) — disabled for now ────────────────
    var routeLine = null, destMarker = null, destCoord = null;
    var routePoints = [], lastRecalcTime = 0, timer = null;

    function haverDist(la1, lo1, la2, lo2) { ... }
    function minDistToRoute(lat, lng) { ... }
    async function calcRoute(fromLat, fromLng) { ... }
    async function recalcRoute() { ... }
    function doSearch(q) { ... }
    ── end navigation ─────────────────────────────────────────────────── */
  </script>
</body>
</html>`;
}

export default function TrackingScreen() {
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [permissionError, setPermErr] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    let posSub:     Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setPermErr(true);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          webViewRef.current?.injectJavaScript(
            'typeof updatePosition!=="undefined"&&updatePosition(' + latitude + ',' + longitude + ');true'
          );
        }
      );

      headingSub = await Location.watchHeadingAsync((h) => {
        const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        webViewRef.current?.injectJavaScript(
          'typeof updateHeading!=="undefined"&&updateHeading(' + deg + ');true'
        );
      });
    })();

    return () => {
      posSub?.remove();
      headingSub?.remove();
    };
  }, []);

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f0a92d" />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {permissionError && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Location access denied — showing Manila</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: buildMapHTML(TOMTOM_KEY, coords.lat, coords.lng) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff' },
  webview:     { flex: 1 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  banner:      { backgroundColor: '#FFF3CD', paddingVertical: 8, paddingHorizontal: 16 },
  bannerText:  { color: '#856404', fontSize: 13 },
});
