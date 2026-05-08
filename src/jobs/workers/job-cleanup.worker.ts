import { redis } from '@config/redis';
import { cleanupExpiredJobs } from '@modules/jobs/services/job.service';
import { Queue, Worker } from 'bullmq';

import { logger } from '@/config/logger';

const QUEUE_NAME = 'job-cleanup';

// ── Queue ──────────────────────────────────────────────────────────────────

export const jobCleanupQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// ── Register repeating cron (call once on app startup) ────────────────────

export async function scheduleJobCleanupCron(): Promise<void> {
  // Remove stale repeatable jobs on restart to avoid duplicates
  const repeatableJobs = await jobCleanupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await jobCleanupQueue.removeRepeatableByKey(job.key);
  }

  // Daily at 02:00 UTC — runs before incentive overdue (02:30) and subscription reset (00:00)
  await jobCleanupQueue.add(
    'cleanup-expired-jobs',
    {},
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'job-cleanup-daily',
    },
  );

  logger.info('✅ Job cleanup cron scheduled (02:00 UTC daily)');
}

// ── Worker ─────────────────────────────────────────────────────────────────

export const jobCleanupWorker = new Worker(
  QUEUE_NAME,
  async () => {
    const count = await cleanupExpiredJobs();
    logger.info(`Job cleanup worker: permanently deleted ${count} expired job(s)`);
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

jobCleanupWorker.on('completed', (job) => {
  logger.info(`Job cleanup job ${job.id} completed`);
});

jobCleanupWorker.on('failed', (job, err) => {
  logger.error(`Job cleanup job ${job?.id} failed:`, err);
});
