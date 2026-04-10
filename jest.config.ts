import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // ── Module path aliases (mirror tsconfig paths) ────────────────────────
  moduleNameMapper: {
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

  // ── Setup files ────────────────────────────────────────────────────────
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setupTests.ts'],

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
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
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

