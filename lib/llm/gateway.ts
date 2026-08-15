import { llmConfig } from './config'
import { ollamaGateway } from './ollama'
import { anthropicGateway } from './anthropic'
import type { ModelGateway } from './types'

let cached: ModelGateway | null = null

/**
 * The single entry point features use to reach a model. Local Ollama by default;
 * the cloud escape hatch only when explicitly enabled. Cached per process.
 */
export function getGateway(): ModelGateway {
  if (cached) return cached
  cached = llmConfig.cloudEnabled ? anthropicGateway() : ollamaGateway()
  return cached
}
