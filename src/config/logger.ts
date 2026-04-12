import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

// ── Custom log format for console ──────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return stack !== undefined
    ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `${String(ts)} [${level}]: ${String(message)}\n${String(stack)}${metaStr}`
    : `${String(ts)} [${level}]: ${String(message)}${metaStr}`;
});

// ── Transports ─────────────────────────────────────────────────────────────
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      splat(),
      consoleFormat,
    ),
  }),
];

// File transports only in non-test environments
if (process.env['NODE_ENV'] !== 'test') {
  transports.push(
    // Error log - daily rotate
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), errors({ stack: true }), json()),
      zippedArchive: true,
    }),
    // Combined log - daily rotate
    new DailyRotateFile({
      filename: path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), errors({ stack: true }), json()),
      zippedArchive: true,
    }),
  );
}

// ── Logger instance ────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'careerarch-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(process.env['NODE_ENV'] !== 'test'
      ? [
          new DailyRotateFile({
            filename: path.join('logs', 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
          }),
        ]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(process.env['NODE_ENV'] !== 'test'
      ? [
          new DailyRotateFile({
            filename: path.join('logs', 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
          }),
        ]
      : []),
  ],
  exitOnError: false,
});

// ── Stream for Morgan ──────────────────────────────────────────────────────
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
