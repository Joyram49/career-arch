import http from 'http';

import { connectDatabase, disconnectDatabase } from '@config/database';
import { verifyEmailConnection } from '@config/email';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { redis } from '@config/redis';
import {
  scheduleMonthlyReset,
  subscriptionResetWorker,
} from '@jobs/queues/subscription-reset.queue';
import { config } from 'dotenv';

import app from './app';
import { initSocket } from './config/socket';
import { emailQueue } from './jobs/queues/email.queue';
import { emailWorker } from './jobs/queues/email.worker';

config();

const PORT = env.PORT;
let server: ReturnType<typeof app.listen> | undefined;

// ── Startup sequence ───────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    // 1. Connect to database
    await connectDatabase();

    // 2. Verify email transport (non-blocking)
    void verifyEmailConnection();

    // 3. Schedule monthly subscription reset cron (BullMQ)
    if (env.NODE_ENV !== 'test') {
      await scheduleMonthlyReset();
    }

    // 4. Create HTTP server from Express app
    const httpServer = http.createServer(app);

    // 5. Attach Socket.IO to the HTTP server
    initSocket(httpServer);

    // 6. Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 CareerArch API running on port ${PORT}`);
      logger.info(`📖 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server?.close(() => {
    void (async () => {
      logger.info('HTTP server closed');

      try {
        // Close BullMQ workers first (finish in-flight jobs)
        await emailWorker.close();
        await subscriptionResetWorker.close();

        // Close BullMQ queue connections
        await emailQueue.close();

        await disconnectDatabase();
        await redis.quit();

        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    })();
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

void start();
