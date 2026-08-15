import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { stateRepo } from '@/lib/db'
import { lifeState } from '@/lib/domain'

const bodySchema = z.object({ state: lifeState, note: z.string().optional() })

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const row = await stateRepo(auth.supabase).log({
    user_id: auth.user.id,
    state: parsed.data.state,
    note: parsed.data.note,
  })
  return NextResponse.json({ state: row }, { status: 201 })
}
