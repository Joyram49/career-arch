"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const env_1 = require("./env");
const logger_1 = require("./logger");
const globalForPrisma = globalThis;
const pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prismaClient = new client_1.PrismaClient({
    adapter,
    log: env_1.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
        ]
        : [{ emit: 'stdout', level: 'error' }],
});
exports.prisma = globalForPrisma.prisma ?? prismaClient;
if (env_1.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('✅ Database connected successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    logger_1.logger.info('Database disconnected');
}
//# sourceMappingURL=database.js.map