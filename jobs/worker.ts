import { getBoss, QUEUES, type ExtractEntryJob } from './boss'
import { createServiceClient } from '@/lib/db'
import { processEntry } from '@/lib/memory'
import { logger } from '@/lib/observability/logger'

// Standalone worker process: run with `npm run worker`. It owns the slow AI work
// (extraction + embedding) so request handlers stay thin. Uses the service-role
// client (bypasses RLS) and always scopes by the job's userId.

async function main() {
  const boss = await getBoss()
  const db = createServiceClient()

  await boss.work<ExtractEntryJob>(QUEUES.extractEntry, async (jobs) => {
    for (const job of jobs) {
      const { userId, entryId, text } = job.data
      try {
        await processEntry(db, userId, entryId, text)
      } catch (e) {
        logger.error(
          { kind: 'worker', queue: QUEUES.extractEntry, entryId, error: String(e) },
          'extract job failed; will retry',
        )
        throw e // surface to pg-boss so it retries
      }
    }
  })

  // Nightly consolidation seam. v1 is a logged no-op; Slice 2 fills in summaries,
  // dedup, and status upkeep. Wired now so the schedule exists from day one.
  await boss.work(QUEUES.consolidate, async () => {
    logger.info({ kind: 'worker', queue: QUEUES.consolidate }, 'nightly consolidate (v1 placeholder)')
  })
  await boss.schedule(QUEUES.consolidate, '0 3 * * *')

  logger.info({ kind: 'worker' }, 'LifeOS worker started; queues online')
}

main().catch((e) => {
  logger.error({ kind: 'worker', error: String(e) }, 'worker failed to start')
  process.exit(1)
})
