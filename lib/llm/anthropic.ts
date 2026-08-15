import type { ModelGateway } from './types'

/**
 * Cloud escape hatch — OFF by default. We ship 100% local until evals prove local
 * quality is insufficient for the decision/reflection surface. When that day comes:
 * install @anthropic-ai/sdk, implement these methods (dynamic import so a missing dep
 * never breaks the local build), and set CLOUD_LLM_ENABLED=true. Enabling this is the
 * ONLY path that sends user data off the machine, so it must stay a deliberate act.
 */
const REASON =
  'Cloud LLM adapter is not implemented. LifeOS runs fully local by default; ' +
  'enable + implement the Anthropic adapter deliberately (see lib/llm/anthropic.ts).'

export function anthropicGateway(): ModelGateway {
  return {
    async generate() {
      throw new Error(REASON)
    },
    async generateStructured<T>(): Promise<T> {
      throw new Error(REASON)
    },
    // eslint-disable-next-line require-yield
    async *stream(): AsyncIterable<string> {
      throw new Error(REASON)
    },
    async embed() {
      throw new Error(REASON)
    },
  }
}
