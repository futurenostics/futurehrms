import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import fnTokens from './packages/config/eslint/rules/no-default-utilities.mjs';
import { legacySkipList } from './packages/config/eslint/legacy-skip-list.mjs';

// Next.js route groups `(name)` and dynamic params `[name]` are minimatch
// special chars. Escape them so legacy-file ignores match literally.
const escapeGlob = (p) => p.replace(/[()[\]]/g, '\\$&');

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.husky/_/**',
      'docs/design/**',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/prisma/migrations/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
    },
  },
  // Foundation Reset — design system lockdown.
  //
  // fn-tokens/no-default-utilities fires for every Tailwind default
  // utility (spacing, sizing, color, radius, shadow, font-size,
  // weight, leading, tracking) in className strings inside apps/web.
  // New code uses fn-* only. Legacy files pre-dating Sub-phase A live
  // in packages/config/eslint/legacy-skip-list.mjs and shrink as
  // Sub-phase D progresses.
  //
  // The plugin is registered once here so the rule name is known
  // EVERYWHERE — that lets `eslint-disable-next-line
  // fn-tokens/no-default-utilities` escape-hatch comments work both
  // from repo-root invocations (lint-staged, CI) and from apps/web
  // workspace invocations (`pnpm --filter @futurenostics/web lint`).
  // The actual enforcement is scoped to the apps/web glob below.
  {
    plugins: { 'fn-tokens': fnTokens },
  },
  {
    files: ['apps/web/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: [
      'apps/web/.next/**',
      'apps/web/node_modules/**',
      ...legacySkipList.map((p) => escapeGlob(`apps/web/${p}`)),
    ],
    rules: {
      'fn-tokens/no-default-utilities': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // NestJS DI uses reflect-metadata, which requires injected service
    // types to remain as value imports — `import type` strips them and
    // breaks DI silently. Disable the consistent-type-imports rule for
    // the API workspace so auto-fix doesn't sabotage @Injectable() classes.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  prettier,
);
