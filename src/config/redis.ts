import Redis from 'ioredis';

import { env } from './env';
import { logger } from './logger';

class RedisClient {
  private static instance: Redis | null = null;

  public static getInstance(): Redis {
    if (RedisClient.instance === null) {
      RedisClient.instance = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy(times: number): number | null {
          if (times > 10) {
            logger.error('Redis: max retries reached, giving up');
            return null;
          }
          const delay = Math.min(times * 100, 3000);
          logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
        reconnectOnError(err: Error): boolean {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some((target) => err.message.includes(target));
        },
      });

      RedisClient.instance.on('connect', () => {
        logger.info('✅ Redis connected successfully');
      });

      RedisClient.instance.on('error', (err: Error) => {
        logger.error('❌ Redis error:', err.message);
      });

      RedisClient.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });

      RedisClient.instance.on('reconnecting', () => {
        logger.warn('Redis reconnecting...');
      });
    }

    return RedisClient.instance;
  }

  public static async disconnect(): Promise<void> {
    if (RedisClient.instance !== null) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
      logger.info('Redis disconnected');
    }
  }
}

export const redis = RedisClient.getInstance();

// ── Redis Key Helpers ──────────────────────────────────────────────────────
export const RedisKeys = {
  // Blacklisted access tokens (logout)
  blacklistToken: (jti: string): string => `blacklist:token:${jti}`,

  // Rate limiting
  loginAttempts: (identifier: string): string => `rate:login:${identifier}`,

  // Email verification
  emailVerifyToken: (token: string): string => `email:verify:${token}`,

  // Password reset
  passwordResetToken: (token: string): string => `password:reset:${token}`,

  // 2FA temporary token (pending OTP validation)
  twoFaTempToken: (token: string): string => `2fa:temp:${token}`,

  // Session data
  session: (userId: string): string => `session:${userId}`,

  // Refresh token (for quick lookup without DB)
  refreshToken: (tokenId: string): string => `refresh:${tokenId}`,
} as const;

export const RedisExpiry = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  EMAIL_VERIFY: 24 * 60 * 60, // 24 hours
  PASSWORD_RESET: 60 * 60, // 1 hour
  TWO_FA_TEMP: 5 * 60, // 5 minutes
  BLACKLIST: 15 * 60, // 15 minutes (matches access token)
} as const;
