'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { MemoryItemRow } from '@/lib/domain'

const TYPE_LABEL: Record<string, string> = {
  fact: 'Fact',
  observation: 'Observation',
  inference: 'Inference',
  hypothesis: 'Hypothesis',
  preference: 'Preference',
  value: 'Value',
  strength: 'Strength',
  challenge: 'Challenge',
  goal: 'Goal',
  commitment: 'Commitment',
}

export function MemoryItem({ item, sources }: { item: MemoryItemRow; sources: string[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(item.content)
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    try {
      await fetch(`/api/memory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        <span className="text-xs text-muted-foreground">{(item.confidence * 100).toFixed(0)}% sure</span>
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={busy || !content.trim()}
              onClick={() => patch({ content: content.trim() })}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setContent(item.content)
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm">{item.content}</p>
      )}

      {sources.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">Based on what you said</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {sources.slice(0, 3).map((s, i) => (
              <li key={i} className="text-xs italic text-muted-foreground">
                “{s.length > 160 ? `${s.slice(0, 160)}…` : s}”
              </li>
            ))}
          </ul>
        </details>
      )}

      {!editing && (
        <div className="mt-3 flex gap-4 text-xs">
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
            Correct
          </button>
          <button
            disabled={busy}
            onClick={() => patch({ status: 'refuted' })}
            className="text-muted-foreground hover:text-destructive disabled:opacity-40"
          >
            Not true
          </button>
        </div>
      )}
    </li>
  )
}
