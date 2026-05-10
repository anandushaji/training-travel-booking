/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
  moduleNameMapper: {
    '^@travel/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@pact-foundation/pact$': '<rootDir>/contract/__pact_stub__.js',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/migrations/*.ts',
    '!**/repositories/*.ts',
    '!**/tracing.ts',
    '!**/typeorm-data-source.ts',
    '!**/contract/__pact_stub__.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
    },
  },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  forceExit: true,
};
