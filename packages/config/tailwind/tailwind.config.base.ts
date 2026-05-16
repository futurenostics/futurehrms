/**
 * Tailwind v4 base config (shared across apps).
 *
 * Tailwind v4 is largely CSS-first — the design tokens live in
 * `fn-tokens.css` under the `@theme inline` block and the utilities
 * are generated from there. This file exists to centralize the few
 * things Tailwind v4 still wants in JS: content globs, dark-mode
 * strategy, and the prettier plugin tweak hook.
 *
 * Workspaces import this and spread it into their own `tailwind.config.ts`
 * — see `apps/web/tailwind.config.ts`.
 */
import type { Config } from 'tailwindcss';

export const baseConfig = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

export default baseConfig;
