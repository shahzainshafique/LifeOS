import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { actionsRepo, recommendationsRepo } from '@/lib/db'

const bodySchema = z.object({
  action: z.enum(['done', 'not_now', 'wrong']),
  actionId: z.string().uuid().nullable().optional(),
})

// Closes the loop: records the user's response to a recommendation and updates the
// underlying action's status (done/dismissed) so the decision engine moves on.
const MAP = {
  done: { status: 'done', fb: { chosen: true, feedback: 'done', outcome: 'completed' } },
  not_now: { status: 'dismissed', fb: { chosen: false, feedback: 'not_now', outcome: 'deferred' } },
  wrong: { status: 'dismissed', fb: { chosen: false, feedback: 'wrong', outcome: 'rejected' } },
} as const

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const m = MAP[parsed.data.action]
  await recommendationsRepo(auth.supabase).recordFeedback(id, m.fb)
  if (parsed.data.actionId) {
    await actionsRepo(auth.supabase).setStatus(parsed.data.actionId, m.status)
  }
  return NextResponse.json({ ok: true })
}
