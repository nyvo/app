import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * Typed query builder helper.
 *
 * The auto-generated Database type resolves insert/update/select to `never`
 * for tables with RLS policies. Until we regenerate types from the live schema
 * (supabase gen types typescript), this helper centralizes the single
 * unavoidable cast so service files stay free of `as any`.
 */
type TableName = keyof Database['public']['Tables']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typedFrom(table: TableName): ReturnType<SupabaseClient['from']> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table) as any
}
