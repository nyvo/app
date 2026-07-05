import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// Flat config, scoped to the app source. Edge functions (supabase/functions)
// are Deno and get type-checked by `deno check` at deploy — linting them here
// would need a separate globals/parser setup, so they're excluded for now.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'supabase', 'e2e', 'scripts', 'playwright.config.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The codebase's convention: underscore-prefixed = intentionally unused.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Existing `any`s are being burned down (typedFrom/rpc casts already
      // removed); warn instead of error so new ones are visible in review
      // without blocking CI on the legacy tail.
      '@typescript-eslint/no-explicit-any': 'warn',
      // exhaustive-deps stays a warning (its default): the codebase has
      // intentional dep omissions that need case-by-case review, but every
      // new violation shows up in editor + CI output.
      'react-hooks/exhaustive-deps': 'warn',
      // react-hooks v6 React-Compiler rules flag the codebase's current
      // architecture (data fetching via setState-in-effect) wholesale — that's
      // the planned server-state-library migration, not per-line fixes. Keep
      // them visible as warnings; rules-of-hooks stays an error.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // Vitest test files + setup run in jsdom with vitest globals.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, vi: 'readonly', describe: 'readonly', it: 'readonly', test: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' },
    },
  },
)
