import { z } from 'zod'

// Enums mirror the Postgres enums in supabase/migrations/*_core_schema.sql.
// Keep them in lockstep — this file is the single source of truth for the app side.

export const memoryType = z.enum([
  'fact',
  'observation',
  'inference',
  'hypothesis',
  'preference',
  'value',
  'strength',
  'challenge',
  'goal',
  'commitment',
])
export type MemoryType = z.infer<typeof memoryType>

export const memoryStatus = z.enum(['active', 'superseded', 'refuted', 'archived'])
export type MemoryStatus = z.infer<typeof memoryStatus>

export const evidencePolarity = z.enum(['support', 'contradict'])
export type EvidencePolarity = z.infer<typeof evidencePolarity>

export const lifeState = z.enum([
  'focused',
  'normal',
  'low_energy',
  'overwhelmed',
  'restless',
  'reflective',
  'motivated',
  'uncertain',
])
export type LifeState = z.infer<typeof lifeState>

export const entryRole = z.enum(['user', 'assistant', 'system'])
export type EntryRole = z.infer<typeof entryRole>

export const threadStatus = z.enum(['open', 'dormant', 'closed'])
export type ThreadStatus = z.infer<typeof threadStatus>

export const actionEnergy = z.enum(['low', 'med', 'high'])
export type ActionEnergy = z.infer<typeof actionEnergy>

export const actionStatus = z.enum(['suggested', 'active', 'done', 'dismissed'])
export type ActionStatus = z.infer<typeof actionStatus>

/**
 * The hard provenance invariant (design principle: "no belief without a receipt").
 * AI-generated belief types MUST cite >= 1 evidence row. Directly-stated types
 * (fact/preference/value/goal/...) get evidence attached by the extraction pipeline
 * too, but are not hard-blocked by the repository.
 */
export const REQUIRES_EVIDENCE: readonly MemoryType[] = ['observation', 'inference', 'hypothesis']

export function requiresEvidence(type: MemoryType): boolean {
  return REQUIRES_EVIDENCE.includes(type)
}
