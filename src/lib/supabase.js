import { createClient } from '@supabase/supabase-js'

// ⚠️ GANTI DENGAN KREDENSIAL SUPABASE ANDA!
// Dapatkan dari: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Helper untuk cek koneksi
export const isSupabaseConfigured = () => {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_URL !== 'your-supabase-url' &&
         SUPABASE_ANON_KEY !== 'your-supabase-anon-key' &&
         SUPABASE_URL?.startsWith('http')
}

// Only create Supabase client if properly configured
// This prevents WebSocket connection errors when Supabase is not set up
let supabaseInstance = null

if (isSupabaseConfigured()) {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
  console.log('✅ Supabase client initialized')
} else {
  console.log('⚠️ Supabase not configured - running in local-only mode')
  // Create a dummy client that does nothing to prevent errors
  supabaseInstance = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
  }
}

export const supabase = supabaseInstance
