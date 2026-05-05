/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { env } from '@config/env';
import { logger } from '@config/logger';
import { redis, RedisKeys } from '@config/redis';
import { verifyAccessToken } from '@utils/token';
import { Server as SocketServer } from 'socket.io';

import type { IJwtPayload } from '@app-types/index';
import type { Server as HttpServer } from 'http';

// ─────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────

let io: SocketServer | null = null;

// ─────────────────────────────────────────────
// INIT (called once in server.ts)
// ─────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: Array.isArray(env.ALLOWED_ORIGINS) ? env.ALLOWED_ORIGINS : [env.FRONTEND_URL],
      credentials: true,
    },
    // polling fallback keeps Render free-tier compatible
    transports: ['websocket', 'polling'],
    // disconnect client after 5 min idle
    pingTimeout: 50000,
    pingInterval: 25000,
  });

  // ── Auth middleware ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  io.use(async (socket, next) => {
    try {
      const raw =
        (socket.handshake.auth as { token?: string }).token ??
        socket.handshake.headers['authorization'];

      if (raw === undefined || raw.length === 0) {
        return next(new Error('Unauthorized: no token'));
      }

      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

      let decoded: IJwtPayload;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        return next(new Error('Unauthorized: invalid token'));
      }

      // Check Redis blacklist (logout)
      const blacklisted = await redis.get(RedisKeys.blacklistToken(decoded.jti));
      if (blacklisted !== null) {
        return next(new Error('Unauthorized: token revoked'));
      }

      // Attach decoded payload so handlers can access it
      socket.data.user = decoded;
      return next();
    } catch (err) {
      logger.error('[Socket] Auth middleware error:', err);
      return next(new Error('Unauthorized'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const user = socket.data.user as IJwtPayload;
    const { sub, role } = user;

    // Each user/org joins their own private room
    if (role === 'USER') {
      void socket.join(`user:${sub}`);
      logger.info(`[Socket] USER connected: ${sub} (socket ${socket.id})`);
    } else if (role === 'ORGANIZATION') {
      void socket.join(`org:${sub}`);
      logger.info(`[Socket] ORG connected: ${sub} (socket ${socket.id})`);
    } else {
      void socket.join(`admin:${sub}`);
      logger.info(`[Socket] ADMIN connected: ${sub} (socket ${socket.id})`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] ${role} ${sub} disconnected: ${reason}`);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

// ─────────────────────────────────────────────
// GETTER — used by services to emit events
// ─────────────────────────────────────────────

export function getIO(): SocketServer {
  if (io === null) {
    throw new Error('Socket.IO not initialized. Call initSocket(httpServer) first.');
  }
  return io;
}

// ─────────────────────────────────────────────
// TYPED EMIT HELPERS
// ─────────────────────────────────────────────

/** Notify an org of a new application */
export function emitNewApplication(
  orgId: string,
  payload: {
    applicationId: string;
    jobTitle: string;
    candidateName: string;
    appliedAt: Date;
  },
): void {
  try {
    getIO().to(`org:${orgId}`).emit('application:new', payload);
  } catch {
    // Socket not critical — log and move on
    logger.warn('[Socket] emitNewApplication failed — IO not ready');
  }
}

/** Notify a user that their application status changed */
export function emitStatusUpdated(
  userId: string,
  payload: {
    applicationId: string;
    jobId: string;
    jobTitle: string;
    oldStatus: string;
    newStatus: string;
    updatedAt: Date;
  },
): void {
  try {
    getIO().to(`user:${userId}`).emit('application:status_updated', payload);
  } catch {
    logger.warn('[Socket] emitStatusUpdated failed — IO not ready');
  }
}

/** Notify a user that they withdrew (confirmation echo) */
export function emitWithdrawn(
  orgId: string,
  payload: {
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  },
): void {
  try {
    getIO().to(`org:${orgId}`).emit('application:withdrawn', payload);
  } catch {
    logger.warn('[Socket] emitWithdrawn failed — IO not ready');
  }
}

/** Notify org that a hiring incentive was created */
export function emitIncentiveCreated(
  orgId: string,
  payload: {
    incentiveId: string;
    amount: number;
    candidateName: string;
    jobTitle: string;
    dueAt: Date;
  },
): void {
  try {
    getIO().to(`org:${orgId}`).emit('incentive:created', payload);
  } catch {
    logger.warn('[Socket] emitIncentiveCreated failed — IO not ready');
  }
}

/** Push a notification badge update to a user */
export function emitNotification(
  userId: string,
  payload: {
    id: string;
    title: string;
    message: string;
    link: string | null;
  },
): void {
  try {
    getIO().to(`user:${userId}`).emit('notification:new', payload);
  } catch {
    logger.warn('[Socket] emitNotification failed — IO not ready');
  }
}
