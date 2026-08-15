import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { loadNow } from '@/lib/decision'

// Generates the next action off the SSR path. Body { force: true } = Rethink
// (always fresh); otherwise generate only if there isn't a fresh one already.
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { force?: boolean }
  const now = await loadNow(auth.supabase, auth.user.id, { generate: true, force: !!body?.force })
  return NextResponse.json({ now })
}
