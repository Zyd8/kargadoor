import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

// Tile URL:   https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=KEY
// Search:     https://api.tomtom.com/search/2/search/{q}.json?key=KEY&lat=&lon=
// Routing:    https://api.tomtom.com/routing/1/calculateRoute/{lat,lng}:{lat,lng}/json?key=KEY
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

    #recalc-banner {
      display: none;
      position: fixed; top: 12px; left: 50%;
      transform: translateX(-50%);
      background: #FF6B35; color: #fff;
      padding: 8px 18px; border-radius: 20px;
      font-size: 13px; font-weight: 600;
      z-index: 2000; white-space: nowrap;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    #panel {
      position: fixed; bottom: 24px; left: 12px; right: 12px;
      background: #fff; border-radius: 20px; padding: 14px;
      box-shadow: 0 4px 28px rgba(0,0,0,0.18); z-index: 1000;
    }
    #wrap { position: relative; }
    #dest {
      width: 100%; padding: 12px 14px;
      border: 1.5px solid #E8E8E8; border-radius: 12px;
      font-size: 15px; outline: none; box-sizing: border-box;
      background: #FAFAFA; color: #222;
    }
    #dest:focus { border-color: #FF6B35; background: #fff; }
    #go {
      margin-top: 10px; width: 100%; padding: 14px;
      background: #FF6B35; color: #fff; border: none;
      border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
    }
    #go:disabled { background: #D0D0D0; }
    #status { margin-top: 8px; font-size: 13px; color: #666; text-align: center; min-height: 18px; }
    #sugg {
      display: none; position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
      background: #fff; border-radius: 14px; overflow: hidden;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.14); max-height: 230px; overflow-y: auto; z-index: 2000;
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
  <div id="recalc-banner">Recalculating route\u2026</div>
  <div id="panel">
    <div id="wrap">
      <input id="dest" type="text" placeholder="Search destination..." autocomplete="off" />
      <div id="sugg"></div>
    </div>
    <button id="go">Get Route</button>
    <div id="status"></div>
  </div>

  <script>
    var K      = '${apiKey}';
    var curLat = ${lat}, curLng = ${lng};
    var routeLine = null, destMarker = null, destCoord = null;
    var routePoints = [], lastRecalcTime = 0, timer = null;
    var arrowEl = null;

    // ── Map ──────────────────────────────────────────────────────────────
    var map = L.map('map', { zoomControl: false }).setView([curLat, curLng], 16);

    var osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '\\u00a9 OpenStreetMap contributors' }
    );
    var ttLayer = L.tileLayer(
      'https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=' + K + '&tileSize=256',
      { maxZoom: 22, attribution: '\\u00a9 TomTom', errorTileUrl: '' }
    );
    osmLayer.addTo(map);
    ttLayer.addTo(map);
    ttLayer.on('tileerror', function() { map.removeLayer(ttLayer); });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // ── User arrow marker ────────────────────────────────────────────────
    // SVG upward-pointing arrow; rotation applied via updateHeading()
    var arrowHTML =
      '<div id="user-arrow" style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear;">' +
        '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="18" cy="18" r="17" fill="#FF6B35" fill-opacity="0.2"/>' +
          '<polygon points="18,4 28,30 18,24 8,30" fill="#FF6B35" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>' +
      '</div>';

    var userMarker = L.marker([curLat, curLng], {
      icon: L.divIcon({ className: '', html: arrowHTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
    }).addTo(map);

    // grab the element after Leaflet adds it to the DOM
    map.whenReady(function() { arrowEl = document.getElementById('user-arrow'); });

    // ── Called by RN: GPS position update ────────────────────────────────
    window.updatePosition = function(lat, lng) {
      curLat = lat; curLng = lng;
      userMarker.setLatLng([lat, lng]);

      // Off-route check — reroute if > 50 m away, at most once per 30 s
      if (destCoord && routePoints.length > 0) {
        var now = Date.now();
        if (now - lastRecalcTime > 30000 && minDistToRoute(lat, lng) > 50) {
          lastRecalcTime = now;
          recalcRoute();
        }
      }
    };

    // ── Called by RN: compass heading update ─────────────────────────────
    window.updateHeading = function(deg) {
      if (arrowEl) arrowEl.style.transform = 'rotate(' + deg + 'deg)';
      // Smoothly re-centre map on user as they move
      map.setView([curLat, curLng], map.getZoom(), { animate: true, duration: 0.4, noMoveStart: true });
    };

    // ── Distance helpers ─────────────────────────────────────────────────
    function haverDist(la1, lo1, la2, lo2) {
      var R = 6371000;
      var dLa = (la2 - la1) * Math.PI / 180;
      var dLo = (lo2 - lo1) * Math.PI / 180;
      var a = Math.sin(dLa/2)*Math.sin(dLa/2) +
              Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function minDistToRoute(lat, lng) {
      var min = Infinity;
      for (var i = 0; i < routePoints.length; i++) {
        var d = haverDist(lat, lng, routePoints[i][0], routePoints[i][1]);
        if (d < min) min = d;
      }
      return min;
    }

    // ── Route calculation ────────────────────────────────────────────────
    async function calcRoute(fromLat, fromLng) {
      var url = 'https://api.tomtom.com/routing/1/calculateRoute/' +
        fromLat + ',' + fromLng + ':' + destCoord.lat + ',' + destCoord.lng +
        '/json?key=' + K + '&routeType=fastest&travelMode=car';
      var data  = await (await fetch(url)).json();
      var route = data.routes && data.routes[0];
      if (!route) throw new Error('no route');

      var pts = route.legs[0].points.map(function(p) { return [p.latitude, p.longitude]; });
      routePoints = pts;

      if (routeLine)  { map.removeLayer(routeLine);  routeLine  = null; }
      if (destMarker) { map.removeLayer(destMarker); destMarker = null; }

      routeLine = L.polyline(pts, { color: '#FF6B35', weight: 5, opacity: 0.9 }).addTo(map);
      destMarker = L.marker([destCoord.lat, destCoord.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:#FF6B35;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
      }).addTo(map);

      var s = route.summary;
      document.getElementById('status').textContent =
        Math.round(s.travelTimeInSeconds / 60) + ' min \u00b7 ' + (s.lengthInMeters / 1000).toFixed(1) + ' km';

      return pts;
    }

    async function recalcRoute() {
      var banner = document.getElementById('recalc-banner');
      banner.style.display = 'block';
      try { await calcRoute(curLat, curLng); }
      catch(e) { /* keep old route if recalc fails */ }
      finally { banner.style.display = 'none'; }
    }

    // ── Search ───────────────────────────────────────────────────────────
    var inp    = document.getElementById('dest');
    var sugg   = document.getElementById('sugg');
    var status = document.getElementById('status');
    var go     = document.getElementById('go');

    inp.addEventListener('input', function() {
      clearTimeout(timer); destCoord = null;
      var q = inp.value.trim();
      if (q.length < 3) { hideSugg(); return; }
      timer = setTimeout(function() { doSearch(q); }, 420);
    });

    async function doSearch(q) {
      try {
        var url = 'https://api.tomtom.com/search/2/search/' + encodeURIComponent(q) +
          '.json?key=' + K + '&lat=' + curLat + '&lon=' + curLng + '&radius=50000&limit=5&typeahead=true';
        var items = (await (await fetch(url)).json()).results || [];
        if (!items.length) { hideSugg(); return; }
        sugg.innerHTML = items.map(function(x, i) {
          var name = x.poi && x.poi.name ? x.poi.name : (x.address && x.address.freeformAddress ? x.address.freeformAddress : 'Place');
          var addr = x.address && x.address.freeformAddress ? x.address.freeformAddress : '';
          return '<div class="si" data-i="' + i + '"><div class="sn">' + name + '</div><div class="sa">' + addr + '</div></div>';
        }).join('');
        sugg.style.display = 'block';
        sugg.querySelectorAll('.si').forEach(function(el) {
          el.addEventListener('click', function() {
            var x = items[+el.getAttribute('data-i')];
            inp.value  = x.poi && x.poi.name ? x.poi.name : (x.address && x.address.freeformAddress ? x.address.freeformAddress : '');
            destCoord  = { lat: x.position.lat, lng: x.position.lon };
            hideSugg(); status.textContent = '';
          });
        });
      } catch(e) { hideSugg(); }
    }

    function hideSugg() { sugg.style.display = 'none'; sugg.innerHTML = ''; }
    document.addEventListener('click', function(e) { if (!e.target.closest('#panel')) hideSugg(); });

    // ── Get Route button ─────────────────────────────────────────────────
    go.addEventListener('click', async function() {
      if (!destCoord) { status.textContent = 'Please pick a destination from the list.'; return; }
      status.textContent = 'Calculating\u2026';
      go.disabled = true;
      try {
        var pts = await calcRoute(curLat, curLng);
        map.fitBounds(L.polyline(pts).getBounds(), { padding: [60, 60] });
      } catch(e) {
        status.textContent = 'Could not calculate route. Try again.';
      } finally { go.disabled = false; }
    });
  </script>
</body>
</html>`;
}

export default function MapScreen() {
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

      // One-shot initial fix to show the map immediately
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      // Continuous GPS → moves the dot, triggers off-route checks
      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          webViewRef.current?.injectJavaScript(
            'typeof updatePosition!=="undefined"&&updatePosition(' + latitude + ',' + longitude + ');true'
          );
        }
      );

      // Compass heading → rotates the navigation arrow in real-time
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
        <ActivityIndicator size="large" color="#FF6B35" />
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
  container:   { flex: 1, backgroundColor: '#000' },
  webview:     { flex: 1 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  banner:      { backgroundColor: '#FFF3CD', paddingVertical: 8, paddingHorizontal: 16 },
  bannerText:  { color: '#856404', fontSize: 13 },
});
