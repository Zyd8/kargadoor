import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
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

export default function LoginScreen() {
  const { signIn, setDebugBypass } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      {/* Green header — stays fixed when keyboard opens */}
      <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={() => { setDebugBypass(true); router.replace('/(tabs)'); }}
        >
          <View style={styles.logoCircle}>
            <MaterialIcons name="local-shipping" size={44} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.brandName}>KARGADOOR</Text>
        <Text style={styles.brandTagline}>Logistics made simple</Text>
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
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.cardTitle}>Login</Text>

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
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

<TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bypassWrap}
            onPress={() => { setDebugBypass(true); router.replace('/(tabs)'); }}
            disabled={loading}
          >
            <Text style={styles.bypassText}>Use without account</Text>
            <Text style={styles.bypassHint}>Skip login (e.g. when email rate exceeded)</Text>
          </TouchableOpacity>

          <Link href="/register" asChild>
            <TouchableOpacity style={styles.signupWrap} disabled={loading}>
              <Text style={styles.signupText}>
                Don't Have An Account?{' '}
                <Text style={styles.signupLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: PRIMARY },
  header:       { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  logoCircle:   { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brandName:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 3, marginBottom: 4 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  kav:          { flex: 1 },
  card:         { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  cardInner:    { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32 },
  cardTitle:    { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 24 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F4', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, height: 52 },
  inputIcon:    { marginRight: 10 },
  textInput:    { flex: 1, fontSize: 15, color: '#1A1A1A' },
  forgotWrap:   { alignItems: 'flex-end', marginBottom: 24 },
  forgotText:   { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  btn:          { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  btnDisabled:  { opacity: 0.65 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  bypassWrap:   { alignItems: 'center', marginTop: 16, marginBottom: 8, paddingVertical: 12 },
  bypassText:   { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  bypassHint:   { fontSize: 11, color: '#888', marginTop: 2 },
  signupWrap:   { alignItems: 'center', marginTop: 4 },
  signupText:   { fontSize: 14, color: '#666' },
  signupLink:   { color: PRIMARY, fontWeight: '700' },
});
