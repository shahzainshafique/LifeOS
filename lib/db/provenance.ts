import { requiresEvidence, type MemoryType } from '@/lib/domain'

/**
 * The provenance invariant, in code. Design principle: "no belief without a receipt."
 * AI-inferred belief types (observation/inference/hypothesis) must cite >= 1 evidence.
 */
export class ProvenanceError extends Error {
  constructor(type: MemoryType) {
    super(
      `Provenance invariant violated: a memory_item of type "${type}" requires >= 1 evidence row (no belief without a receipt).`,
    )
    this.name = 'ProvenanceError'
  }
}

export function assertProvenance(type: MemoryType, evidence: { source_id: string }[]): void {
  if (requiresEvidence(type) && evidence.length === 0) {
    throw new ProvenanceError(type)
  }
}
