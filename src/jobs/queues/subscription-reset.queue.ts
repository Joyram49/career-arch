import { prisma } from '@config/database';
import { logger } from '@config/logger';
import { redis } from '@config/redis';
import { Queue, Worker } from 'bullmq';
import { startOfMonth } from 'date-fns';

const QUEUE_NAME = 'subscription-reset';

// ── Queue (schedules the repeating job) ──────────────────────────────────
export const subscriptionResetQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// ── Register the repeating cron job (call once on app startup) ────────────
export async function scheduleMonthlyReset(): Promise<void> {
  // Remove any existing repeatable jobs first to avoid duplicates on restart
  const repeatableJobs = await subscriptionResetQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await subscriptionResetQueue.removeRepeatableByKey(job.key);
  }

  // Schedule: 00:00 on the 1st of every month (UTC)
  await subscriptionResetQueue.add(
    'reset-apply-counters',
    {},
    {
      repeat: { pattern: '0 0 1 * *' }, // cron: minute hour day month weekday
      jobId: 'monthly-subscription-reset', // stable ID prevents duplicates
    },
  );

  logger.info('✅ Monthly subscription reset cron scheduled (00:00 on 1st of month)');
}

// ── Worker (processes the job) ────────────────────────────────────────────
export const subscriptionResetWorker = new Worker(
  QUEUE_NAME,
  async () => {
    const monthStart = startOfMonth(new Date());

    const result = await prisma.subscription.updateMany({
      where: {
        plan: { not: 'FREE' },
        applyCountResetAt: { lt: monthStart },
      },
      data: {
        applyCountThisMonth: 0,
        applyCountResetAt: monthStart,
      },
    });

    logger.info(`Monthly reset: cleared apply counters for ${result.count} subscription(s)`);
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

subscriptionResetWorker.on('completed', (job) => {
  logger.info(`Subscription reset job ${job.id} completed`);
});

subscriptionResetWorker.on('failed', (job, err) => {
  logger.error(`Subscription reset job ${job?.id} failed:`, err);
});
