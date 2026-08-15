// Minimal, dependency-free structured logger. Deliberately avoids pino/transports
// so it bundles cleanly in Next's server runtime and runs unchanged in the worker.
// Never log raw personal content — log ids, types, counts, latency.

type Level = 'debug' | 'info' | 'warn' | 'error'

function emit(level: Level, obj: Record<string, unknown>, msg?: string) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...obj })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (o: Record<string, unknown>, m?: string) => emit('debug', o, m),
  info: (o: Record<string, unknown>, m?: string) => emit('info', o, m),
  warn: (o: Record<string, unknown>, m?: string) => emit('warn', o, m),
  error: (o: Record<string, unknown>, m?: string) => emit('error', o, m),
}

export interface LlmTrace {
  op: string
  model: string
  latencyMs: number
  ok: boolean
  error?: string
}

export function llmTrace(t: LlmTrace) {
  logger.info({ kind: 'llm', ...t }, `llm.${t.op} ${t.model} ${t.latencyMs}ms ${t.ok ? 'ok' : 'ERR'}`)
}
