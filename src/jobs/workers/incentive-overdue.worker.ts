import { redis } from '@config/redis';
import { Queue, Worker } from 'bullmq';

import { logger } from '@/config/logger';
import { markOverdueIncentives } from '@/services/incentive/incentive.service';

const QUEUE_NAME = 'incentive-overdue';

// ── Queue ──────────────────────────────────────────────────────────────────

export const incentiveOverdueQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// ── Register repeating cron (call once on app startup) ────────────────────

export async function scheduleIncentiveOverdueCron(): Promise<void> {
  // Remove stale repeatable jobs on restart to avoid duplicates
  const repeatableJobs = await incentiveOverdueQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await incentiveOverdueQueue.removeRepeatableByKey(job.key);
  }

  // Daily at 02:30 UTC — after subscription reset (02:00) to avoid DB contention
  await incentiveOverdueQueue.add(
    'mark-overdue-incentives',
    {},
    {
      repeat: { pattern: '30 2 * * *' },
      jobId: 'incentive-overdue-daily',
    },
  );

  logger.info('✅ Incentive overdue cron scheduled (02:30 UTC daily)');
}

// ── Worker ─────────────────────────────────────────────────────────────────

export const incentiveOverdueWorker = new Worker(
  QUEUE_NAME,
  async () => {
    const count = await markOverdueIncentives();
    logger.info(`Incentive overdue worker: processed ${count} overdue incentive(s)`);
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

incentiveOverdueWorker.on('completed', (job) => {
  logger.info(`Incentive overdue job ${job.id} completed`);
});

incentiveOverdueWorker.on('failed', (job, err) => {
  logger.error(`Incentive overdue job ${job?.id} failed:`, err);
});
