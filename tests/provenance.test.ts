import { describe, expect, it } from 'vitest'
import { assertProvenance, ProvenanceError } from '@/lib/db/provenance'
import { requiresEvidence } from '@/lib/domain'

describe('provenance invariant', () => {
  it('requires >= 1 evidence for AI-inferred belief types', () => {
    for (const t of ['observation', 'inference', 'hypothesis'] as const) {
      expect(requiresEvidence(t)).toBe(true)
      expect(() => assertProvenance(t, [])).toThrow(ProvenanceError)
      expect(() => assertProvenance(t, [{ source_id: 'e1' }])).not.toThrow()
    }
  })

  it('does not hard-require evidence for directly-stated types', () => {
    for (const t of ['fact', 'preference', 'value', 'strength', 'challenge', 'goal', 'commitment'] as const) {
      expect(requiresEvidence(t)).toBe(false)
      expect(() => assertProvenance(t, [])).not.toThrow()
    }
  })
})
