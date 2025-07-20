const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!**/node_modules/**', '!**/vendor/**'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'html', 'json'],
  rootDir: '../../../.',
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    mockService: '<rootDir>/tests/__mocks__',
  },
  reporters: [
    'default',
    ['jest-html-reporters', { multipleReportsUnitePath: './reports', pageTitle: 'unit', publicPath: './reports', filename: 'unit.html' }],
  ],
  coverageThreshold: {
    global: {
      branches: 77,
      functions: 95,
      lines: 93,
      statements: 93,
    },
  },
};
