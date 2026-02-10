module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.[jt]s?(x)', '**/test/**/*-test.[jt]s?(x)', '**/test/**/*.spec.[jt]s?(x)', '**/test/**/*.ts'],
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};