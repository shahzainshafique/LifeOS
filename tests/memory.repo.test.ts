import { describe, expect, it } from 'vitest'
import { memoryRepo } from '@/lib/db/memory'
import { ProvenanceError } from '@/lib/db/provenance'
import { mockDb } from './helpers/mockDb'

const USER = '11111111-1111-4111-8111-111111111111'
const MI_ID = '22222222-2222-4222-8222-222222222222'
const SRC = '33333333-3333-4333-8333-333333333333'

function miRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MI_ID,
    user_id: USER,
    type: 'observation',
    content: 'avoids project after ambiguous tasks',
    subject: null,
    status: 'active',
    confidence: 0.5,
    first_seen: '2026-01-01T00:00:00Z',
    last_seen: '2026-01-01T00:00:00Z',
    superseded_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('memoryRepo.create — provenance enforcement', () => {
  it('throws BEFORE any write when an inferred belief lacks evidence', async () => {
    const { client, calls } = mockDb({})
    await expect(
      memoryRepo(client).create({ user_id: USER, type: 'inference', content: 'a guess' }, []),
    ).rejects.toBeInstanceOf(ProvenanceError)
    expect(calls.length).toBe(0)
  })

  it('inserts belief + evidence for a valid observation', async () => {
    const { client, calls } = mockDb({
      memory_items: { data: miRow() },
      evidence: { data: null, error: null },
    })
    const created = await memoryRepo(client).create(
      { user_id: USER, type: 'observation', content: 'avoids project' },
      [{ source_id: SRC }],
    )
    expect(created.id).toBe(MI_ID)
    expect(calls.some((c) => c.table === 'memory_items' && c.op === 'insert')).toBe(true)
    expect(calls.some((c) => c.table === 'evidence' && c.op === 'insert')).toBe(true)
  })

  it('allows a directly-stated fact with no evidence', async () => {
    const { client, calls } = mockDb({ memory_items: { data: miRow({ type: 'fact' }) } })
    const created = await memoryRepo(client).create(
      { user_id: USER, type: 'fact', content: 'works in tech' },
      [],
    )
    expect(created.type).toBe('fact')
    expect(calls.filter((c) => c.table === 'evidence').length).toBe(0)
  })

  it('rolls back the belief if the evidence insert fails', async () => {
    const { client, calls } = mockDb({
      memory_items: { data: miRow() },
      evidence: { error: { message: 'boom' } },
    })
    await expect(
      memoryRepo(client).create(
        { user_id: USER, type: 'observation', content: 'x' },
        [{ source_id: SRC }],
      ),
    ).rejects.toThrow(/rolled back/)
    expect(calls.some((c) => c.table === 'memory_items' && c.op === 'delete')).toBe(true)
  })
})
