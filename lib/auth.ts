import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Resolves the current signed-in user together with the RLS-scoped Supabase client.
 * Returns null when unauthenticated. Callers should reuse the returned `supabase`
 * client so repository writes carry the user's session (auth.uid() === user_id).
 */
export async function requireUser(): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase }
}
