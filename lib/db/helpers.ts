import { z } from 'zod'

// Supabase JS returns { data, error }. These helpers throw on error and zod-parse
// the result, so a schema/DB drift fails loudly at the boundary instead of leaking
// untyped rows into the app.

type PgResult = { data: unknown; error: { message: string } | null }

export function must<T>(res: PgResult, schema: z.ZodType<T>): T {
  if (res.error) throw new Error(res.error.message)
  return schema.parse(res.data)
}

export function mustList<T>(res: PgResult, schema: z.ZodType<T>): T[] {
  if (res.error) throw new Error(res.error.message)
  return z.array(schema).parse(res.data ?? [])
}
