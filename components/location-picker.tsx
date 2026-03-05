/**
 * LocationPicker
 * Text input with TomTom autocomplete suggestions + optional map pin-drop modal.
 * Returns { address, lat, lng } to the parent.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import LocationMapModal, { PickedLocation } from '@/components/location-map-modal';

const TOMTOM_KEY = Constants.expoConfig?.extra?.tomtomApiKey ?? '';
const PRIMARY    = '#f0a92d';
const PLACEHOLDER = '#A0A0A0';

export type LocationValue = { address: string; lat: number | null; lng: number | null };

interface Props {
  placeholder: string;
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  showCurrentLocation?: boolean;
}

interface Suggestion {
  id: string;
  address: string;
  lat: number;
  lng: number;
}

export default function LocationPicker({ placeholder, value, onChange, showCurrentLocation }: Props) {
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching]   = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapOpen, setMapOpen]       = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep text input in sync when value is set externally (e.g. GPS / map pick)
  useEffect(() => {
    if (value.address !== query) setQuery(value.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.address]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    // Clear parent value coords when user is typing manually
    onChange({ address: text, lat: null, lng: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350);
  };

  const fetchSuggestions = async (q: string) => {
    setSearching(true);
    try {
      const url =
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json` +
        `?key=${TOMTOM_KEY}&typeahead=true&limit=5&countrySet=PH`;
      const res  = await fetch(url);
      const json = await res.json();
      const items: Suggestion[] = (json.results ?? []).map((r: any) => ({
        id:      r.id ?? `${r.position.lat},${r.position.lon}`,
        address: r.address?.freeformAddress ?? r.poi?.name ?? q,
        lat:     r.position.lat,
        lng:     r.position.lon,
      }));
      setSuggestions(items);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = (s: Suggestion) => {
    setSuggestions([]);
    setQuery(s.address);
    onChange({ address: s.address, lat: s.lat, lng: s.lng });
  };

  const useCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;

      // Reverse geocode
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}`;
        const res  = await fetch(url);
        const json = await res.json();
        address = json?.addresses?.[0]?.address?.freeformAddress ?? address;
      } catch { /* use coords as fallback */ }

      setQuery(address);
      setSuggestions([]);
      onChange({ address, lat, lng });
    } finally {
      setGpsLoading(false);
    }
  };

  const handleMapConfirm = (loc: PickedLocation) => {
    setMapOpen(false);
    setQuery(loc.address);
    setSuggestions([]);
    onChange({ address: loc.address, lat: loc.lat, lng: loc.lng });
  };

  const hasCoords = value.lat != null && value.lng != null;

  return (
    <View style={styles.wrapper}>
      {/* Main input row */}
      <View style={[styles.inputRow, hasCoords && styles.inputRowConfirmed]}>
        <MaterialIcons
          name={hasCoords ? 'check-circle' : 'place'}
          size={20}
          color={hasCoords ? PRIMARY : PLACEHOLDER}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          value={query}
          onChangeText={handleChangeText}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={PLACEHOLDER} style={{ marginRight: 6 }} />}
        {/* Map pin button */}
        <TouchableOpacity onPress={() => setMapOpen(true)} hitSlop={8} style={styles.mapBtn}>
          <MaterialIcons name="map" size={20} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* "Use current location" button (pickup only) */}
      {showCurrentLocation && (
        <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={gpsLoading} activeOpacity={0.7}>
          {gpsLoading
            ? <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 6 }} />
            : <MaterialIcons name="my-location" size={16} color={PRIMARY} style={{ marginRight: 6 }} />
          }
          <Text style={styles.gpsBtnText}>Use my current location</Text>
        </TouchableOpacity>
      )}

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.suggRow, index < suggestions.length - 1 && styles.suggRowBorder]}
                onPress={() => selectSuggestion(item)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="place" size={16} color="#AAA" style={{ marginRight: 8 }} />
                <Text style={styles.suggText} numberOfLines={2}>{item.address}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map modal */}
      <LocationMapModal
        visible={mapOpen}
        initialLat={value.lat}
        initialLng={value.lng}
        onConfirm={handleMapConfirm}
        onCancel={() => setMapOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:           { marginBottom: 12 },
  inputRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: '#EDE6DC' },
  inputRowConfirmed: { borderColor: PRIMARY, borderWidth: 1.5 },
  inputIcon:         { marginRight: 10 },
  textInput:         { flex: 1, fontSize: 15, color: '#1A1A1A' },
  mapBtn:            { paddingLeft: 8 },
  gpsBtn:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4 },
  gpsBtnText:        { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  dropdown:          { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EDE6DC', overflow: 'hidden', marginTop: 2 },
  suggRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  suggRowBorder:     { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  suggText:          { flex: 1, fontSize: 14, color: '#333' },
});
