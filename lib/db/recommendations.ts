import type { SupabaseClient } from '@supabase/supabase-js'
import {
  recommendationInsert,
  recommendationRow,
  type RecommendationFeedback,
  type RecommendationInsert,
  type RecommendationRow,
} from '@/lib/domain'
import { must, mustList } from './helpers'

const COLS =
  'id,user_id,ts,action_id,rationale,provenance_refs,chosen,feedback,outcome,outcome_ts'

export function recommendationsRepo(db: SupabaseClient) {
  return {
    async create(input: RecommendationInsert): Promise<RecommendationRow> {
      return must(
        await db.from('recommendations').insert(recommendationInsert.parse(input)).select(COLS).single(),
        recommendationRow,
      )
    },

    /** Closes the loop: records what the user chose / how it went. */
    async recordFeedback(id: string, fb: RecommendationFeedback): Promise<RecommendationRow> {
      const patch: Record<string, unknown> = { ...fb }
      if (fb.outcome) patch.outcome_ts = new Date().toISOString()
      return must(
        await db.from('recommendations').update(patch).eq('id', id).select(COLS).single(),
        recommendationRow,
      )
    },

    async latest(userId: string): Promise<RecommendationRow | null> {
      const res = await db
        .from('recommendations')
        .select(COLS)
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return res.data ? recommendationRow.parse(res.data) : null
    },

    async listRecent(userId: string, limit = 20): Promise<RecommendationRow[]> {
      const res = await db
        .from('recommendations')
        .select(COLS)
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(limit)
      return mustList(res, recommendationRow)
    },
  }
}
