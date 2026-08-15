import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { actionEnergy, type ProvenanceRef } from '@/lib/domain'
import { repos } from '@/lib/db'
import { getGateway, PROMPTS } from '@/lib/llm'
import { gatherContext, type LifeContext } from '@/lib/memory/retrieve'
import { logger } from '@/lib/observability/logger'
import { buildCandidates, type Candidate } from './candidates'

const decisionResult = z.object({
  chosen_label: z.string(),
  title: z.string(),
  first_physical_step: z.string(),
  energy_cost: actionEnergy,
  rationale: z.string(),
  considered: z.array(z.object({ option: z.string(), why_not: z.string() })).max(4),
  confidence: z.number().min(0).max(1),
})
type DecisionResult = z.infer<typeof decisionResult>

export interface Reflection {
  id: string
  type: string
  content: string
  confidence: number
}

export interface NowAction {
  id: string
  title: string
  first_physical_step: string | null
  energy_cost: string
}

export interface NowPayload {
  state: string | null
  recommendationId: string | null
  action: NowAction | null
  rationale: string | null
  confidence: number | null
  considered: { option: string; why_not: string }[]
  reflections: Reflection[]
  /** true when there's not enough history yet to recommend anything. */
  empty: boolean
  /** true when there IS signal but no recommendation exists yet — the client generates it (keeps the model call out of SSR). */
  pending: boolean
}

const FRESH_MS = 3 * 60 * 60 * 1000 // reuse an un-acted recommendation for 3h

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

/** Reflections are labeled AI-inferred beliefs — shown as "noticings", never as facts. */
function pickReflections(ctx: LifeContext): Reflection[] {
  return ctx.memory
    .filter((m) => m.type === 'observation' || m.type === 'inference' || m.type === 'hypothesis')
    .slice(0, 2)
    .map((m) => ({ id: m.id, type: m.type, content: m.content, confidence: m.confidence }))
}

function buildDecisionInput(ctx: LifeContext, candidates: Candidate[]): string {
  const lines: string[] = []
  lines.push(`Current time: ${new Date().toLocaleString()}`)
  lines.push(
    `Self-declared state: ${ctx.state?.state ?? 'unknown'}${ctx.state?.note ? ` (${ctx.state.note})` : ''}`,
  )
  if (ctx.memory.length) {
    lines.push('\nWhat we currently believe (type: content [confidence]):')
    for (const m of ctx.memory.slice(0, 8)) lines.push(`- ${m.type}: ${m.content} [${m.confidence.toFixed(2)}]`)
  }
  if (ctx.threads.length) {
    lines.push('\nOpen threads:')
    for (const t of ctx.threads.slice(0, 6)) lines.push(`- ${t.title}`)
  }
  if (ctx.recentEntries.length) {
    lines.push('\nRecent things they said (most recent first):')
    for (const e of ctx.recentEntries.slice(0, 3)) lines.push(`- "${truncate(e.content, 200)}"`)
  }
  lines.push('\nCandidate actions — choose ONE by its label, or use "NEW" to propose a tiny new one:')
  for (const c of candidates) {
    lines.push(`- ${c.label}: ${c.title} — first step: ${c.first_physical_step} (energy: ${c.energy_cost})`)
  }
  lines.push(
    '\nEcho the chosen action (title, first_physical_step, energy_cost) and set chosen_label to that label or "NEW". Give a short warm rationale, up to 3 considered-but-set-aside options, and your confidence 0..1.',
  )
  return lines.join('\n')
}

/** Generate a fresh recommendation (writes a next_action if needed + a recommendation row). */
async function decideNow(db: SupabaseClient, userId: string, ctx: LifeContext): Promise<NowPayload> {
  const r = repos(db)
  const reflections = pickReflections(ctx)
  const candidates = buildCandidates(ctx)

  let decision: DecisionResult
  try {
    decision = await getGateway().generateStructured({
      schema: decisionResult,
      schemaName: `decide@${PROMPTS.decide.version}`,
      messages: [
        { role: 'system', content: PROMPTS.decide.system },
        { role: 'user', content: buildDecisionInput(ctx, candidates) },
      ],
      temperature: 0.3,
    })
  } catch (e) {
    logger.warn({ kind: 'decide', userId, error: String(e) }, 'decision model failed; using gentle default')
    decision = {
      chosen_label: 'R1',
      title: 'Take a short rest',
      first_physical_step: 'Set a 15-minute timer and step away from screens',
      energy_cost: 'low',
      rationale: "I couldn't think this through with you just now, so here's a gentle default. Rest counts.",
      considered: [],
      confidence: 0.2,
    }
  }

  const chosen = candidates.find((c) => c.label === decision.chosen_label)
  let action: NowAction
  let threadId: string | null = null
  if (chosen?.action_id) {
    action = {
      id: chosen.action_id,
      title: chosen.title,
      first_physical_step: chosen.first_physical_step,
      energy_cost: chosen.energy_cost,
    }
    threadId = chosen.thread_id
  } else {
    const created = await r.actions.create({
      user_id: userId,
      title: decision.title,
      first_physical_step: decision.first_physical_step,
      energy_cost: decision.energy_cost,
      status: 'suggested',
    })
    action = {
      id: created.id,
      title: created.title,
      first_physical_step: created.first_physical_step,
      energy_cost: created.energy_cost,
    }
  }

  const provenance: ProvenanceRef[] = [
    ...(threadId ? [{ kind: 'thread' as const, id: threadId }] : []),
    ...reflections.map((rf) => ({ kind: 'memory_item' as const, id: rf.id, label: truncate(rf.content, 80) })),
  ]
  const rec = await r.recommendations.create({
    user_id: userId,
    action_id: action.id,
    rationale: decision.rationale,
    provenance_refs: provenance,
  })

  return {
    state: ctx.state?.state ?? null,
    recommendationId: rec.id,
    action,
    rationale: decision.rationale,
    confidence: decision.confidence,
    considered: decision.considered,
    reflections,
    empty: false,
    pending: false,
  }
}

/**
 * The Now payload. Reuses a fresh, un-acted recommendation so repeated page loads
 * don't spam new ones; pass { force: true } (the "rethink" affordance) to regenerate.
 */
export async function loadNow(
  db: SupabaseClient,
  userId: string,
  opts?: { force?: boolean; generate?: boolean },
): Promise<NowPayload> {
  const ctx = await gatherContext(db, userId)
  const reflections = pickReflections(ctx)

  const hasSignal = ctx.recentEntries.length > 0 || ctx.openActions.length > 0 || ctx.memory.length > 0
  if (!hasSignal) {
    return {
      state: ctx.state?.state ?? null,
      recommendationId: null,
      action: null,
      rationale: null,
      confidence: null,
      considered: [],
      reflections: [],
      empty: true,
      pending: false,
    }
  }

  // "force" (Rethink) always generates fresh.
  if (opts?.force) return decideNow(db, userId, ctx)

  // Reuse a fresh, un-acted recommendation — a fast DB read, no model call.
  const r = repos(db)
  const latest = await r.recommendations.latest(userId)
  if (latest && latest.outcome == null && Date.now() - new Date(latest.ts).getTime() < FRESH_MS && latest.action_id) {
    const a = await r.actions.get(latest.action_id)
    if (a && a.status !== 'done' && a.status !== 'dismissed') {
      return {
        state: ctx.state?.state ?? null,
        recommendationId: latest.id,
        action: { id: a.id, title: a.title, first_physical_step: a.first_physical_step, energy_cost: a.energy_cost },
        rationale: latest.rationale,
        confidence: null,
        considered: [],
        reflections,
        empty: false,
        pending: false,
      }
    }
  }

  // There's signal but no fresh recommendation. Only generate when explicitly asked
  // (the client does this, off the SSR path); otherwise report `pending` so the page
  // renders instantly.
  if (opts?.generate) return decideNow(db, userId, ctx)
  return {
    state: ctx.state?.state ?? null,
    recommendationId: null,
    action: null,
    rationale: null,
    confidence: null,
    considered: [],
    reflections,
    empty: false,
    pending: true,
  }
}
