"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@config/database");
const email_1 = require("@config/email");
const env_1 = require("@config/env");
const logger_1 = require("@config/logger");
const redis_1 = require("@config/redis");
const dotenv_1 = require("dotenv");
const app_1 = __importDefault(require("./app"));
(0, dotenv_1.config)();
const PORT = env_1.env.PORT;
let server;
async function start() {
    try {
        await (0, database_1.connectDatabase)();
        void (0, email_1.verifyEmailConnection)();
        server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🚀 CareerArch API running on port ${PORT}`);
            logger_1.logger.info(`📖 API Docs: http://localhost:${PORT}/api-docs`);
            logger_1.logger.info(`🌍 Environment: ${env_1.env.NODE_ENV}`);
        });
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger_1.logger.error(`❌ Port ${PORT} is already in use`);
            }
            else {
                logger_1.logger.error('❌ Server error:', error);
            }
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
function shutdown(signal) {
    logger_1.logger.info(`\n${signal} received. Starting graceful shutdown...`);
    server?.close(() => {
        void (async () => {
            logger_1.logger.info('HTTP server closed');
            try {
                await (0, database_1.disconnectDatabase)();
                await redis_1.redis.quit();
                logger_1.logger.info('✅ Graceful shutdown complete');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        })();
    });
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});
void start();
//# sourceMappingURL=server.js.map