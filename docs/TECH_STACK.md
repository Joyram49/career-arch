# ⚙️ Tech Stack — CareerArch

## Backend

| Layer            | Technology                  | Reason                                   |
| ---------------- | --------------------------- | ---------------------------------------- |
| Runtime          | **Node.js v20 LTS**         | Async I/O, large ecosystem               |
| Framework        | **Express.js v5**           | Lightweight, flexible REST API           |
| Language         | **TypeScript**              | Type safety, better DX                   |
| Database         | **PostgreSQL 16**           | Relational data, ACID compliance         |
| ORM              | **Prisma**                  | Type-safe queries, migrations            |
| Cache / Sessions | **Redis (ioredis)**         | Token blacklist, rate limiting, sessions |
| Auth             | **JWT (jsonwebtoken)**      | Stateless access/refresh token           |
| 2FA              | **otplib + qrcode**         | TOTP-based two-factor auth               |
| Password Hashing | **bcryptjs**                | Secure password storage                  |
| Email            | **Nodemailer + Brevo SMTP** | Transactional emails (300/day free)      |
| Payment          | **Stripe SDK**              | Subscriptions + one-time incentives      |
| File Upload      | **Multer + AWS S3**         | Resume/profile image uploads             |
| Background Jobs  | **BullMQ + Redis**          | Email queues, async tasks                |
| Validation       | **Zod**                     | Request schema validation                |
| Rate Limiting    | **express-rate-limit**      | Brute force protection                   |
| Logging          | **Winston + Morgan**        | Structured logging, daily rotate         |
| Testing          | **Jest + Supertest**        | Unit & integration testing               |
| API Docs         | **Swagger (swagger-jsdoc)** | Auto-generated API docs                  |
| Security         | **Helmet + CORS + hpp**     | HTTP hardening                           |
| Environment      | **dotenv + Zod**            | Validated env variables                  |
| Path Aliases     | **tsc-alias**               | Resolves @config/, @services/ in prod JS |

---

## Frontend

| Layer            | Technology                                      | Reason                              |
| ---------------- | ----------------------------------------------- | ----------------------------------- |
| Framework        | **Next.js 14 (App Router)**                     | SSR, SEO, routing, API routes       |
| Language         | **TypeScript**                                  | Consistency with backend            |
| Styling          | **Tailwind CSS v3**                             | Utility-first, fast iteration       |
| UI Components    | **shadcn/ui**                                   | Accessible, customizable components |
| State Management | **Zustand**                                     | Lightweight, no boilerplate         |
| Server State     | **TanStack Query v5**                           | Cache, sync server data             |
| Forms            | **React Hook Form + Zod**                       | Performant forms with validation    |
| HTTP Client      | **Axios**                                       | Interceptors for token refresh      |
| Auth             | **NextAuth.js v5 (Auth.js)**                    | Session management, OAuth           |
| Rich Text        | **TipTap**                                      | Job description editor              |
| Notifications    | **Sonner**                                      | Toast notifications                 |
| Charts           | **Recharts**                                    | Admin analytics dashboards          |
| Tables           | **TanStack Table**                              | Sortable, filterable data tables    |
| Date Picker      | **react-day-picker**                            | Elegant date inputs                 |
| File Upload      | **react-dropzone**                              | Drag & drop resume upload           |
| Stripe UI        | **@stripe/stripe-js + @stripe/react-stripe-js** | PCI-compliant payment UI            |
| Icons            | **Lucide React**                                | Consistent icon system              |
| Animation        | **Framer Motion**                               | Smooth page transitions             |

---

## Infrastructure & DevOps

| Layer            | Technology                       |
| ---------------- | -------------------------------- |
| Containerization | **Docker + Docker Compose**      |
| Reverse Proxy    | **Nginx** (if self-hosted)       |
| CI/CD            | **GitHub Actions**               |
| Cloud (Backend)  | **Render** (free tier, Docker)   |
| Cloud (Frontend) | **Vercel** (planned)             |
| Database Hosting | **Supabase** (PostgreSQL)        |
| Redis Hosting    | **Upstash** (free tier, TCP TLS) |
| File Storage     | **AWS S3**                       |
| Monitoring       | **Sentry**                       |
| Email Service    | **Brevo** (SMTP relay)           |

---

## Local Development Stack

| Tool            | Purpose                        | URL                              |
| --------------- | ------------------------------ | -------------------------------- |
| Docker Compose  | Runs postgres + redis locally  | —                                |
| PostgreSQL      | Local database                 | localhost:5432                   |
| Redis           | Local cache                    | localhost:6379                   |
| Redis Commander | Redis GUI (view keys/values)   | <http://localhost:8081>          |
| nodemon         | Auto-restart on file changes   | —                                |
| ts-node         | Run TypeScript directly in dev | —                                |
| Swagger UI      | API documentation (dev only)   | <http://localhost:5000/api-docs> |

---

## Backend Package List (`package.json`)

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.723.0",
    "@aws-sdk/s3-request-presigner": "^3.723.0",
    "@prisma/adapter-pg": "^7.7.0",
    "@prisma/client": "^7.7.0",
    "bcryptjs": "^3.0.3",
    "bullmq": "^5.73.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "date-fns": "^4.1.0",
    "dotenv": "^17.4.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.3.2",
    "helmet": "^8.1.0",
    "hpp": "^0.2.3",
    "ioredis": "^5.10.1",
    "jsonwebtoken": "^9.0.3",
    "morgan": "^1.10.1",
    "multer": "^2.1.1",
    "nodemailer": "^8.0.5",
    "otplib": "^13.4.0",
    "pg": "^8.20.0",
    "qrcode": "^1.5.4",
    "stripe": "^22.0.1",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^13.0.0",
    "winston": "^3.19.0",
    "winston-daily-rotate-file": "^5.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/hpp": "^0.2.7",
    "@types/jest": "^29.5.14",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/morgan": "^1.9.10",
    "@types/multer": "^2.0.0",
    "@types/node": "^25.6.0",
    "@types/nodemailer": "^8.0.0",
    "@types/qrcode": "^1.5.6",
    "@types/supertest": "^7.2.0",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.8",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.58.1",
    "@typescript-eslint/parser": "^8.58.1",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-import": "^2.32.0",
    "eslint-plugin-node": "^11.1.0",
    "eslint-plugin-security": "^4.0.0",
    "husky": "^9.1.7",
    "jest": "^29.7.0",
    "lint-staged": "^16.4.0",
    "nodemon": "^3.1.14",
    "prettier": "^3.8.2",
    "prisma": "^7.7.0",
    "supertest": "^7.2.2",
    "ts-jest": "^29.4.9",
    "ts-node": "^10.9.2",
    "tsc-alias": "^1.8.16",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^6.0.2"
  }
}
```

---

## Frontend Package List (`package.json`)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "next-auth": "^5.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "framer-motion": "^11.x",
    "@tiptap/react": "^2.x",
    "@tiptap/starter-kit": "^2.x",
    "react-dropzone": "^14.x",
    "react-day-picker": "^8.x",
    "date-fns": "^3.x",
    "recharts": "^2.x",
    "sonner": "^1.x",
    "lucide-react": "^0.x",
    "@stripe/stripe-js": "^3.x",
    "@stripe/react-stripe-js": "^2.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "class-variance-authority": "^0.7.x"
  }
}
```
