import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client for background jobs (pg-boss workers). It BYPASSES RLS, so
 * every write MUST set user_id explicitly. Never import this into client bundles
 * or user-facing request paths — use the RLS-scoped client from lib/supabase/server
 * there instead.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('createServiceClient: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
