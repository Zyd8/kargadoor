import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '@/lib/supabase';

const DEBUG_BYPASS_KEY = 'auth_use_without_account';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  debugBypass: boolean;
  setDebugBypass: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugBypass, setDebugBypassState] = useState(false);

  const setDebugBypass = useCallback(async (value: boolean) => {
    setDebugBypassState(value);
    try {
      if (value) {
        await SecureStore.setItemAsync(DEBUG_BYPASS_KEY, '1');
      } else {
        await SecureStore.deleteItemAsync(DEBUG_BYPASS_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [sessionResult, storedBypass] = await Promise.all([
        supabase.auth.getSession(),
        SecureStore.getItemAsync(DEBUG_BYPASS_KEY),
      ]);
      if (!mounted) return;
      const s = sessionResult.data.session;
      setSession(s ?? null);
      setUser(s?.user ?? null);
      setDebugBypassState(storedBypass === '1');
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
      setUser(s?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone_number: phone } },
    });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    setDebugBypassState(false);
    try {
      await SecureStore.deleteItemAsync(DEBUG_BYPASS_KEY);
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    debugBypass,
    setDebugBypass,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
