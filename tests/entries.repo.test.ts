import { describe, expect, it } from 'vitest'
import { entriesRepo } from '@/lib/db/entries'
import { mockDb } from './helpers/mockDb'

const USER = '11111111-1111-4111-8111-111111111111'

describe('entriesRepo.create', () => {
  it('applies defaults and parses the returned row', async () => {
    const row = {
      id: '44444444-4444-4444-8444-444444444444',
      user_id: USER,
      ts: '2026-01-01T00:00:00Z',
      role: 'user',
      modality: 'text',
      content: 'hello world',
      session_id: null,
    }
    const { client, calls } = mockDb({ entries: { data: row } })

    const created = await entriesRepo(client).create({ user_id: USER, content: 'hello world' })

    expect(created.content).toBe('hello world')
    expect(created.role).toBe('user')
    expect(created.modality).toBe('text')
    expect(calls.some((c) => c.table === 'entries' && c.op === 'insert')).toBe(true)
  })
})
