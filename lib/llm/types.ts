import type { z } from 'zod'

export type Role = 'system' | 'user' | 'assistant'
export interface Msg {
  role: Role
  content: string
}

export interface GenOpts {
  model?: string
  temperature?: number
}

export interface GenResult {
  text: string
  model: string
  latencyMs: number
}

export interface StructuredArgs<T> extends GenOpts {
  messages: Msg[]
  schema: z.ZodType<T>
  schemaName?: string
}

/**
 * Provider-agnostic LLM interface. Nothing outside lib/llm should import a concrete
 * provider — features depend only on this shape, so swapping Ollama <-> cloud is a
 * config flip, never a code change.
 */
export interface ModelGateway {
  generate(messages: Msg[], opts?: GenOpts): Promise<GenResult>
  generateStructured<T>(args: StructuredArgs<T>): Promise<T>
  stream(messages: Msg[], opts?: GenOpts): AsyncIterable<string>
  embed(texts: string[], opts?: { model?: string }): Promise<number[][]>
}
