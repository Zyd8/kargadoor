import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#f0a92d';

type VehicleRow = {
  ID: string;
  DRIVER_ID: string;
  PLATE: string | null;
  MODEL: string | null;
  TYPE: string | null;
  IS_ACTIVE: boolean;
  IS_APPROVED?: boolean | null;
  REGISTRATION_DOC_URL?: string | null;
};

const VEHICLE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  bike: 'directions-bike',
  motorcycle: 'two-wheeler',
  car: 'directions-car',
  mpv: 'airport-shuttle',
  van: 'airport-shuttle',
  l300: 'local-shipping',
  'small truck': 'local-shipping',
  'large truck': 'local-shipping',
  truck: 'local-shipping',
};

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Multi-vehicle section ────────────────────────────────────────────────────
function VehicleSection({ userId, horizontalPadding = 20 }: { userId: string; horizontalPadding?: number }) {
  const [vehicles, setVehicles]   = useState<VehicleRow[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add-new form state
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [type, setType]   = useState<string>('');
  const [registrationDoc, setRegistrationDoc] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from('VEHICLE')
      .select('ID, DRIVER_ID, PLATE, MODEL, TYPE, IS_ACTIVE, IS_APPROVED, REGISTRATION_DOC_URL')
      .eq('DRIVER_ID', userId);
    if (error) {
      return [];
    }
    return (data ?? []) as VehicleRow[];
  };

  // Fetch vehicle types from PRICING_CONFIG so driver can only choose types that exist in DB
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('PRICING_CONFIG')
        .select('VEHICLE_TYPE')
        .order('VEHICLE_TYPE');
      if (!error && data?.length) {
        const types = data.map((r: { VEHICLE_TYPE: string }) => r.VEHICLE_TYPE.trim()).filter(Boolean);
        setVehicleTypes(types);
        setType((prev) => (types.length && !types.includes(prev) ? types[0] : prev));
      }
    })();
  }, []);

  const fetchVehicles = async () => {
    const list = await loadVehicles();
    setVehicles(list);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadVehicles();
      if (!mounted) return;
      const list = Array.isArray(data) ? (data as VehicleRow[]) : [];

      // Migration fix: if there are vehicles but none is active, auto-activate the first one.
      // This handles drivers who had vehicles before IS_ACTIVE column was added.
      const hasActive = list.some((v) => v.IS_ACTIVE);
      if (list.length > 0 && !hasActive) {
        await supabase.rpc('set_active_vehicle', {
          p_vehicle_id: list[0].ID,
          p_driver_id: userId,
        });
        setVehicles(list.map((v, i) => ({ ...v, IS_ACTIVE: i === 0 })));
      } else {
        setVehicles(list);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleSetActive = async (v: VehicleRow) => {
    if (v.IS_ACTIVE) return;
    setSettingId(v.ID);
    const { data: result, error } = await supabase.rpc('set_active_vehicle', {
      p_vehicle_id: v.ID,
      p_driver_id: userId,
    });
    setSettingId(null);
    if (error || !result?.ok) {
      Alert.alert('Error', error?.message ?? result?.error ?? 'Could not set active vehicle.');
      return;
    }
    setVehicles(prev => prev.map(x => ({ ...x, IS_ACTIVE: x.ID === v.ID })));
  };

  const handleDelete = (v: VehicleRow) => {
    Alert.alert(
      'Remove Vehicle',
      `Remove ${v.PLATE ?? 'this vehicle'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(v.ID);
            const { data: result, error } = await supabase.rpc('delete_vehicle', {
              p_vehicle_id: v.ID,
              p_driver_id: userId,
            });
            setDeletingId(null);
            if (error || !result?.ok) {
              Alert.alert('Error', error?.message ?? result?.error ?? 'Could not remove vehicle.');
              return;
            }
            const updated = vehicles.filter(x => x.ID !== v.ID);
            // If deleted was active and others remain, auto-activate first
            if (v.IS_ACTIVE && updated.length > 0) {
              await supabase.rpc('set_active_vehicle', { p_vehicle_id: updated[0].ID, p_driver_id: userId });
              setVehicles(updated.map((x, i) => ({ ...x, IS_ACTIVE: i === 0 })));
            } else {
              setVehicles(updated);
            }
          },
        },
      ]
    );
  };

  const handleAddVehicle = async () => {
    if (!type) {
      Alert.alert('No vehicle types', 'No vehicle types are configured in PRICING_CONFIG yet.');
      return;
    }
    if (!registrationDoc) {
      Alert.alert('Required document', 'Please upload the registration document for this vehicle.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('upsert_vehicle', {
      p_driver_id: userId,
      p_plate: plate.trim() ? plate.trim().toUpperCase() : null,
      p_model: model.trim() || null,
      p_type: type,
      p_vehicle_id: null,
    });
    if (error) {
      setSaving(false);
      Alert.alert('Error', error.message);
      return;
    }

    try {
      const ext = registrationDoc.name.includes('.') ? registrationDoc.name.split('.').pop() : 'bin';
      const objectPath = `${userId}/vehicle-${Date.now()}.${ext}`;
      const response = await fetch(registrationDoc.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('vehicle-documents')
        .upload(objectPath, arrayBuffer, {
          contentType: registrationDoc.mimeType,
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      const docUrl = supabase.storage.from('vehicle-documents').getPublicUrl(objectPath).data.publicUrl;
      if (data?.ID) {
        const { error: updateErr } = await supabase
          .from('VEHICLE')
          .update({
            REGISTRATION_DOC_URL: docUrl,
            IS_APPROVED: false,
          })
          .eq('ID', data.ID);
        if (updateErr) throw updateErr;
      }
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Upload error', err?.message ?? 'Could not upload vehicle registration document.');
      return;
    }
    setSaving(false);

    // If this is the first vehicle, auto-set it as active
    if (vehicles.length === 0 && data?.ID) {
      await supabase.rpc('set_active_vehicle', { p_vehicle_id: data.ID, p_driver_id: userId });
    }

    setAddingNew(false);
    setPlate(''); setModel(''); setType(vehicleTypes[0] ?? '');
    setRegistrationDoc(null);
    fetchVehicles();
  };

  if (loading) {
    return (
      <View style={[styles.sectionCard, { marginHorizontal: horizontalPadding }]}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={[styles.sectionCard, { marginHorizontal: horizontalPadding }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Vehicles</Text>
      </View>

      {vehicles.length === 0 && !addingNew && (
        <View style={styles.noVehicleWarn}>
          <MaterialIcons name="warning-amber" size={18} color="#92400E" />
          <Text style={styles.noVehicleWarnText}>
            Add a vehicle to start accepting orders
          </Text>
        </View>
      )}

      {/* Vehicle list */}
      {vehicles.map((v) => {
        const icon = VEHICLE_ICON[v.TYPE ?? ''] ?? 'local-shipping';
        const isDeleting = deletingId === v.ID;
        const isSetting  = settingId === v.ID;
        return (
          <TouchableOpacity
            key={v.ID}
            style={[styles.vehicleRow, v.IS_ACTIVE && styles.vehicleRowActive]}
            onPress={() => handleSetActive(v)}
            activeOpacity={0.7}
            disabled={isSetting || isDeleting}
          >
            {/* Radio indicator */}
            <View style={[styles.radio, v.IS_ACTIVE && styles.radioActive]}>
              {v.IS_ACTIVE && <View style={styles.radioDot} />}
            </View>

            {/* Icon */}
            <View style={[styles.vehicleIconCircle, v.IS_ACTIVE && { backgroundColor: PRIMARY + '18' }]}>
              {isSetting
                ? <ActivityIndicator size="small" color={PRIMARY} />
                : <MaterialIcons name={icon} size={22} color={v.IS_ACTIVE ? PRIMARY : '#888'} />
              }
            </View>

            {/* Info */}
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleType, v.IS_ACTIVE && { color: PRIMARY }]} numberOfLines={1}>
                {(v.TYPE ?? 'Vehicle').charAt(0).toUpperCase() + (v.TYPE ?? 'vehicle').slice(1)}
                {v.IS_ACTIVE ? '  ·  Active' : ''}
              </Text>
              <Text style={styles.vehiclePlate} numberOfLines={1}>{v.PLATE ?? '—'}</Text>
              {v.MODEL ? <Text style={styles.vehicleModel} numberOfLines={1}>{v.MODEL}</Text> : null}
              <Text style={styles.vehicleStatus}>
                {v.IS_APPROVED === true ? 'Approval: Approved' : 'Approval: Pending'}
              </Text>
            </View>

            {/* Delete */}
            {isDeleting
              ? <ActivityIndicator size="small" color="#EF4444" />
              : (
                <TouchableOpacity
                  onPress={() => handleDelete(v)}
                  hitSlop={12}
                  disabled={isSetting}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )
            }
          </TouchableOpacity>
        );
      })}

      {/* Add vehicle form */}
      {addingNew ? (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>New Vehicle</Text>

          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.typeRowWrap}>
            {vehicleTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, type === t && styles.typePillActive]}
                onPress={() => setType(t)}
                activeOpacity={0.7}
              >
                <MaterialIcons name={VEHICLE_ICON[t] ?? 'directions-car'} size={16} color={type === t ? '#fff' : '#888'} />
                <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Plate Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={plate}
            onChangeText={setPlate}
            placeholder="e.g. ABC 1234"
            placeholderTextColor="#AAA"
            autoCapitalize="characters"
          />

          <Text style={styles.fieldLabel}>Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Honda Click 125"
            placeholderTextColor="#AAA"
          />

          <Text style={styles.fieldLabel}>Registration Document</Text>
          <TouchableOpacity
            style={styles.docUploadBtn}
            onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/jpeg', 'image/png'],
                copyToCacheDirectory: true,
                multiple: false,
              });
              if (result.canceled || !result.assets[0]) return;
              const asset = result.assets[0];
              setRegistrationDoc({
                uri: asset.uri,
                name: asset.name ?? 'registration-document.pdf',
                mimeType: asset.mimeType ?? 'application/octet-stream',
              });
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="upload-file" size={18} color={PRIMARY} />
            <Text style={styles.docUploadBtnText}>
              {registrationDoc ? registrationDoc.name : 'Upload registration document'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.docUploadHint}>Accepted: PDF, JPG, PNG</Text>

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setAddingNew(false); setPlate(''); setModel(''); setType(vehicleTypes[0] ?? 'motorcycle'); setRegistrationDoc(null); }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAddVehicle}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addVehicleBtn}
          onPress={() => {
            setAddingNew(true);
            if (vehicleTypes.length) {
              setType(vehicleTypes.includes(type) ? type : vehicleTypes[0]);
            }
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={18} color={PRIMARY} />
          <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
const MAX_CONTENT_WIDTH = 480;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { user, signOut, debugBypass, setDebugBypass, userRole } = useAuth();
  const isDriver = userRole === 'DRIVER';

  const padH = Math.max(16, Math.min(24, width * 0.055));
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const contentPadH = width > MAX_CONTENT_WIDTH ? Math.max(padH, (width - contentWidth) / 2) : padH;

  const [fullName, setFullName]   = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('PROFILE')
      .select('FULL_NAME, AVATAR_URL')
      .eq('ID', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.FULL_NAME) setFullName(data.FULL_NAME);
        if (data?.AVATAR_URL) setAvatarUrl(data.AVATAR_URL);
      });
  }, [user?.id]);

  const handleChangeAvatar = async () => {
    if (!user?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setUploadingAvatar(true);
    try {
      const bytes = base64ToBytes(result.assets[0].base64!);
      const path  = `${user.id}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      // Bust cache with timestamp
      const urlWithBust = `${url}?t=${Date.now()}`;
      await supabase.from('PROFILE').update({ AVATAR_URL: url }).eq('ID', user.id);
      setAvatarUrl(urlWithBust);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUseWithAccount = () => {
    setDebugBypass(false);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: contentPadH }]}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: contentPadH, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Avatar + identity */}
        <View style={styles.avatarRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.85}
          >
            {uploadingAvatar ? (
              <View style={styles.avatar}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <MaterialIcons name={isDriver ? 'local-shipping' : 'person'} size={44} color="#fff" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          {fullName ? (
            <Text style={styles.fullName} numberOfLines={1} ellipsizeMode="tail">{fullName}</Text>
          ) : null}
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">
            {debugBypass ? 'Using without account' : (user?.email ?? '—')}
          </Text>
          {!debugBypass && (
            <View style={styles.roleBadge}>
              <MaterialIcons name={isDriver ? 'local-shipping' : 'person'} size={14} color={PRIMARY} />
              <Text style={styles.roleText}>{isDriver ? 'Driver' : 'User'}</Text>
            </View>
          )}
          {debugBypass && (
            <Text style={styles.bypassBadge}>Email / sign up skipped</Text>
          )}
        </View>

        {/* Vehicle section (DRIVER only) */}
        {isDriver && user && <VehicleSection userId={user.id} horizontalPadding={0} />}

        {/* Actions */}
        {debugBypass && (
          <TouchableOpacity
            style={styles.useWithAccountBtn}
            onPress={handleUseWithAccount}
            activeOpacity={0.8}
          >
            <MaterialIcons name="login" size={20} color={PRIMARY} />
            <Text style={styles.useWithAccountText}>Use with account</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.signOutText}>{debugBypass ? 'Sign out (leave app)' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F6F2' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EDE6DC', backgroundColor: '#fff' },
  title:  { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  scroll: { paddingBottom: 40, flexGrow: 1 },

  avatarRow:   { alignItems: 'center', marginTop: 36, marginBottom: 24, paddingHorizontal: 20 },
  avatarWrap:  { position: 'relative', marginBottom: 14 },
  avatar:      { width: 88, height: 88, borderRadius: 44, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarImg:   { width: 88, height: 88, borderRadius: 44 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8F6F2',
  },
  fullName:   { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  email:      { fontSize: 14, color: '#888', fontWeight: '400' },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FEF5E6', borderRadius: 20, borderWidth: 1, borderColor: PRIMARY },
  roleText:   { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  bypassBadge:{ fontSize: 12, color: '#888', marginTop: 4 },

  // Vehicle section
  sectionCard:   { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  noVehicleWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14 },
  noVehicleWarnText: { fontSize: 13, color: '#92400E', fontWeight: '500', flex: 1 },

  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8',
    backgroundColor: '#FAFAFA', marginBottom: 10,
  },
  vehicleRowActive: { borderColor: PRIMARY, backgroundColor: '#FFF8ED' },
  vehicleInfo: { flex: 1, minWidth: 0 },

  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center' },
  radioActive:{ borderColor: PRIMARY },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },

  vehicleIconCircle: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#FEF5E6', alignItems: 'center', justifyContent: 'center' },
  vehicleType:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  vehiclePlate:  { fontSize: 13, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  vehicleModel:  { fontSize: 12, color: '#888', marginTop: 2 },
  vehicleStatus: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '600' },

  addVehicleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: PRIMARY, borderStyle: 'dashed' },
  addVehicleBtnText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },

  addForm:       { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  addFormTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8E8E8', marginBottom: 14 },
  docUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 10, backgroundColor: '#FFFAF2', paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  docUploadBtnText: { flex: 1, fontSize: 13, color: '#5F4A2A', fontWeight: '600' },
  docUploadHint: { fontSize: 11, color: '#AAA', marginBottom: 14 },

  typeRow:            { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeRowWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typePill:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: 'transparent' },
  typePillActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typePillText:       { fontSize: 13, color: '#888', fontWeight: '500' },
  typePillTextActive: { color: '#fff', fontWeight: '700' },

  editActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  cancelBtnText:{ fontSize: 14, color: '#666', fontWeight: '600' },
  saveBtn:      { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center' },
  saveBtnText:  { fontSize: 14, color: '#fff', fontWeight: '700' },

  useWithAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 16, backgroundColor: '#FEF5E6', borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: PRIMARY },
  useWithAccountText:{ color: PRIMARY, fontSize: 15, fontWeight: '700' },
  signOutBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, padding: 16, justifyContent: 'center' },
  signOutText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});
