import { PgBoss } from 'pg-boss'

// pg-boss connects directly to the local Postgres (not via PostgREST). Shared by the
// Next app (as a sender) and the standalone worker process (as a consumer).

export const QUEUES = {
  extractEntry: 'extract-entry',
  consolidate: 'consolidate-nightly',
} as const

export interface ExtractEntryJob {
  userId: string
  entryId: string
  text: string
}

let boss: PgBoss | null = null
let starting: Promise<PgBoss> | null = null

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss
  if (starting) return starting
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required for pg-boss')

  starting = (async () => {
    const b = new PgBoss({ connectionString })
    await b.start()
    // idempotent — safe to call from every process on startup
    await b.createQueue(QUEUES.extractEntry)
    await b.createQueue(QUEUES.consolidate)
    boss = b
    return b
  })()
  return starting
}

export async function enqueueExtract(job: ExtractEntryJob): Promise<void> {
  const b = await getBoss()
  await b.send(QUEUES.extractEntry, job)
}
