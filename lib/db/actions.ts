import type { SupabaseClient } from '@supabase/supabase-js'
import {
  nextActionInsert,
  nextActionRow,
  type ActionStatus,
  type NextActionInsert,
  type NextActionRow,
} from '@/lib/domain'
import { must, mustList } from './helpers'

const COLS =
  'id,user_id,thread_id,title,first_physical_step,energy_cost,status,created_from,created_at'

export function actionsRepo(db: SupabaseClient) {
  return {
    async create(input: NextActionInsert): Promise<NextActionRow> {
      return must(
        await db.from('next_actions').insert(nextActionInsert.parse(input)).select(COLS).single(),
        nextActionRow,
      )
    },

    async get(id: string): Promise<NextActionRow | null> {
      const res = await db.from('next_actions').select(COLS).eq('id', id).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return res.data ? nextActionRow.parse(res.data) : null
    },

    /** Open work the decision engine can choose from. */
    async listOpen(userId: string, limit = 50): Promise<NextActionRow[]> {
      const res = await db
        .from('next_actions')
        .select(COLS)
        .eq('user_id', userId)
        .in('status', ['suggested', 'active'])
        .order('created_at', { ascending: false })
        .limit(limit)
      return mustList(res, nextActionRow)
    },

    async setStatus(id: string, status: ActionStatus): Promise<NextActionRow> {
      return must(
        await db.from('next_actions').update({ status }).eq('id', id).select(COLS).single(),
        nextActionRow,
      )
    },
  }
}
