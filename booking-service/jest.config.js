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
    // Redirect typeorm and @nestjs/typeorm to payment-service copies which have all
    // transitive dependencies (app-root-path, sha.js, to-buffer, etc.) already installed
    '^typeorm(/.+)?$': '<rootDir>/../../payment-service/node_modules/typeorm$1',
    '^@nestjs/typeorm(/.+)?$': '<rootDir>/../../payment-service/node_modules/@nestjs/typeorm$1',
    // Redirect axios-retry to policy-service copy which has is-retry-allowed installed
    '^axios-retry$': '<rootDir>/../../policy-service/node_modules/axios-retry/dist/cjs/index.js',
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
    '!**/entities/*.ts',
    '!**/read-model*.ts',
    '!**/*.spec.ts',
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
