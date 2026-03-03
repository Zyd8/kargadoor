import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

const LOCAL_SESSION_KEY = 'logistics_admin_local_session'

const LOCAL_ADMIN_PROFILE: Profile = {
  ID: 'local-admin',
  ROLE: 'admin',
  FULL_NAME: 'Admin',
  EMAIL: import.meta.env.VITE_ADMIN_USERNAME ?? 'admin',
  PHONE_NUMBER: null,
  PUSH_TOKEN: null,
  AVATAR_URL: null,
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isLocalAdmin: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLocalAdmin, setIsLocalAdmin] = useState(false)

  useEffect(() => {
    // Check for persisted local admin session first
    if (sessionStorage.getItem(LOCAL_SESSION_KEY) === 'true') {
      setProfile(LOCAL_ADMIN_PROFILE)
      setIsLocalAdmin(true)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else if (!isLocalAdmin) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('PROFILE')
      .select('*')
      .eq('ID', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(username: string, password: string): Promise<{ error: string | null }> {
    const adminUser = import.meta.env.VITE_ADMIN_USERNAME
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD

    // Check hardcoded credentials first
    if (adminUser && adminPass && username === adminUser && password === adminPass) {
      sessionStorage.setItem(LOCAL_SESSION_KEY, 'true')
      setProfile(LOCAL_ADMIN_PROFILE)
      setIsLocalAdmin(true)
      return { error: null }
    }

    // Fall back to Supabase auth (email login)
    const { data, error } = await supabase.auth.signInWithPassword({ email: username, password })
    if (error) return { error: error.message }

    const { data: profileData } = await supabase
      .from('PROFILE')
      .select('*')
      .eq('ID', data.user.id)
      .single()

    if (!profileData || profileData.ROLE !== 'admin') {
      await supabase.auth.signOut()
      return { error: 'Access denied. Admin account required.' }
    }

    setProfile(profileData)
    return { error: null }
  }

  async function signOut() {
    sessionStorage.removeItem(LOCAL_SESSION_KEY)
    setIsLocalAdmin(false)
    setProfile(null)
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.ROLE === 'admin'

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isAdmin, isLocalAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
