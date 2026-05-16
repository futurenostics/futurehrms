import rootConfig from '../../eslint.config.mjs';
import fnTokens from '../../packages/config/eslint/rules/no-default-utilities.mjs';
import { legacySkipList } from '../../packages/config/eslint/legacy-skip-list.mjs';

// Next.js route groups `(name)` and dynamic params `[name]` are minimatch
// special chars. Escape them so ignore-globs match literally.
const escapeGlob = (p) => p.replace(/[()[\]]/g, '\\$&');

export default [
  ...rootConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
  // Foundation Reset — design system lockdown.
  //
  // fn-tokens/no-default-utilities fires for every Tailwind default
  // utility (spacing, sizing, color, radius, shadow, font-size, weight,
  // leading, tracking) in className strings. New code uses fn-* only.
  //
  // Legacy files awaiting Sub-phase D remediation live in
  //   packages/config/eslint/legacy-skip-list.mjs
  // and are excluded here. Removing an entry from that file is the
  // way Sub-phase D progress is measured.
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: ['.next/**', 'node_modules/**', ...legacySkipList.map(escapeGlob)],
    plugins: { 'fn-tokens': fnTokens },
    rules: {
      'fn-tokens/no-default-utilities': 'error',
    },
  },
];
