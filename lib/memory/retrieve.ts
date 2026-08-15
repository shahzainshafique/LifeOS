import type { SupabaseClient } from '@supabase/supabase-js'
import { repos } from '@/lib/db'
import type { EntryRow, MemoryItemRow, NextActionRow, StateLogRow, ThreadRow } from '@/lib/domain'

/**
 * The context bundle the decision engine reasons over. v1 uses recency + active
 * beliefs (small history, tight VRAM). Semantic (vector) retrieval is a Slice 2
 * extension — this is the seam where it plugs in.
 */
export interface LifeContext {
  state: StateLogRow | null
  recentEntries: EntryRow[]
  memory: MemoryItemRow[]
  threads: ThreadRow[]
  openActions: NextActionRow[]
}

export async function gatherContext(db: SupabaseClient, userId: string): Promise<LifeContext> {
  const r = repos(db)
  const [state, recentEntries, memory, threads, openActions] = await Promise.all([
    r.state.current(userId),
    r.entries.listRecent(userId, 8),
    r.memory.listActive(userId, 20),
    r.threads.listOpen(userId, 10),
    r.actions.listOpen(userId, 15),
  ])
  return { state, recentEntries, memory, threads, openActions }
}
