/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*supertest*.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
};
