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
 * Supabase RLS policies cause insert/update types to resolve to `never`.
 * This helper centralizes the unavoidable cast for write operations.
 * Read operations (select) can use `supabase.from()` directly.
 */
type TableName = keyof Database['public']['Tables']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typedFrom(table: TableName): ReturnType<typeof supabase.from> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table) as any
}
