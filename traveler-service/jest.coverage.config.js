/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@travel/shared$': '<rootDir>/../packages/shared/src/index.ts',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  // Exclude Docker-dependent files (covered only when Testcontainers is available)
  // and generated/boilerplate files from the coverage report.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/infrastructure/persistence/repositories/*.ts',
    '!src/infrastructure/migrations/*.ts',
    '!src/infrastructure/observability/tracing.module.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  forceExit: true,
};

module.exports = config;
