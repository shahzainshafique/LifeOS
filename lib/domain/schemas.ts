import { z } from 'zod'
import {
  actionEnergy,
  actionStatus,
  entryRole,
  evidencePolarity,
  lifeState,
  memoryStatus,
  memoryType,
  threadStatus,
} from './enums'

// Row schemas describe what we read back from Postgres (timestamps are ISO strings
// over PostgREST). Insert schemas describe what the app is allowed to write; the
// DB fills id/timestamps/defaults. Reads are zod-parsed so a schema drift fails loudly.

const uuid = z.string().uuid()
const iso = z.string() // timestamptz serialized as ISO string

// ---------------------------------------------------------------------------
// entries
// ---------------------------------------------------------------------------
export const entryRow = z.object({
  id: uuid,
  user_id: uuid,
  ts: iso,
  role: entryRole,
  modality: z.string(),
  content: z.string(),
  session_id: uuid.nullable(),
  // embedding is intentionally omitted from reads (large; not needed by the UI).
})
export type EntryRow = z.infer<typeof entryRow>

export const entryInsert = z.object({
  user_id: uuid,
  content: z.string().min(1),
  role: entryRole.default('user'),
  modality: z.string().default('text'),
  session_id: uuid.nullable().optional(),
})
export type EntryInsert = z.input<typeof entryInsert>

// ---------------------------------------------------------------------------
// memory_items
// ---------------------------------------------------------------------------
export const memoryItemRow = z.object({
  id: uuid,
  user_id: uuid,
  type: memoryType,
  content: z.string(),
  subject: z.string().nullable(),
  status: memoryStatus,
  confidence: z.number(),
  first_seen: iso,
  last_seen: iso,
  superseded_by: uuid.nullable(),
  created_at: iso,
})
export type MemoryItemRow = z.infer<typeof memoryItemRow>

export const memoryItemInsert = z.object({
  user_id: uuid,
  type: memoryType,
  content: z.string().min(1),
  subject: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
})
export type MemoryItemInsert = z.input<typeof memoryItemInsert>

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------
export const evidenceRow = z.object({
  id: uuid,
  user_id: uuid,
  memory_item_id: uuid,
  source_type: z.string(),
  source_id: uuid,
  polarity: evidencePolarity,
  weight: z.number(),
  ts: iso,
})
export type EvidenceRow = z.infer<typeof evidenceRow>

/** Evidence to attach when creating a belief. memory_item_id/user_id are filled by the repo. */
export const evidenceInput = z.object({
  source_type: z.string().default('entry'),
  source_id: uuid,
  polarity: evidencePolarity.default('support'),
  weight: z.number().default(1.0),
})
export type EvidenceInput = z.input<typeof evidenceInput>

// ---------------------------------------------------------------------------
// threads
// ---------------------------------------------------------------------------
export const threadRow = z.object({
  id: uuid,
  user_id: uuid,
  title: z.string(),
  status: threadStatus,
  priority_signal: z.number(),
  last_touched: iso,
  created_at: iso,
})
export type ThreadRow = z.infer<typeof threadRow>

export const threadInsert = z.object({
  user_id: uuid,
  title: z.string().min(1),
  status: threadStatus.default('open'),
  priority_signal: z.number().default(0),
})
export type ThreadInsert = z.input<typeof threadInsert>

// ---------------------------------------------------------------------------
// next_actions
// ---------------------------------------------------------------------------
export const nextActionRow = z.object({
  id: uuid,
  user_id: uuid,
  thread_id: uuid.nullable(),
  title: z.string(),
  first_physical_step: z.string().nullable(),
  energy_cost: actionEnergy,
  status: actionStatus,
  created_from: uuid.nullable(),
  created_at: iso,
})
export type NextActionRow = z.infer<typeof nextActionRow>

export const nextActionInsert = z.object({
  user_id: uuid,
  title: z.string().min(1),
  thread_id: uuid.nullable().optional(),
  first_physical_step: z.string().nullable().optional(),
  energy_cost: actionEnergy.default('med'),
  status: actionStatus.default('suggested'),
  created_from: uuid.nullable().optional(),
})
export type NextActionInsert = z.input<typeof nextActionInsert>

// ---------------------------------------------------------------------------
// state_log
// ---------------------------------------------------------------------------
export const stateLogRow = z.object({
  id: uuid,
  user_id: uuid,
  ts: iso,
  state: lifeState,
  note: z.string().nullable(),
})
export type StateLogRow = z.infer<typeof stateLogRow>

export const stateLogInsert = z.object({
  user_id: uuid,
  state: lifeState,
  note: z.string().nullable().optional(),
})
export type StateLogInsert = z.input<typeof stateLogInsert>

// ---------------------------------------------------------------------------
// recommendations
// ---------------------------------------------------------------------------
export const provenanceRef = z.object({
  kind: z.enum(['memory_item', 'entry', 'thread']),
  id: uuid,
  label: z.string().optional(),
})
export type ProvenanceRef = z.infer<typeof provenanceRef>

export const recommendationRow = z.object({
  id: uuid,
  user_id: uuid,
  ts: iso,
  action_id: uuid.nullable(),
  rationale: z.string().nullable(),
  provenance_refs: z.array(provenanceRef),
  chosen: z.boolean().nullable(),
  feedback: z.string().nullable(),
  outcome: z.string().nullable(),
  outcome_ts: iso.nullable(),
})
export type RecommendationRow = z.infer<typeof recommendationRow>

export const recommendationInsert = z.object({
  user_id: uuid,
  action_id: uuid.nullable().optional(),
  rationale: z.string().nullable().optional(),
  provenance_refs: z.array(provenanceRef).default([]),
})
export type RecommendationInsert = z.input<typeof recommendationInsert>

export const recommendationFeedback = z.object({
  chosen: z.boolean().optional(),
  feedback: z.enum(['helpful', 'not_now', 'wrong', 'done', 'skipped']).optional(),
  outcome: z.string().optional(),
})
export type RecommendationFeedback = z.infer<typeof recommendationFeedback>
