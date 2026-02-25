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
  signUp: (email: string, password: string, name: string, phone: string, role?: 'USER' | 'DRIVER') => Promise<{ error: Error | null }>;
  userRole: 'USER' | 'DRIVER';
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugBypass, setDebugBypassState] = useState(false);
  const [profileRole, setProfileRole] = useState<'USER' | 'DRIVER' | null>(null);

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

  // Fallback: read role from PROFILE when user is set (e.g. Driver set in DB or metadata missing)
  useEffect(() => {
    if (!user?.id) {
      setProfileRole(null);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase.from('PROFILE').select('ROLE').eq('ID', user.id).maybeSingle();
      if (!mounted) return;
      const r = (data?.ROLE as string)?.toUpperCase();
      setProfileRole(r === 'DRIVER' ? 'DRIVER' : 'USER');
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Email/password only — no OAuth (e.g. Google) to avoid email rate exceeded.
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  // Email/password only — no OAuth (e.g. Google) to avoid email rate exceeded.
  const signUp = useCallback(async (email: string, password: string, name: string, phone: string, role: 'USER' | 'DRIVER' = 'USER') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone_number: phone, role } },
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

  const metaRole = (user?.user_metadata?.role as string)?.toUpperCase() === 'DRIVER' ? 'DRIVER' : null;
  const userRole: 'USER' | 'DRIVER' = metaRole ?? profileRole ?? 'USER';

  const value: AuthContextType = {
    user,
    session,
    loading,
    debugBypass,
    setDebugBypass,
    signIn,
    signUp,
    signOut,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
