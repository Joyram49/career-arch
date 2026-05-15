import { Queue, Worker } from 'bullmq';

import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { redis } from '@/config/redis';

const QUEUE_NAME = 'unverified-expired-account-cleanup';

// ── Queue ──────────────────────────────────────────────────────────────────
export const unverifiedAccountCleanupQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// ── Register repeating cron (call once on app startup) ────────────────────
export async function scheduleUnverifiedAccountCleanup(): Promise<void> {
  // Remove existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await unverifiedAccountCleanupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await unverifiedAccountCleanupQueue.removeRepeatableByKey(job.key);
  }

  //   schedule: every one hour after app startup
  await unverifiedAccountCleanupQueue.add(
    'cleanup-unverified-accounts',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // cron: minute hour day month weekday
      jobId: 'hourly-unverified-account-cleanup', // stable ID prevents duplicates
    },
  );

  logger.info('✅Hourly unverified account cleanup cron scheduled 1 hour repeating');
}

// ── Worker (remove expired unverified accounts from user and org table from  the database ) ────────────────────────────────────────────
export const unverifiedAccountCleanupWorker = new Worker(
  QUEUE_NAME,
  async () => {
    await prisma.$transaction(async (tx) => {
      // Find unverified users whose verification token has expired
      await tx.organization.deleteMany({
        where: {
          isEmailVerified: false,
          emailVerifyExpiry: {
            lt: new Date(),
          },
        },
      });

      // Delete the expired unverified users
      await tx.user.deleteMany({
        where: {
          isEmailVerified: false,
          emailVerifyExpiry: {
            lt: new Date(),
          },
        },
      });
    });
    logger.info('✅ Running unverified account cleanup job...');
  },
  {
    connection: redis,
    concurrency: 1, // Ensure only one cleanup job runs at a time
  },
);
