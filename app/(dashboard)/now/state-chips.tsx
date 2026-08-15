'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const STATES: [string, string][] = [
  ['focused', 'Focused'],
  ['normal', 'Normal'],
  ['motivated', 'Motivated'],
  ['reflective', 'Reflective'],
  ['uncertain', 'Uncertain'],
  ['restless', 'Restless'],
  ['low_energy', 'Low energy'],
  ['overwhelmed', 'Overwhelmed'],
]

export function StateChips({ current }: { current: string | null }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(current)
  const [busy, setBusy] = useState(false)

  async function set(state: string) {
    if (busy) return
    setSelected(state) // optimistic — feels instant
    setBusy(true)
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        How are you right now?
      </p>
      <div className="flex flex-wrap gap-2">
        {STATES.map(([value, label]) => {
          const active = selected === value
          return (
            <motion.button
              key={value}
              onClick={() => set(value)}
              disabled={busy}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'relative rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60',
                active
                  ? 'border-primary/40 text-primary-foreground'
                  : 'border-border bg-card/60 backdrop-blur hover:bg-accent',
              )}
            >
              {active && (
                <motion.span
                  layoutId="state-active"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
