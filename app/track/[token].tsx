import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { supabase } from '@/lib/supabase';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const PRIMARY = '#f0a92d';

// Get the scheme from app.json - defaults to 'frontend'
const APP_SCHEME = Constants.expoConfig?.scheme ?? 'frontend';

// Fetch route from TomTom Routing API
async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<[number, number][]> {
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pts: { latitude: number; longitude: number }[] = data?.routes?.[0]?.legs?.[0]?.points ?? [];
    return pts.map((p) => [p.latitude, p.longitude]);
  } catch {
    return [];
  }
}

type Package = {
  ID: string;
  STATUS: string | null;
  PICKUP_ADDRESS: string | null;
  PICKUP_LAT: number | null;
  PICKUP_LNG: number | null;
  RECIPIENT_ADDRESS: string | null;
  DROPOFF_LAT: number | null;
  DROPOFF_LNG: number | null;
  RECIPIENT_NAME: string | null;
  VEHICLE_TYPE: string | null;
  DRIVER_NAME: string | null;
  DRIVER_PHONE: string | null;
  CREATED_AT: string | null;
  ACCEPTED_AT: string | null;
  COMPLETED_AT: string | null;
  CURRENT_LAT: number | null;
  CURRENT_LNG: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: PRIMARY,
  COMPLETE: '#6B7280',
  CANCELLED: '#EF4444',
};

function buildMapHTML(
  apiKey: string,
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  driverLat: number | null,
  driverLng: number | null,
  routePoints: [number, number][]
): string {
  const centerLat = (pickupLat + dropoffLat) / 2;
  const centerLng = (pickupLng + dropoffLng) / 2;

  // Serialize route points for JS
  const routePointsStr = routePoints.length > 0 
    ? JSON.stringify(routePoints).replace(/\[/g, '[').replace(/\]/g, ']')
    : '[]';

  let driverMarkerJS = '';
  if (driverLat != null && driverLng != null) {
    driverMarkerJS = `
      var driverArrowHTML = '<div id="driver-arrow" style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear;">' +
        '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="18" cy="18" r="17" fill="#f0a92d" fill-opacity="0.2"/>' +
          '<polygon points="18,4 28,30 18,24 8,30" fill="#f0a92d" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>' +
      '</div>';
      var driverMarker = L.marker([${driverLat}, ${driverLng}], {
        icon: L.divIcon({ className: '', html: driverArrowHTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
      }).addTo(map).bindPopup('Driver');
    `;
  }

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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var K = '${apiKey}';
    var pickupLat = ${pickupLat}, pickupLng = ${pickupLng};
    var dropoffLat = ${dropoffLat}, dropoffLng = ${dropoffLng};
    var driverLat = ${driverLat ?? 'null'}, driverLng = ${driverLng ?? 'null'};
    var routePoints = ${routePointsStr};

    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLat}], 12);

    var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    var ttLayer = L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=' + K + '&tileSize=256', { maxZoom: 22, errorTileUrl: '' });
    osmLayer.addTo(map);
    ttLayer.addTo(map);
    ttLayer.on('tileerror', function() { map.removeLayer(ttLayer); });

    L.control.zoom({ position: 'topright' }).addTo(map);

    var pickupIcon = L.divIcon({
      className: '',
      html: '<div style="width:24px;height:24px;background:#f0a92d;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map).bindPopup('Pickup');

    var dropoffIcon = L.divIcon({
      className: '',
      html: '<div style="width:24px;height:24px;background:#F59E0B;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map).bindPopup('Dropoff');

    // Draw route - use actual route points if available, otherwise straight line
    var routeLine;
    if (routePoints.length > 0) {
      routeLine = L.polyline(routePoints, {
        color: '#f0a92d',
        weight: 5,
        opacity: 0.75,
        lineJoin: 'round'
      }).addTo(map);
    } else {
      routeLine = L.polyline([[pickupLat, pickupLng], [dropoffLat, dropoffLng]], {
        color: '#f0a92d',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(map);
    }
    map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

    ${driverMarkerJS}

    window.updateDriverPosition = function(lat, lng) {
      if (typeof driverMarker !== 'undefined') {
        driverMarker.setLatLng([lat, lng]);
      } else {
        var driverArrowHTML = '<div id="driver-arrow" style="width:36px;height:36px;transform:rotate(0deg);transition:transform 0.25s linear;">' +
          '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="18" cy="18" r="17" fill="#f0a92d" fill-opacity="0.2"/>' +
            '<polygon points="18,4 28,30 18,24 8,30" fill="#f0a92d" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
          '</svg>' +
        '</div>';
        driverMarker = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: driverArrowHTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
        }).addTo(map).bindPopup('Driver');
      }
    };
  </script>
</body>
</html>`;
}

export default function PublicTrackingScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Package | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [mapHtml, setMapHtml] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setError('Invalid tracking link');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('PACKAGES')
          .select(`
            ID,
            STATUS,
            PICKUP_ADDRESS,
            PICKUP_LAT,
            PICKUP_LNG,
            RECIPIENT_ADDRESS,
            DROPOFF_LAT,
            DROPOFF_LNG,
            RECIPIENT_NAME,
            VEHICLE_TYPE,
            DRIVER_NAME,
            DRIVER_PHONE,
            CREATED_AT,
            ACCEPTED_AT,
            COMPLETED_AT,
            CURRENT_LAT,
            CURRENT_LNG
          `)
          .eq('TRACKING_TOKEN', token)
          .single();

        if (fetchErr || !data) {
          setError('Order not found. Please check the tracking link.');
          setLoading(false);
          return;
        }

        if (!data.PICKUP_LAT || !data.PICKUP_LNG || !data.DROPOFF_LAT || !data.DROPOFF_LNG) {
          setError('Order does not have valid location data.');
          setLoading(false);
          return;
        }

        setOrder(data as Package);
        
        // Fetch route from TomTom
        const route = await fetchRoute(
          data.PICKUP_LAT,
          data.PICKUP_LNG,
          data.DROPOFF_LAT,
          data.DROPOFF_LNG
        );
        if (route.length > 0) {
          setRoutePoints(route);
        }
        
        setMapHtml(
          buildMapHTML(
            TOMTOM_KEY,
            data.PICKUP_LAT,
            data.PICKUP_LNG,
            data.DROPOFF_LAT,
            data.DROPOFF_LNG,
            data.CURRENT_LAT,
            data.CURRENT_LNG,
            route
          )
        );
      } catch (err) {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!order || order.STATUS !== 'IN_PROGRESS' || !order.ID) return;

    const channel = supabase
      .channel(`tracking-${order.ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'PACKAGES',
          filter: `ID=eq.${order.ID}`,
        },
        (payload) => {
          const newLat = payload.new.CURRENT_LAT;
          const newLng = payload.new.CURRENT_LNG;

          if (newLat != null && newLng != null && webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `typeof updateDriverPosition!=="undefined"&&updateDriverPosition(${newLat},${newLng});true`
            );
          }

          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  STATUS: payload.new.STATUS,
                  CURRENT_LAT: newLat,
                  CURRENT_LNG: newLng,
                }
              : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.ID, order?.STATUS]);

  const formatDate = (s: string | null) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return s;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading tracking info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Unable to load order'}</Text>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              // Try to go back, but if that fails, just close the view
              try {
                router.back();
              } catch {
                // If navigation fails (e.g., opened via deep link), do nothing
              }
            }}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = STATUS_LABELS[order.STATUS ?? ''] ?? order.STATUS ?? 'Unknown';
  const statusColor = STATUS_COLORS[order.STATUS ?? ''] ?? '#888';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            try {
              router.back();
            } catch {
              // If navigation fails, just ignore
            }
          }} 
          style={styles.backIcon}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
        />
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: PRIMARY }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>{order.PICKUP_ADDRESS}</Text>
            </View>
          </View>
          <View style={styles.locationConnector} />
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: '#F59E0B' }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Dropoff</Text>
              <Text style={styles.locationAddress}>{order.RECIPIENT_ADDRESS}</Text>
            </View>
          </View>
        </View>

        {order.RECIPIENT_NAME && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recipient</Text>
            <Text style={styles.infoValue}>{order.RECIPIENT_NAME}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Order Date</Text>
          <Text style={styles.infoValue}>{formatDate(order.CREATED_AT)}</Text>
        </View>

        {order.DRIVER_NAME && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver</Text>
            <Text style={styles.infoValue}>{order.DRIVER_NAME}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F2',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#888',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE6DC',
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  mapContainer: {
    height: 280,
    backgroundColor: '#E8EDE8',
  },
  map: {
    flex: 1,
  },
  detailsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationSection: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 15,
    color: '#1A1A1A',
    marginTop: 2,
  },
  locationConnector: {
    width: 2,
    height: 24,
    backgroundColor: '#EDE6DC',
    marginLeft: 5,
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
