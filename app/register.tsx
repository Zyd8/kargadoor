import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const PRIMARY = '#1B6B4A';
const PLACEHOLDER = '#A0A0A0';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'USER' | 'DRIVER'>('USER');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error, userId } = await signUp(email.trim(), password, name.trim(), phone.trim(), role);
    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    // Best-effort avatar upload — does not block registration
    if (userId && avatarBase64) {
      try {
        const bytes = base64ToBytes(avatarBase64);
        const path = `${userId}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          if (urlData?.publicUrl) {
            await supabase.from('PROFILE').update({ AVATAR_URL: urlData.publicUrl }).eq('ID', userId);
          }
        }
      } catch { /* ignore */ }
    }

    setLoading(false);
    Alert.alert(
      'Check your email',
      'We sent you a confirmation link. Confirm your email, then come back to log in.',
      [{ text: 'OK', onPress: () => router.replace('/login') }]
    );
  };

  return (
    <View style={styles.root}>
      {/* Green header — stays fixed when keyboard opens */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="local-shipping" size={36} color="#fff" />
        </View>
        <Text style={styles.brandName}>KARGADOOR</Text>
      </View>

      {/* KAV wraps only the white card so header stays put */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.card}
          contentContainerStyle={[styles.cardInner, { paddingBottom: Math.max(insets.bottom, 24) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/login')}>
            <MaterialIcons name="arrow-back" size={18} color={PRIMARY} />
            <Text style={styles.backText}>Back To Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Sign Up</Text>

          {/* Optional avatar */}
          <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar} activeOpacity={0.8} disabled={loading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <MaterialIcons name="person" size={36} color="#C8D8D0" />
            )}
            <View style={styles.avatarCamBadge}>
              <MaterialIcons name="photo-camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Profile photo (optional)</Text>

          <View style={styles.inputRow}>
            <MaterialIcons name="person" size={20} color={PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor={PLACEHOLDER}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              editable={!loading}
            />
          </View>

          <View style={styles.inputRow}>
            <MaterialIcons name="email" size={20} color={PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={PLACEHOLDER}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputRow}>
            <MaterialIcons name="lock" size={20} color={PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={PLACEHOLDER}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
            />
          </View>

          <View style={styles.inputRow}>
            <MaterialIcons name="lock" size={20} color={PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor={PLACEHOLDER}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputRow}>
            <MaterialIcons name="phone" size={20} color={PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Phone Number (e.g. 09XXXXXXXXX)"
              placeholderTextColor={PLACEHOLDER}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Account Type toggle */}
          <Text style={styles.roleLabel}>Account Type</Text>
          <View style={styles.roleRow}>
            {(['USER', 'DRIVER'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rolePill, role === r && styles.rolePillSelected]}
                onPress={() => setRole(r)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={r === 'USER' ? 'person' : 'local-shipping'}
                  size={16}
                  color={role === r ? '#fff' : '#555'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.rolePillText, role === r && styles.rolePillTextSelected]}>
                  {r === 'USER' ? 'User' : 'Driver'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.roleHint}>
            {role === 'DRIVER' ? 'You will be able to accept and deliver orders.' : 'You will be able to create delivery orders.'}
          </Text>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: PRIMARY },
  header:     { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandName:  { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  kav:        { flex: 1 },
  card:       { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  cardInner:  { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24 },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText:   { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  cardTitle:  { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F4', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, height: 52 },
  inputIcon:  { marginRight: 10 },
  textInput:  { flex: 1, fontSize: 15, color: '#1A1A1A' },
  roleLabel:           { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 6 },
  roleRow:             { flexDirection: 'row', gap: 10, marginBottom: 8 },
  rolePill:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#E4EAE4', backgroundColor: '#F4F6F4' },
  rolePillSelected:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  rolePillText:        { fontSize: 14, fontWeight: '600', color: '#555' },
  rolePillTextSelected:{ color: '#fff' },
  roleHint:            { fontSize: 12, color: '#AAA', marginBottom: 18, marginLeft: 2 },
  btn:        { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 28 },
  btnDisabled:{ opacity: 0.65 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  avatarPicker:  { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2EE', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarImg:     { width: 80, height: 80, borderRadius: 40 },
  avatarCamBadge:{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarHint:    { textAlign: 'center', fontSize: 12, color: '#AAA', marginBottom: 16 },
});
