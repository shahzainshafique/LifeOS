import type { SupabaseClient } from '@supabase/supabase-js'
import {
  evidenceInput,
  evidenceRow,
  memoryItemInsert,
  memoryItemRow,
  type EvidenceInput,
  type EvidenceRow,
  type MemoryItemInsert,
  type MemoryItemRow,
  type MemoryStatus,
} from '@/lib/domain'
import { must, mustList } from './helpers'
import { assertProvenance } from './provenance'

const MI_COLS =
  'id,user_id,type,content,subject,status,confidence,first_seen,last_seen,superseded_by,created_at'
const EV_COLS = 'id,user_id,memory_item_id,source_type,source_id,polarity,weight,ts'

export function memoryRepo(db: SupabaseClient) {
  return {
    /**
     * Create a belief together with its evidence, enforcing the provenance invariant.
     * Inserts are compensating: if the evidence insert fails, the memory_item is
     * deleted so we never persist an inferred belief without its required receipt.
     */
    async create(input: MemoryItemInsert, evidence: EvidenceInput[]): Promise<MemoryItemRow> {
      const item = memoryItemInsert.parse(input)
      const evs = evidence.map((e) => evidenceInput.parse(e))
      assertProvenance(item.type, evs)

      const created = must(
        await db.from('memory_items').insert(item).select(MI_COLS).single(),
        memoryItemRow,
      )

      if (evs.length > 0) {
        const rows = evs.map((e) => ({ ...e, user_id: item.user_id, memory_item_id: created.id }))
        const evRes = await db.from('evidence').insert(rows)
        if (evRes.error) {
          await db.from('memory_items').delete().eq('id', created.id)
          throw new Error(`evidence insert failed, rolled back memory_item: ${evRes.error.message}`)
        }
      }
      return created
    },

    async listActive(userId: string, limit = 100): Promise<MemoryItemRow[]> {
      const res = await db
        .from('memory_items')
        .select(MI_COLS)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('last_seen', { ascending: false })
        .limit(limit)
      return mustList(res, memoryItemRow)
    },

    async evidenceFor(memoryItemId: string): Promise<EvidenceRow[]> {
      const res = await db.from('evidence').select(EV_COLS).eq('memory_item_id', memoryItemId)
      return mustList(res, evidenceRow)
    },

    /** All of a user's evidence rows — used to render provenance across the Memory view in 2 queries. */
    async allEvidence(userId: string): Promise<EvidenceRow[]> {
      const res = await db.from('evidence').select(EV_COLS).eq('user_id', userId)
      return mustList(res, evidenceRow)
    },

    /** Change the system's mind, reversibly, with history preserved. */
    async setStatus(id: string, status: MemoryStatus, supersededBy?: string): Promise<MemoryItemRow> {
      const patch: Record<string, unknown> = { status, last_seen: new Date().toISOString() }
      if (supersededBy) patch.superseded_by = supersededBy
      return must(
        await db.from('memory_items').update(patch).eq('id', id).select(MI_COLS).single(),
        memoryItemRow,
      )
    },

    /** User correction of content — the user is the final authority over their model. */
    async correct(id: string, content: string): Promise<MemoryItemRow> {
      return must(
        await db
          .from('memory_items')
          .update({ content, last_seen: new Date().toISOString() })
          .eq('id', id)
          .select(MI_COLS)
          .single(),
        memoryItemRow,
      )
    },
  }
}
