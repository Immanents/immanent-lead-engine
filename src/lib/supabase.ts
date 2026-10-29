import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

const key = '__immanent_supabase__'
const g = globalThis as typeof globalThis & { [key]: SupabaseClient }

if (!g[key]) {
  g[key] = createClient(`https://${projectId}.supabase.co`, publicAnonKey)
}

export const supabase = g[key]
