import { createClient } from '@supabase/supabase-js'
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
 * The auto-generated Database type resolves insert/update to `never` for tables
 * with RLS policies. This helper centralizes the unavoidable cast.
 *
 * TODO: Run `supabase gen types typescript` against the live DB to get correct
 * types, then remove this helper and use `supabase.from()` directly.
 */
type TableName = keyof Database['public']['Tables']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typedFrom(table: TableName): ReturnType<typeof supabase.from> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table) as any
}
