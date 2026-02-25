import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const PRIMARY = '#1B6B4A';
const PLACEHOLDER = '#A0A0A0';

export default function RegisterScreen() {
  const { signUp, setDebugBypass } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

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
    const { error } = await signUp(email.trim(), password, name.trim(), phone.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
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

          <TouchableOpacity
            style={styles.bypassWrap}
            onPress={() => { setDebugBypass(true); router.replace('/(tabs)'); }}
            disabled={loading}
          >
            <Text style={styles.bypassText}>Use without account</Text>
            <Text style={styles.bypassHint}>Skip sign up (e.g. when email rate exceeded)</Text>
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
  btn:        { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 28 },
  btnDisabled:{ opacity: 0.65 },
  bypassWrap:   { alignItems: 'center', marginBottom: 16, paddingVertical: 12 },
  bypassText:   { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  bypassHint:   { fontSize: 11, color: '#888', marginTop: 2 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
