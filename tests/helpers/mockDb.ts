import type { SupabaseClient } from '@supabase/supabase-js'

export type MockResult = { data?: unknown; error?: { message: string } | null }
type TableConfig = MockResult | (() => MockResult)

export type RecordedCall = { table: string; op: 'insert' | 'update' | 'delete'; arg?: unknown }

/**
 * A tiny stand-in for the Supabase query builder. It records terminal write ops and
 * returns a per-table configured result, whether the caller ends the chain with
 * `.single()`, `.maybeSingle()`, or just awaits the builder (thenable). Lets us test
 * repository logic — especially the provenance invariant — with no live database.
 */
export function mockDb(config: Record<string, TableConfig>) {
  const calls: RecordedCall[] = []

  function from(table: string) {
    const resolve = (): { data: unknown; error: { message: string } | null } => {
      const c = config[table]
      const r = typeof c === 'function' ? c() : c
      return { data: r?.data ?? null, error: r?.error ?? null }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {
      insert(arg: unknown) {
        calls.push({ table, op: 'insert', arg })
        return q
      },
      update(arg: unknown) {
        calls.push({ table, op: 'update', arg })
        return q
      },
      delete() {
        calls.push({ table, op: 'delete' })
        return q
      },
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      limit: () => q,
      single: () => Promise.resolve(resolve()),
      maybeSingle: () => Promise.resolve(resolve()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (onF: any, onR: any) => Promise.resolve(resolve()).then(onF, onR),
    }
    return q
  }

  return { client: { from } as unknown as SupabaseClient, calls }
}
