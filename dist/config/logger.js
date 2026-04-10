"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const { combine, timestamp, printf, colorize, errors, json, splat } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return stack !== undefined
        ?
            `${String(ts)} [${level}]: ${String(message)}\n${String(stack)}${metaStr}`
        : `${String(ts)} [${level}]: ${String(message)}${metaStr}`;
});
const transports = [
    new winston_1.default.transports.Console({
        format: combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), splat(), consoleFormat),
    }),
];
if (process.env['NODE_ENV'] !== 'test') {
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(timestamp(), errors({ stack: true }), json()),
        zippedArchive: true,
    }), new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(timestamp(), errors({ stack: true }), json()),
        zippedArchive: true,
    }));
}
exports.logger = winston_1.default.createLogger({
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    defaultMeta: { service: 'careerarch-api' },
    transports,
    exceptionHandlers: [
        new winston_1.default.transports.Console(),
        ...(process.env['NODE_ENV'] !== 'test'
            ? [
                new winston_daily_rotate_file_1.default({
                    filename: path_1.default.join('logs', 'exceptions-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: '14d',
                }),
            ]
            : []),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.Console(),
        ...(process.env['NODE_ENV'] !== 'test'
            ? [
                new winston_daily_rotate_file_1.default({
                    filename: path_1.default.join('logs', 'rejections-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: '14d',
                }),
            ]
            : []),
    ],
    exitOnError: false,
});
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
//# sourceMappingURL=logger.js.map