import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { entriesRepo } from '@/lib/db'
import { enqueueExtract } from '@/jobs/boss'
import { logger } from '@/lib/observability/logger'

const bodySchema = z.object({
  content: z.string().min(1),
  modality: z.string().optional(),
})

// Frictionless capture: store the entry, then enqueue extraction. Enqueue is
// best-effort — capture must never fail because the worker/queue is unavailable.
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const entry = await entriesRepo(auth.supabase).create({
    user_id: auth.user.id,
    content: parsed.data.content,
    modality: parsed.data.modality ?? 'text',
    role: 'user',
  })

  try {
    await enqueueExtract({ userId: auth.user.id, entryId: entry.id, text: entry.content })
  } catch (e) {
    logger.warn({ kind: 'enqueue', entryId: entry.id, error: String(e) }, 'extract enqueue failed (non-fatal)')
  }

  return NextResponse.json({ entry }, { status: 201 })
}

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const entries = await entriesRepo(auth.supabase).listRecent(auth.user.id, 20)
  return NextResponse.json({ entries })
}
