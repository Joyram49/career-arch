# ⚙️ Tech Stack — CareerArch

## Backend

| Layer            | Technology                       | Reason                                   |
| ---------------- | -------------------------------- | ---------------------------------------- |
| Runtime          | **Node.js v20 LTS**              | Async I/O, large ecosystem               |
| Framework        | **Express.js v5**                | Lightweight, flexible REST API           |
| Language         | **TypeScript**                   | Type safety, better DX                   |
| Database         | **PostgreSQL 16**                | Relational data, ACID compliance         |
| ORM              | **Prisma**                       | Type-safe queries, migrations            |
| Cache / Sessions | **Redis (ioredis)**              | Token blacklist, rate limiting, sessions |
| Auth             | **JWT (jsonwebtoken)**           | Stateless access/refresh token           |
| 2FA              | **speakeasy + qrcode**           | TOTP-based two-factor auth               |
| Password Hashing | **bcryptjs**                     | Secure password storage                  |
| Email            | **Nodemailer + BREVO**        | Transactional emails                     |
| Payment          | **Stripe SDK**                   | Subscriptions + one-time incentives      |
| File Upload      | **Multer + AWS S3 / Cloudinary** | Resume/profile image uploads             |
| Background Jobs  | **BullMQ + Redis**               | Email queues, async tasks                |
| Validation       | **Zod**                          | Request schema validation                |
| Rate Limiting    | **express-rate-limit + Redis**   | Brute force protection                   |
| Logging          | **Winston + Morgan**             | Structured logging                       |
| Testing          | **Jest + Supertest**             | Unit & integration testing               |
| API Docs         | **Swagger (swagger-jsdoc)**      | Auto-generated API docs                  |
| Security         | **Helmet + CORS + hpp**          | HTTP hardening                           |
| Environment      | **dotenv + envalid**             | Validated env variables                  |

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
| Reverse Proxy    | **Nginx**                        |
| CI/CD            | **GitHub Actions**               |
| Cloud (Backend)  | **Railway / Render**             |
| Cloud (Frontend) | **Vercel**                       |
| Database Hosting | **Supabase / Neon (PostgreSQL)** |
| Redis Hosting    | **Upstash Redis**                |
| File Storage     | **AWS S3 / Cloudinary**          |
| Monitoring       | **Sentry**                       |
| Email Service    | **BREVO**                     |

---

## Backend Package List (`package.json`)

```json
{
  "dependencies": {
    "express": "^5.0.0",
    "@prisma/client": "^5.x",
    "prisma": "^5.x",
    "typescript": "^5.x",
    "ts-node": "^10.x",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "speakeasy": "^2.x",
    "qrcode": "^1.x",
    "nodemailer": "^6.x",
    "@sendgrid/mail": "^8.x",
    "stripe": "^14.x",
    "ioredis": "^5.x",
    "bullmq": "^5.x",
    "multer": "^1.x",
    "@aws-sdk/client-s3": "^3.x",
    "zod": "^3.x",
    "express-rate-limit": "^7.x",
    "helmet": "^7.x",
    "cors": "^2.x",
    "hpp": "^0.2.x",
    "morgan": "^1.x",
    "winston": "^3.x",
    "dotenv": "^16.x",
    "envalid": "^8.x",
    "uuid": "^9.x",
    "date-fns": "^3.x",
    "swagger-jsdoc": "^6.x",
    "swagger-ui-express": "^5.x",
    "cookie-parser": "^1.x",
    "express-async-errors": "^3.x"
  },
  "devDependencies": {
    "@types/express": "^5.x",
    "@types/node": "^20.x",
    "@types/jsonwebtoken": "^9.x",
    "@types/bcryptjs": "^2.x",
    "@types/multer": "^1.x",
    "@types/cors": "^2.x",
    "@types/morgan": "^1.x",
    "@types/cookie-parser": "^1.x",
    "@types/swagger-jsdoc": "^6.x",
    "@types/swagger-ui-express": "^4.x",
    "jest": "^29.x",
    "supertest": "^6.x",
    "@types/jest": "^29.x",
    "@types/supertest": "^6.x",
    "ts-jest": "^29.x",
    "nodemon": "^3.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^7.x",
    "prettier": "^3.x"
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
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "eslint": "^8.x",
    "eslint-config-next": "14.x",
    "prettier": "^3.x",
    "prettier-plugin-tailwindcss": "^0.x"
  }
}
```
