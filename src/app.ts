import { env } from '@config/env';
import { morganStream } from '@config/logger';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { generalLimiter } from '@middlewares/rateLimiter';
import router from '@routes/index';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import { swaggerSetup } from './swagger';

const app = express();

// ── Security Headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      const allowedOrigins = Array.isArray(env.ALLOWED_ORIGINS)
        ? env.ALLOWED_ORIGINS
        : [env.FRONTEND_URL];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  }),
);

// ── HTTP Parameter Pollution protection ───────────────────────────────────
app.use(hpp());

// ── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Cookie Parser ──────────────────────────────────────────────────────────
app.use(cookieParser());

// ── HTTP Request Logger ────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: morganStream,
      skip: (req) => req.url === '/health',
    }),
  );
}

// ── Trust proxy (for correct IP behind Nginx / load balancer) ─────────────
app.set('trust proxy', 1);

// ── General rate limiter (all routes) ─────────────────────────────────────
app.use(generalLimiter);

// ── Swagger API Docs ───────────────────────────────────────────────────────
swaggerSetup(app);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use(`/api/${env.API_VERSION}`, router);

// ── 404 Handler ────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

export default app;
