import type { SupabaseClient } from '@supabase/supabase-js'
import { entriesRepo } from './entries'
import { memoryRepo } from './memory'
import { threadsRepo } from './threads'
import { actionsRepo } from './actions'
import { stateRepo } from './state'
import { recommendationsRepo } from './recommendations'

export * from './helpers'
export * from './provenance'
export * from './service'
export { entriesRepo } from './entries'
export { memoryRepo } from './memory'
export { threadsRepo } from './threads'
export { actionsRepo } from './actions'
export { stateRepo } from './state'
export { recommendationsRepo } from './recommendations'

/** Bind all repositories to one Supabase client (RLS-scoped user client, or service client in jobs). */
export function repos(db: SupabaseClient) {
  return {
    entries: entriesRepo(db),
    memory: memoryRepo(db),
    threads: threadsRepo(db),
    actions: actionsRepo(db),
    state: stateRepo(db),
    recommendations: recommendationsRepo(db),
  }
}

export type Repos = ReturnType<typeof repos>
