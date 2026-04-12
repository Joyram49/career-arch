import { connectDatabase, disconnectDatabase } from '@config/database';
import { verifyEmailConnection } from '@config/email';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { redis } from '@config/redis';
import { config } from 'dotenv';

import app from './app';

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

    // 3. Start HTTP server
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
