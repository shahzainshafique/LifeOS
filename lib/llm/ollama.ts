import { Ollama } from 'ollama'
import { z } from 'zod'
import { llmConfig } from './config'
import { llmTrace } from '@/lib/observability/logger'
import type { GenResult, ModelGateway, StructuredArgs } from './types'

const client = new Ollama({ host: llmConfig.ollamaHost })

// Keep the model resident between calls so we don't pay the multi-second cold
// reload into VRAM on every request. This is the single biggest local-latency win.
const KEEP_ALIVE = '30m'

export function ollamaGateway(): ModelGateway {
  return {
    async generate(messages, opts): Promise<GenResult> {
      const model = opts?.model ?? llmConfig.chatModel
      const t0 = Date.now()
      try {
        const res = await client.chat({
          model,
          messages,
          stream: false,
          keep_alive: KEEP_ALIVE,
          options: { temperature: opts?.temperature ?? 0.7 },
        })
        const latencyMs = Date.now() - t0
        llmTrace({ op: 'generate', model, latencyMs, ok: true })
        return { text: res.message.content, model, latencyMs }
      } catch (e) {
        llmTrace({ op: 'generate', model, latencyMs: Date.now() - t0, ok: false, error: String(e) })
        throw e
      }
    },

    async generateStructured<T>({ messages, schema, model, temperature }: StructuredArgs<T>): Promise<T> {
      const m = model ?? llmConfig.extractModel
      const t0 = Date.now()
      // zod emits a `$schema` key llama.cpp's grammar converter doesn't need; drop it.
      const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>
      delete jsonSchema.$schema
      try {
        const res = await client.chat({
          model: m,
          messages,
          stream: false,
          format: jsonSchema,
          keep_alive: KEEP_ALIVE,
          // low temperature: we want faithful structure, not creativity
          options: { temperature: temperature ?? 0.2 },
        })
        const parsed = schema.parse(JSON.parse(res.message.content))
        llmTrace({ op: 'generateStructured', model: m, latencyMs: Date.now() - t0, ok: true })
        return parsed
      } catch (e) {
        llmTrace({ op: 'generateStructured', model: m, latencyMs: Date.now() - t0, ok: false, error: String(e) })
        throw e
      }
    },

    async *stream(messages, opts) {
      const model = opts?.model ?? llmConfig.chatModel
      const res = await client.chat({
        model,
        messages,
        stream: true,
        keep_alive: KEEP_ALIVE,
        options: { temperature: opts?.temperature ?? 0.7 },
      })
      for await (const part of res) {
        if (part.message?.content) yield part.message.content
      }
    },

    async embed(texts, opts): Promise<number[][]> {
      const model = opts?.model ?? llmConfig.embedModel
      const res = await client.embed({ model, input: texts })
      return res.embeddings
    },
  }
}
