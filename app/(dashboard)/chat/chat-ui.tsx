'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

type Turn = { id: string; role: string; content: string }

export function ChatUI({ initial }: { initial: Turn[] }) {
  const router = useRouter()
  const [turns, setTurns] = useState<Turn[]>(initial)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, busy])

  async function send() {
    const message = value.trim()
    if (!message || busy) return
    setBusy(true)
    setValue('')
    const aid = `a-${Date.now()}`
    setTurns((t) => [
      ...t,
      { id: `u-${Date.now()}`, role: 'user', content: message },
      { id: aid, role: 'assistant', content: '' },
    ])
    setStreamingId(aid)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        acc += decoder.decode(chunk, { stream: true })
        setTurns((t) => t.map((x) => (x.id === aid ? { ...x, content: acc } : x)))
      }
      // extraction from this message may add memory/threads → refresh Now silently
      router.refresh()
    } catch {
      setTurns((t) => t.map((x) => (x.id === aid ? { ...x, content: 'Network error.' } : x)))
    } finally {
      setStreamingId(null)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.75rem)] w-full max-w-xl flex-col px-4">
      <div className="flex-1 overflow-y-auto py-6">
        {turns.length === 0 && (
          <div className="mt-16 text-center">
            <p className="font-heading text-xl">What&apos;s on your mind?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Or what&apos;s making this hard right now? Even &ldquo;I don&apos;t know&rdquo; is a fine place to start.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {turns.map((t) => {
            const isUser = t.role === 'user'
            const streaming = t.id === streamingId
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={isUser ? 'max-w-[85%] self-end' : 'max-w-[92%] self-start'}
              >
                <div
                  className={cn(
                    'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                    isUser
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-card/70 backdrop-blur',
                  )}
                >
                  {t.content}
                  {streaming && (
                    <motion.span
                      className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    />
                  )}
                  {streaming && t.content === '' && (
                    <span className="text-muted-foreground">thinking…</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 flex items-end gap-2 border-t border-border/60 bg-background/60 py-3 backdrop-blur-xl">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Say anything…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-input bg-card/70 p-3 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-ring"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={send}
          disabled={busy || !value.trim()}
          className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Send
        </motion.button>
      </div>
    </div>
  )
}
