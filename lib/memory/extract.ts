import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { actionEnergy, memoryType } from '@/lib/domain'
import { repos } from '@/lib/db'
import { getGateway, PROMPTS } from '@/lib/llm'
import { logger } from '@/lib/observability/logger'

// The structured shape the extractor must produce. Ollama's `format` constrains
// generation to this schema; we still zod-parse the result as a second gate.
const extractedItem = z.object({
  type: memoryType,
  content: z.string(),
  confidence: z.number().min(0).max(1),
  source_quote: z.string(),
})
const extractedThread = z.object({ title: z.string() })
const extractedAction = z.object({
  title: z.string(),
  first_physical_step: z.string(),
  energy_cost: actionEnergy,
})
export const extractionResult = z.object({
  items: z.array(extractedItem),
  threads: z.array(extractedThread),
  actions: z.array(extractedAction),
})
export type ExtractionResult = z.infer<typeof extractionResult>

export async function extractFromText(text: string): Promise<ExtractionResult> {
  return getGateway().generateStructured({
    schema: extractionResult,
    schemaName: `extract@${PROMPTS.extract.version}`,
    messages: [
      { role: 'system', content: PROMPTS.extract.system },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
  })
}

/**
 * Persists an extraction with provenance. Every belief cites the source entry
 * (satisfying the provenance invariant). Threads are de-duped by title so the
 * memory doesn't fill with near-identical loops.
 */
export async function persistExtraction(
  db: SupabaseClient,
  userId: string,
  entryId: string,
  result: ExtractionResult,
): Promise<void> {
  const r = repos(db)

  for (const it of result.items) {
    await r.memory.create({ user_id: userId, type: it.type, content: it.content, confidence: it.confidence }, [
      { source_type: 'entry', source_id: entryId },
    ])
  }

  const existing = await r.threads.listOpen(userId, 50)
  const seen = new Set(existing.map((t) => t.title.trim().toLowerCase()))
  for (const th of result.threads) {
    const key = th.title.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      await r.threads.create({ user_id: userId, title: th.title })
    }
  }

  for (const ac of result.actions) {
    await r.actions.create({
      user_id: userId,
      title: ac.title,
      first_physical_step: ac.first_physical_step,
      energy_cost: ac.energy_cost,
      status: 'suggested',
      created_from: entryId,
    })
  }
}

/** Best-effort embedding for later semantic recall. Never fails the pipeline. */
export async function embedEntry(db: SupabaseClient, entryId: string, text: string): Promise<void> {
  try {
    const [vec] = await getGateway().embed([text])
    if (vec?.length) await repos(db).entries.setEmbedding(entryId, vec)
  } catch (e) {
    logger.warn({ kind: 'embed', entryId, error: String(e) }, 'embedEntry failed (non-fatal)')
  }
}

/** Full pipeline for one entry: extract -> persist -> embed. Used by the worker. */
export async function processEntry(db: SupabaseClient, userId: string, entryId: string, text: string): Promise<void> {
  const result = await extractFromText(text)
  await persistExtraction(db, userId, entryId, result)
  await embedEntry(db, entryId, text)
  logger.info(
    { kind: 'extract', entryId, items: result.items.length, threads: result.threads.length, actions: result.actions.length },
    'processEntry done',
  )
}
