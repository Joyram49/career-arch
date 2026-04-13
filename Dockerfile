FROM node:20-alpine AS base

WORKDIR /app

# ── Stage 1: Production dependencies only ─────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ── Stage 2: Full dependencies + build ────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run db:generate
RUN npm run build

# ── Stage 3: Development (ts-node + nodemon, no build needed) ─────────────
FROM base AS development
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run db:generate

EXPOSE 5000

CMD ["npm", "run", "dev"]

# ── Stage 4: Production runner ────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 careerarch

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory with correct ownership
RUN mkdir -p logs && chown -R careerarch:nodejs logs

USER careerarch

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]