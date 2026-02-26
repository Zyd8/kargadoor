import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#1B6B4A';

type VehicleRow = {
  ID: string;
  DRIVER_ID: string;
  PLATE: string | null;
  MODEL: string | null;
  TYPE: string | null;
};

const VEHICLE_TYPES = ['motorcycle', 'car', 'truck'] as const;
const VEHICLE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  motorcycle: 'two-wheeler',
  car:        'directions-car',
  truck:      'local-shipping',
};

function VehicleSection({ userId }: { userId: string }) {
  const [vehicle, setVehicle]   = useState<VehicleRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const [plate, setPlate]   = useState('');
  const [model, setModel]   = useState('');
  const [type, setType]     = useState<string>('motorcycle');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.rpc('get_vehicle', { p_driver_id: userId });
      if (!mounted) return;
      const v = (data != null ? data : null) as VehicleRow | null;
      setVehicle(v);
      if (v) { setPlate(v.PLATE ?? ''); setModel(v.MODEL ?? ''); setType(v.TYPE ?? 'motorcycle'); }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleSave = async () => {
    if (!plate.trim()) { Alert.alert('Required', 'Plate number is required.'); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc('upsert_vehicle', {
      p_driver_id: userId,
      p_plate: plate.trim().toUpperCase(),
      p_model: model.trim() || null,
      p_type: type,
      p_vehicle_id: vehicle?.ID ?? null,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setVehicle((data != null ? data : null) as VehicleRow);
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.sectionCard}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  const icon = VEHICLE_ICON[vehicle?.TYPE ?? type] ?? 'local-shipping';

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
            <MaterialIcons name="edit" size={18} color={PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <>
          {/* Type selector */}
          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.typeRow}>
            {VEHICLE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, type === t && styles.typePillActive]}
                onPress={() => setType(t)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={VEHICLE_ICON[t]}
                  size={16}
                  color={type === t ? '#fff' : '#888'}
                />
                <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Plate Number *</Text>
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

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setEditing(false);
                if (vehicle) { setPlate(vehicle.PLATE ?? ''); setModel(vehicle.MODEL ?? ''); setType(vehicle.TYPE ?? 'motorcycle'); }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      ) : vehicle ? (
        <View style={styles.vehicleDisplay}>
          <View style={styles.vehicleIconCircle}>
            <MaterialIcons name={icon} size={28} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleType}>
              {(vehicle.TYPE ?? 'Vehicle').charAt(0).toUpperCase() + (vehicle.TYPE ?? 'vehicle').slice(1)}
            </Text>
            <Text style={styles.vehiclePlate}>{vehicle.PLATE ?? '—'}</Text>
            {vehicle.MODEL ? <Text style={styles.vehicleModel}>{vehicle.MODEL}</Text> : null}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addVehiclePrompt}
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add-circle-outline" size={24} color={PRIMARY} />
          <Text style={styles.addVehicleText}>Add your vehicle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut, debugBypass, setDebugBypass, userRole } = useAuth();
  const isDriver = userRole === 'DRIVER';

  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('PROFILE')
      .select('FULL_NAME')
      .eq('ID', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.FULL_NAME) setFullName(data.FULL_NAME);
      });
  }, [user?.id]);

  const handleUseWithAccount = () => {
    setDebugBypass(false);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + identity */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <MaterialIcons name={isDriver ? 'local-shipping' : 'person'} size={44} color="#fff" />
          </View>
          {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
          <Text style={styles.email}>
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
        {isDriver && user && <VehicleSection userId={user.id} />}

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
  safe:   { flex: 1, backgroundColor: '#EEF2EE' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E4EAE4', backgroundColor: '#fff' },
  title:  { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  scroll: { paddingBottom: 40 },

  avatarRow:  { alignItems: 'center', marginTop: 36, marginBottom: 24, paddingHorizontal: 20 },
  avatar:     { width: 88, height: 88, borderRadius: 44, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  fullName:   { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  email:      { fontSize: 14, color: '#888', fontWeight: '400' },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: 20, borderWidth: 1, borderColor: PRIMARY },
  roleText:   { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  bypassBadge:{ fontSize: 12, color: '#888', marginTop: 4 },

  // Vehicle section
  sectionCard:   { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  vehicleDisplay:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleIconCircle:{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#EEF2EE', alignItems: 'center', justifyContent: 'center' },
  vehicleType:      { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  vehiclePlate:     { fontSize: 14, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  vehicleModel:     { fontSize: 13, color: '#888', marginTop: 2 },

  addVehiclePrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 8 },
  addVehicleText:   { fontSize: 15, color: PRIMARY, fontWeight: '600' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8E8E8', marginBottom: 14 },

  typeRow:           { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typePill:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: 'transparent' },
  typePillActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typePillText:      { fontSize: 13, color: '#888', fontWeight: '500' },
  typePillTextActive:{ color: '#fff', fontWeight: '700' },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  cancelBtnText:{ fontSize: 14, color: '#666', fontWeight: '600' },
  saveBtn:     { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center' },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  useWithAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 16, backgroundColor: '#E8F5E9', borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: PRIMARY },
  useWithAccountText:{ color: PRIMARY, fontSize: 15, fontWeight: '700' },
  signOutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, marginHorizontal: 20, borderRadius: 14, padding: 16, justifyContent: 'center' },
  signOutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
