/**
 * apps/web ESLint config.
 *
 * Flat config quirk: `files` globs in a config block resolve relative
 * to the config file that owns the block. The Foundation Reset
 * lockdown rule (fn-tokens/no-default-utilities) needs to apply
 * regardless of where eslint is invoked from — and the two main
 * invocation paths use different cwds:
 *
 *   - lint-staged + CI:        repo root cwd → root eslint.config.mjs
 *                              has its own apps/web-scoped block.
 *   - workspace lint scripts:  apps/web cwd → THIS file, needs its
 *                              own block with cwd-relative globs.
 *
 * The block below scopes the lockdown to all TypeScript / JavaScript
 * inside apps/web (no `apps/web/` prefix — globs are relative to
 * this config file's directory), with the legacy skip-list applied.
 *
 * The plugin itself is registered once in the root config so the
 * rule name is known everywhere (so eslint-disable comments don't
 * error out when the apps/web block isn't loaded).
 */
import rootConfig from '../../eslint.config.mjs';
import { legacySkipList } from '../../packages/config/eslint/legacy-skip-list.mjs';

const escapeGlob = (p) => p.replace(/[()[\]]/g, '\\$&');

export default [
  ...rootConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: ['.next/**', 'node_modules/**', ...legacySkipList.map(escapeGlob)],
    rules: {
      'fn-tokens/no-default-utilities': 'error',
    },
  },
];
