import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],

  // ── Module path aliases (mirror tsconfig paths) ────────────────────────
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/tests/setup/mocks/uuid.ts',
    '^otplib$': '<rootDir>/src/tests/setup/mocks/otplib.ts',
    '^isomorphic-dompurify$': '<rootDir>/src/tests/setup/mocks/isomorphic-dompurify.ts',
    '^@config/stripe$': '<rootDir>/src/tests/setup/mocks/stripe.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    // ── Feature modules ────────────────────────────────────────────────
    '^@modules/auth/(.*)$': '<rootDir>/src/modules/auth/$1',
    '^@modules/users/(.*)$': '<rootDir>/src/modules/users/$1',
    '^@modules/organizations/(.*)$': '<rootDir>/src/modules/organizations/$1',
    '^@modules/jobs/(.*)$': '<rootDir>/src/modules/jobs/$1',
    '^@modules/applications/(.*)$': '<rootDir>/src/modules/applications/$1',
    '^@modules/subscriptions/(.*)$': '<rootDir>/src/modules/subscriptions/$1',
    '^@modules/incentives/(.*)$': '<rootDir>/src/modules/incentives/$1',
    '^@modules/notifications/(.*)$': '<rootDir>/src/modules/notifications/$1',
    '^@modules/uploads/(.*)$': '<rootDir>/src/modules/uploads/$1',
    '^@modules/email/(.*)$': '<rootDir>/src/modules/email/services/$1',
    '^@modules/admin/(.*)$': '<rootDir>/src/modules/admin/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    // ── Shared ─────────────────────────────────────────────────────────
    '^@shared/middlewares/(.*)$': '<rootDir>/src/shared/middlewares/$1',
    '^@shared/utils/(.*)$': '<rootDir>/src/shared/utils/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@jobs/(.*)$': '<rootDir>/src/jobs/$1',
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
  },

  // ── Test file patterns ─────────────────────────────────────────────────
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
  ],

  // ── ts-jest config ─────────────────────────────────────────────────────
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          ignoreCodes: ['TS151001'],
        },
      },
    ],
  },

  // ── Setup files ────────────────────────────────────────────────────────
  setupFiles: ['<rootDir>/src/tests/setup/env.ts'],
  globalSetup: '<rootDir>/src/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/setup/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/setupTests.ts'],

  // ── Coverage ───────────────────────────────────────────────────────────
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/swagger.ts',
    '!src/types/**',
    '!src/config/env.ts',
    '!src/templates/**',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',

  // ── Behaviour ──────────────────────────────────────────────────────────
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
