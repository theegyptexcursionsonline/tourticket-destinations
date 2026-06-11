/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['**/*supertest*.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.netlify/'],
};
