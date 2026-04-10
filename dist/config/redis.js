"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisExpiry = exports.RedisKeys = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
class RedisClient {
    static instance = null;
    static getInstance() {
        if (RedisClient.instance === null) {
            RedisClient.instance = new ioredis_1.default(env_1.env.REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                retryStrategy(times) {
                    if (times > 10) {
                        logger_1.logger.error('Redis: max retries reached, giving up');
                        return null;
                    }
                    const delay = Math.min(times * 100, 3000);
                    logger_1.logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
                    return delay;
                },
                reconnectOnError(err) {
                    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
                    return targetErrors.some((target) => err.message.includes(target));
                },
            });
            RedisClient.instance.on('connect', () => {
                logger_1.logger.info('✅ Redis connected successfully');
            });
            RedisClient.instance.on('error', (err) => {
                logger_1.logger.error('❌ Redis error:', err.message);
            });
            RedisClient.instance.on('close', () => {
                logger_1.logger.warn('Redis connection closed');
            });
            RedisClient.instance.on('reconnecting', () => {
                logger_1.logger.warn('Redis reconnecting...');
            });
        }
        return RedisClient.instance;
    }
    static async disconnect() {
        if (RedisClient.instance !== null) {
            await RedisClient.instance.quit();
            RedisClient.instance = null;
            logger_1.logger.info('Redis disconnected');
        }
    }
}
exports.redis = RedisClient.getInstance();
exports.RedisKeys = {
    blacklistToken: (jti) => `blacklist:token:${jti}`,
    loginAttempts: (identifier) => `rate:login:${identifier}`,
    emailVerifyToken: (token) => `email:verify:${token}`,
    passwordResetToken: (token) => `password:reset:${token}`,
    twoFaTempToken: (token) => `2fa:temp:${token}`,
    session: (userId) => `session:${userId}`,
    refreshToken: (tokenId) => `refresh:${tokenId}`,
};
exports.RedisExpiry = {
    ACCESS_TOKEN: 15 * 60,
    REFRESH_TOKEN: 7 * 24 * 60 * 60,
    EMAIL_VERIFY: 24 * 60 * 60,
    PASSWORD_RESET: 60 * 60,
    TWO_FA_TEMP: 5 * 60,
    BLACKLIST: 15 * 60,
};
//# sourceMappingURL=redis.js.map