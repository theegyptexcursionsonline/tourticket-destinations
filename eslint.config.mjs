// eslint.config.mjs (Flat config for ESLint v9)
// Minimal, Next+TypeScript appropriate linting for this repo.
// We intentionally avoid `eslint-config-next` (circular crash) and also avoid
// enabling large recommended sets that would require repo-wide refactors.

import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/dist/**',
      '**/scripts/**',
      '**/__tests__/**',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/next.config.ts',
      '**/jest.config.js',
      '**/jest.setup.js',
    ],
  },

  // Global language options for the app
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Next.js / TS projects rely on typed builds; avoid noisy global false-positives
      'no-undef': 'off',
    },
  },

  // TypeScript rules (non type-aware; fast)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Keep lint lightweight — TypeScript compiler catches most issues.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // React / Next rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      // Next rules (using the recommended set)
      ...(nextPlugin.configs.recommended?.rules || {}),
      // React hooks correctness
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next.js (React 17+) no longer requires React in scope for JSX
      'react/react-in-jsx-scope': 'off',
      // Next.js uses styled-jsx props like <style jsx global>
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
      // Reduce noise (don’t require displayName or HTML entity escaping)
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',

      // A11y rules are useful but too noisy for this repo right now
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },
];
