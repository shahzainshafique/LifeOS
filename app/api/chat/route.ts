import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { entriesRepo } from '@/lib/db'
import { enqueueExtract } from '@/jobs/boss'
import { getGateway, PROMPTS, type Msg } from '@/lib/llm'
import { guardTurn, screenAssistant } from '@/lib/safety'
import { logger } from '@/lib/observability/logger'

const bodySchema = z.object({ message: z.string().min(1) })

function streamHeaders() {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  }
}

// Streams the assistant reply token-by-token. The input crisis gate still runs
// FIRST and short-circuits the model. Output is screened before it's persisted.
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return new Response('unauthorized', { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('invalid body', { status: 400 })
  const message = parsed.data.message
  const repo = entriesRepo(auth.supabase)
  const encoder = new TextEncoder()

  const userEntry = await repo.create({ user_id: auth.user.id, content: message, role: 'user' })
  enqueueExtract({ userId: auth.user.id, entryId: userEntry.id, text: message }).catch((e) =>
    logger.warn({ kind: 'enqueue', error: String(e) }, 'extract enqueue failed'),
  )

  // SAFETY GATE (input): crisis short-circuits the model entirely.
  const guard = guardTurn(message)
  if (guard.crisis && guard.message) {
    await repo.create({ user_id: auth.user.id, content: guard.message, role: 'assistant' })
    const msg = guard.message
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(msg))
          controller.close()
        },
      }),
      { headers: streamHeaders() },
    )
  }

  const recent = await repo.listRecent(auth.user.id, 8)
  const history: Msg[] = recent
    .slice()
    .reverse()
    .map((e) => ({ role: e.role === 'assistant' ? 'assistant' : 'user', content: e.content }))
  const messages: Msg[] = [{ role: 'system', content: PROMPTS.chat.system }, ...history]

  const stream = new ReadableStream({
    async start(controller) {
      let full = ''
      try {
        for await (const chunk of getGateway().stream(messages, { temperature: 0.7 })) {
          full += chunk
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (e) {
        logger.error({ kind: 'chat', error: String(e) }, 'chat stream failed')
        if (full === '') {
          controller.enqueue(encoder.encode("I couldn't reach the model just now — is Ollama running?"))
        }
      } finally {
        const finalText = screenAssistant(full).text
        if (finalText.trim()) {
          try {
            await repo.create({ user_id: auth.user.id, content: finalText, role: 'assistant' })
          } catch (e) {
            logger.warn({ kind: 'chat', error: String(e) }, 'persist assistant entry failed')
          }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: streamHeaders() })
}
