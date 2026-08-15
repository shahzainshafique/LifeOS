// Central LLM config, sourced from env with local-first defaults.
// Model choices reflect the validated hardware (RTX 4050, 6 GB VRAM): one ~7B
// instruct model resident for chat + extraction, nomic-embed-text for embeddings.
export const llmConfig = {
  ollamaHost: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  chatModel: process.env.LLM_CHAT_MODEL ?? 'qwen2.5:7b-instruct',
  extractModel: process.env.LLM_EXTRACT_MODEL ?? 'qwen2.5:7b-instruct',
  embedModel: process.env.LLM_EMBED_MODEL ?? 'nomic-embed-text',
  embedDim: Number(process.env.LLM_EMBED_DIM ?? 768),
  /** Escape hatch. OFF by default → nothing leaves the machine. */
  cloudEnabled: process.env.CLOUD_LLM_ENABLED === 'true',
} as const
