import path from 'path';

import { env } from '@config/env';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import type { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareerArch API',
      version: '1.0.0',
      description:
        'Industry-standard job portal API — Glassdoor clone. Includes auth, job search, applications, subscriptions, and Stripe payments.',
      contact: {
        name: 'CareerArch Team',
        email: 'support@careerarch.com',
      },
      license: { name: 'MIT' },
    },
    servers: [
      {
        url: env.API_URL,
        description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Unauthorized' },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: {
                    type: 'string',
                    example: 'Validation failed',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Scan route files for @swagger JSDoc comments
  apis: [
    path.join(__dirname, 'routes', '**', '*.ts'),
    path.join(__dirname, 'routes', '**', '*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function swaggerSetup(app: Express): void {
  // Only expose docs in non-production environments
  if (env.NODE_ENV === 'production') return;

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'CareerArch API Docs',
      customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        displayRequestDuration: true,
      },
    }),
  );

  // Also expose raw JSON spec at /api-docs.json
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
