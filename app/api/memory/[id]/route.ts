import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { memoryRepo } from '@/lib/db'
import { memoryStatus } from '@/lib/domain'

const bodySchema = z.object({
  content: z.string().min(1).optional(),
  status: memoryStatus.optional(),
})

// The trust surface: the user is the final authority. They can correct a belief's
// wording or change its status (e.g. refute it). Status changes are reversible.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || (!parsed.data.content && !parsed.data.status)) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const repo = memoryRepo(auth.supabase)
  let row
  if (parsed.data.content) row = await repo.correct(id, parsed.data.content)
  if (parsed.data.status) row = await repo.setStatus(id, parsed.data.status)
  return NextResponse.json({ memory: row })
}
