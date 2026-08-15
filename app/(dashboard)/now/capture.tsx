'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Frictionless capture with an offline queue: if the machine is asleep/offline,
// the note is stored locally and replayed on the next load. Honors the "machine
// must be on" reality without making the phone feel broken.
const KEY = 'lifeos_pending_entries'

function readQueue(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
function writeQueue(q: string[]) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

async function postEntry(content: string): Promise<boolean> {
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return res.ok
}

export function Capture() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  // flush any offline-queued captures on mount
  useEffect(() => {
    const q = readQueue()
    if (q.length === 0 || !navigator.onLine) return
    void (async () => {
      const remaining: string[] = []
      for (const c of q) {
        try {
          if (!(await postEntry(c))) remaining.push(c)
        } catch {
          remaining.push(c)
        }
      }
      writeQueue(remaining)
      if (remaining.length === 0) router.refresh()
    })()
  }, [router])

  async function submit() {
    const content = value.trim()
    if (!content || busy) return
    setBusy(true)
    setNote(null)
    try {
      if (!(await postEntry(content))) throw new Error('failed')
      setValue('')
      router.refresh()
    } catch {
      const q = readQueue()
      q.push(content)
      writeQueue(q)
      setValue('')
      setNote("Saved offline — I'll sync it when you're back online.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
        }}
        placeholder="Jot anything down…"
        rows={3}
        className="w-full resize-none rounded-lg border border-input bg-card p-4 text-base outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
        <button
          onClick={submit}
          disabled={busy || value.trim().length === 0}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}
