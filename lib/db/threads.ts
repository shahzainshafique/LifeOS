import type { SupabaseClient } from '@supabase/supabase-js'
import { threadInsert, threadRow, type ThreadInsert, type ThreadRow } from '@/lib/domain'
import { must, mustList } from './helpers'

const COLS = 'id,user_id,title,status,priority_signal,last_touched,created_at'

export function threadsRepo(db: SupabaseClient) {
  return {
    async create(input: ThreadInsert): Promise<ThreadRow> {
      return must(await db.from('threads').insert(threadInsert.parse(input)).select(COLS).single(), threadRow)
    },

    async listOpen(userId: string, limit = 50): Promise<ThreadRow[]> {
      const res = await db
        .from('threads')
        .select(COLS)
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('last_touched', { ascending: false })
        .limit(limit)
      return mustList(res, threadRow)
    },

    async touch(id: string): Promise<void> {
      const res = await db.from('threads').update({ last_touched: new Date().toISOString() }).eq('id', id)
      if (res.error) throw new Error(res.error.message)
    },
  }
}
