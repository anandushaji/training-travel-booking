/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.js'),
  collectCoverage: true,
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
};
