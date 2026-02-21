const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    'supertest',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(next-intl|react-markdown|remark-gfm|rehype-raw|rehype-sanitize|devlop|hast-util-.*|mdast-util-.*|micromark.*|unist-.*|unified|bail|is-plain-obj|trough|vfile.*|property-information|comma-separated-tokens|space-separated-tokens|decode-named-character-reference|character-entities|ccount|escape-string-regexp|markdown-table|trim-lines|estree-util-.*|hast-to-estree|zwitch)/)',
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
