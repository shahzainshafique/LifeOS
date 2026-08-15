import type { SupabaseClient } from '@supabase/supabase-js'
import { entryInsert, entryRow, type EntryInsert, type EntryRow } from '@/lib/domain'
import { must, mustList } from './helpers'

// embedding is intentionally not selected (large; the UI never needs it).
const COLS = 'id,user_id,ts,role,modality,content,session_id'

export function entriesRepo(db: SupabaseClient) {
  return {
    async create(input: EntryInsert): Promise<EntryRow> {
      const row = entryInsert.parse(input)
      return must(await db.from('entries').insert(row).select(COLS).single(), entryRow)
    },

    async byIds(ids: string[]): Promise<EntryRow[]> {
      if (ids.length === 0) return []
      const res = await db.from('entries').select(COLS).in('id', ids)
      return mustList(res, entryRow)
    },

    async listRecent(userId: string, limit = 20): Promise<EntryRow[]> {
      const res = await db
        .from('entries')
        .select(COLS)
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(limit)
      return mustList(res, entryRow)
    },

    /** pgvector expects the '[x,y,z]' text form; supabase-js sends it through as-is. */
    async setEmbedding(id: string, embedding: number[]): Promise<void> {
      const vec = `[${embedding.join(',')}]`
      const res = await db.from('entries').update({ embedding: vec }).eq('id', id)
      if (res.error) throw new Error(res.error.message)
    },
  }
}
