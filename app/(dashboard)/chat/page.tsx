import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { entriesRepo } from '@/lib/db'
import { ChatUI } from './chat-ui'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const recent = await entriesRepo(supabase).listRecent(user.id, 20)
  const initial = recent
    .slice()
    .reverse()
    .map((e) => ({ id: e.id, role: e.role, content: e.content }))

  return <ChatUI initial={initial} />
}
