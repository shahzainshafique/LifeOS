import type { SupabaseClient } from '@supabase/supabase-js'
import { stateLogInsert, stateLogRow, type StateLogInsert, type StateLogRow } from '@/lib/domain'
import { must } from './helpers'

const COLS = 'id,user_id,ts,state,note'

export function stateRepo(db: SupabaseClient) {
  return {
    async log(input: StateLogInsert): Promise<StateLogRow> {
      return must(await db.from('state_log').insert(stateLogInsert.parse(input)).select(COLS).single(), stateLogRow)
    },

    /** The most recent self-declared state, or null if never set. */
    async current(userId: string): Promise<StateLogRow | null> {
      const res = await db
        .from('state_log')
        .select(COLS)
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return res.data ? stateLogRow.parse(res.data) : null
    },
  }
}
