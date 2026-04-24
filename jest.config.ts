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
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@validations/(.*)$': '<rootDir>/src/validations/$1',
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

  // ── Transform ESM modules in node_modules ───────────────────────────────
  transformIgnorePatterns: [
    'node_modules/(?!(isomorphic-dompurify|@exodus/bytes|entities|linkifyjs)/)',
  ],

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
