import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
}

// Admin client using service role key — bypasses RLS for full admin access
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Separate anon client for user auth (login verification)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supabaseAuth = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : supabase
