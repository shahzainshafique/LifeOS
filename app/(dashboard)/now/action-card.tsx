'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BorderBeam } from '@/components/ui/border-beam'
import { BlurFade } from '@/components/ui/blur-fade'
import type { NowPayload } from '@/lib/decision'

type Phase = 'idle' | 'generating' | 'error'

// Owns the recommendation lifecycle on the client so the 20–30s model call never
// blocks the server render. Renders instantly; the action fades in when ready.
export function NextAction({ now: initial }: { now: NowPayload }) {
  const [payload, setPayload] = useState<NowPayload>(initial)
  const [phase, setPhase] = useState<Phase>(initial.pending ? 'generating' : 'idle')
  const [busy, setBusy] = useState<string | null>(null)
  const started = useRef(false)

  async function generate(force: boolean) {
    setPhase('generating')
    try {
      const res = await fetch('/api/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = (await res.json().catch(() => null)) as { now?: NowPayload } | null
      if (data?.now?.action) {
        setPayload(data.now)
        setPhase('idle')
      } else {
        setPhase('error')
      }
    } catch {
      setPhase('error')
    }
  }

  useEffect(() => {
    if (initial.pending && !started.current) {
      started.current = true
      void generate(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function feedback(action: 'done' | 'not_now' | 'wrong') {
    if (!payload.recommendationId) return
    setBusy(action)
    try {
      await fetch(`/api/recommendations/${payload.recommendationId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, actionId: payload.action?.id ?? null }),
      })
      await generate(true) // hand them the next thing
    } finally {
      setBusy(null)
    }
  }

  if (phase === 'generating') return <ThinkingCard />
  if (phase === 'error') {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          I couldn&apos;t think this through just now — is Ollama running?
        </p>
        <button
          onClick={() => generate(true)}
          className="mt-3 self-start rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Try again
        </button>
      </Card>
    )
  }

  const a = payload.action
  if (!a) return <ThinkingCard />

  return (
    <BlurFade key={a.id} duration={0.5}>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <BorderBeam size={150} duration={9} borderWidth={1.5} colorFrom="#a78bfa" colorTo="#60a5fa" />

        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          One thing, right now
        </span>
        <h2 className="mt-2 font-heading text-2xl leading-tight sm:text-3xl">{a.title}</h2>
        {a.first_physical_step && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 select-none text-foreground/60">↳</span>
            <span>{a.first_physical_step}</span>
          </p>
        )}

        {payload.rationale && (
          <details className="group mt-4 text-sm">
            <summary className="cursor-pointer list-none text-muted-foreground transition-colors hover:text-foreground">
              <span className="underline decoration-dotted underline-offset-4">Why this?</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{payload.rationale}</p>
            {payload.considered.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 border-l border-border pl-3">
                {payload.considered.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    Set aside <span className="text-foreground">{c.option}</span> — {c.why_not}
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => feedback('done')}
            disabled={!!busy}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-40"
          >
            {busy === 'done' ? '…' : 'I did it'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => feedback('not_now')}
            disabled={!!busy}
            className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-40"
          >
            Not now
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => feedback('wrong')}
            disabled={!!busy}
            className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-40"
          >
            That&apos;s not it
          </motion.button>
          <button
            onClick={() => generate(true)}
            disabled={!!busy}
            className="ml-auto rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            ↻ Rethink
          </button>
        </div>

        {typeof payload.confidence === 'number' && (
          <p className="mt-3 text-xs text-muted-foreground">confidence {(payload.confidence * 100).toFixed(0)}%</p>
        )}
      </div>
    </BlurFade>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card/70 p-6 backdrop-blur-xl">{children}</div>
  )
}

function ThinkingCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        One thing, right now
      </span>
      <div className="mt-3 flex items-center gap-2">
        <p className="font-heading text-xl text-muted-foreground">Finding your one thing</p>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </span>
      </div>
      <div className="mt-5 h-10 w-40 rounded-lg bg-muted/60" />
    </div>
  )
}
