import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env and ensure app.config.js passes them in extra.'
  );
}

// SecureStore has a 2048-byte limit. Values larger than that (e.g. Supabase JWTs with
// metadata) fall back to AsyncStorage so the session is always persisted across restarts
// and token auto-refresh can find the refresh token after the access token expires.
const MAX_SECURE_STORE_BYTES = 2048;
const ASYNC_PREFIX = 'supa_async_';

const expoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const v = await SecureStore.getItemAsync(key);
      if (v !== null) return v;
    } catch { /* fall through */ }
    try {
      return await AsyncStorage.getItem(ASYNC_PREFIX + key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= MAX_SECURE_STORE_BYTES) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch { /* fall through to AsyncStorage */ }
    }
    try {
      await AsyncStorage.setItem(ASYNC_PREFIX + key, value);
    } catch { /* ignore */ }
  },
  removeItem: async (key: string): Promise<void> => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(ASYNC_PREFIX + key),
    ]);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: expoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
