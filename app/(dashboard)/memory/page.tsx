import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { repos } from '@/lib/db'
import { MemoryItem } from './memory-item'

export const dynamic = 'force-dynamic'

export default async function MemoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const r = repos(supabase)
  const [beliefs, evidence] = await Promise.all([
    r.memory.listActive(user.id, 100),
    r.memory.allEvidence(user.id),
  ])

  // Resolve provenance to source snippets in one extra query (2 total).
  const srcIds = [...new Set(evidence.map((e) => e.source_id))]
  const srcs = await r.entries.byIds(srcIds)
  const srcMap = new Map(srcs.map((s) => [s.id, s.content]))
  const provByItem = new Map<string, string[]>()
  for (const e of evidence) {
    const src = srcMap.get(e.source_id)
    if (!src) continue
    const arr = provByItem.get(e.memory_item_id) ?? []
    arr.push(src)
    provByItem.set(e.memory_item_id, arr)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl">What LifeOS knows about you</h2>
        <p className="text-sm text-muted-foreground">
          Everything here is grounded in your own words, and typed by how sure it is. Correct anything
          that&apos;s off — you have the final say.
        </p>
      </header>

      {beliefs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing yet. As you talk, this fills in — and you can always edit it.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {beliefs.map((b) => (
            <MemoryItem key={b.id} item={b} sources={provByItem.get(b.id) ?? []} />
          ))}
        </ul>
      )}
    </div>
  )
}
