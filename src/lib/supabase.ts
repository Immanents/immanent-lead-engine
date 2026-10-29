import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

// Vercel should use the Vite variables. The generated public config remains as
// a compatibility fallback until those values are set on every Vercel target.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || publicAnonKey

const key = '__immanent_supabase__'
const g = globalThis as typeof globalThis & { [key]: SupabaseClient }

if (!g[key]) {
  g[key] = createClient(supabaseUrl, supabasePublishableKey)
}

export const supabase = g[key]
