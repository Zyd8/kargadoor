import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

// Manila, PH fallback
const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

// Tile URL: https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=KEY&tileSize=256
// Search:   https://api.tomtom.com/search/2/search/{query}.json?key=KEY&lat=&lon=&radius=50000
// Routing:  https://api.tomtom.com/routing/1/calculateRoute/{lat,lng}:{lat,lng}/json?key=KEY
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

    #panel {
      position: fixed;
      bottom: 24px;
      left: 12px;
      right: 12px;
      background: #fff;
      border-radius: 20px;
      padding: 14px;
      box-shadow: 0 4px 28px rgba(0,0,0,0.18);
      z-index: 1000;
    }
    #wrap { position: relative; }
    #dest {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #E8E8E8;
      border-radius: 12px;
      font-size: 15px;
      outline: none;
      box-sizing: border-box;
      background: #FAFAFA;
      color: #222;
    }
    #dest:focus { border-color: #FF6B35; background: #fff; }
    #go {
      margin-top: 10px;
      width: 100%;
      padding: 14px;
      background: #FF6B35;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }
    #go:disabled { background: #D0D0D0; }
    #status { margin-top: 8px; font-size: 13px; color: #666; text-align: center; min-height: 18px; }

    #sugg {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0; right: 0;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.14);
      max-height: 230px;
      overflow-y: auto;
      z-index: 2000;
    }
    .si { padding: 11px 14px; border-bottom: 1px solid #F4F4F4; cursor: pointer; }
    .si:last-child { border-bottom: none; }
    .si:active { background: #FFF5F2; }
    .sn { font-size: 14px; font-weight: 600; color: #1A1A1A; }
    .sa { font-size: 12px; color: #999; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="panel">
    <div id="wrap">
      <input id="dest" type="text" placeholder="Search destination..." autocomplete="off" />
      <div id="sugg"></div>
    </div>
    <button id="go">Get Route</button>
    <div id="status"></div>
  </div>

  <script>
    const K = '${apiKey}';
    const ULat = ${lat}, ULng = ${lng};

    // --- Map setup (Leaflet + TomTom raster tiles) ---
    const map = L.map('map', { zoomControl: false }).setView([ULat, ULng], 15);

    // Try TomTom tiles; if they 403/404 (plan restriction) the OSM fallback below stays visible
    var tomtomLayer = L.tileLayer(
      'https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=' + K + '&tileSize=256',
      { maxZoom: 22, attribution: '\\u00a9 TomTom', errorTileUrl: '' }
    );
    var osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '\\u00a9 OpenStreetMap contributors' }
    );
    // Add OSM as base, then TomTom on top so TomTom shows when available
    osmLayer.addTo(map);
    tomtomLayer.addTo(map);
    tomtomLayer.on('tileerror', function() { map.removeLayer(tomtomLayer); });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // User location marker
    L.marker([ULat, ULng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#FF6B35;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(255,107,53,.5);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
    }).addTo(map);

    // --- State ---
    let routeLine = null, destMarker = null, destCoord = null, timer = null;

    const inp    = document.getElementById('dest');
    const sugg   = document.getElementById('sugg');
    const status = document.getElementById('status');
    const go     = document.getElementById('go');

    // --- Search ---
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      destCoord = null;
      const q = inp.value.trim();
      if (q.length < 3) { hideSugg(); return; }
      timer = setTimeout(() => doSearch(q), 420);
    });

    async function doSearch(q) {
      try {
        const url = 'https://api.tomtom.com/search/2/search/'
          + encodeURIComponent(q)
          + '.json?key=' + K
          + '&lat=' + ULat + '&lon=' + ULng
          + '&radius=50000&limit=5&typeahead=true';
        const res = await fetch(url);
        const data = await res.json();
        const items = data.results || [];
        if (!items.length) { hideSugg(); return; }

        sugg.innerHTML = items.map((x, i) =>
          '<div class="si" data-i="' + i + '">' +
            '<div class="sn">' + (x.poi && x.poi.name ? x.poi.name : (x.address && x.address.freeformAddress ? x.address.freeformAddress : 'Place')) + '</div>' +
            '<div class="sa">' + (x.address && x.address.freeformAddress ? x.address.freeformAddress : '') + '</div>' +
          '</div>'
        ).join('');
        sugg.style.display = 'block';

        sugg.querySelectorAll('.si').forEach(function(el) {
          el.addEventListener('click', function() {
            var x = items[+el.getAttribute('data-i')];
            inp.value = (x.poi && x.poi.name) ? x.poi.name : (x.address && x.address.freeformAddress ? x.address.freeformAddress : '');
            destCoord = { lat: x.position.lat, lng: x.position.lon };
            hideSugg();
            status.textContent = '';
          });
        });
      } catch(e) { hideSugg(); }
    }

    function hideSugg() { sugg.style.display = 'none'; sugg.innerHTML = ''; }
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#panel')) hideSugg();
    });

    // --- Routing ---
    go.addEventListener('click', async function() {
      if (!destCoord) { status.textContent = 'Please pick a destination from the list.'; return; }
      status.textContent = 'Calculating\u2026';
      go.disabled = true;
      try {
        const url = 'https://api.tomtom.com/routing/1/calculateRoute/'
          + ULat + ',' + ULng + ':'
          + destCoord.lat + ',' + destCoord.lng
          + '/json?key=' + K + '&routeType=fastest&travelMode=car';
        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes && data.routes[0];
        if (!route) throw new Error('No route');

        // points uses latitude/longitude (not lat/lng)
        var pts = route.legs[0].points.map(function(p) { return [p.latitude, p.longitude]; });

        if (routeLine)  { map.removeLayer(routeLine);  routeLine  = null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }

        routeLine = L.polyline(pts, { color: '#FF6B35', weight: 5, opacity: 0.9 }).addTo(map);

        destMarker = L.marker([destCoord.lat, destCoord.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:14px;height:14px;background:#FF6B35;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });

        var s = route.summary;
        var mins = Math.round(s.travelTimeInSeconds / 60);
        var km   = (s.lengthInMeters / 1000).toFixed(1);
        status.textContent = mins + ' min \u00b7 ' + km + ' km';
      } catch(e) {
        status.textContent = 'Could not calculate route. Try again.';
      } finally {
        go.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setPermissionError(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permissionError && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Location access denied — showing Manila</Text>
        </View>
      )}
      <WebView
        source={{ html: buildMapHTML(TOMTOM_KEY, coords.lat, coords.lng) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  banner: { backgroundColor: '#FFF3CD', paddingVertical: 8, paddingHorizontal: 16 },
  bannerText: { color: '#856404', fontSize: 13 },
});
