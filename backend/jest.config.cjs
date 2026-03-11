module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  maxWorkers: 1, // Tests secuenciales: un solo worker, uno tras otro
  roots: ['<rootDir>/src'],
  testMatch: ['**/test/**/*.test.ts', '**/test/**/*.spec.ts', '**/test/**/*-test.ts', '**/test/**/*.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};