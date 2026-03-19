import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pjvsgahzacdeymijhzoq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdnNnYWh6YWNkZXltaWpoem9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTM1NzUsImV4cCI6MjA4Mzg2OTU3NX0.2aiOHTpkZQYnnD_oSJalXrEcLcnEcFbGuihJ34hGoO4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const TOMTOM_API_KEY = 'ObpIs1IAZflZ8Fi4fBxR6otpZD8juPt3'
