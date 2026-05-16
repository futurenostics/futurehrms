/**
 * Tailwind v4 base config (shared across apps).
 *
 * v4 lockdown — the design system is locked in `fn-tokens.css`:
 *
 *   §3 of fn-tokens.css sets every default theme namespace to `initial`
 *   (spacing, color, text, font-weight, leading, tracking, radius, shadow,
 *   font, breakpoint, container). After that, the ONLY utilities the
 *   compiler emits are the fn-* ones declared in §4 `@theme inline`.
 *   So `p-4`, `text-sm`, `rounded-md`, `bg-blue-500`, `shadow-sm` etc.
 *   resolve to "unknown utility" errors at build time. The custom
 *   `fn-tokens/no-default-utilities` ESLint rule catches them earlier
 *   (during edit, not during build), and the lock-down here is the
 *   compile-time backstop.
 *
 * This file holds only what v4 still wants in JS: dark-mode strategy
 * (since we use both [data-theme="dark"] from next-themes AND the .dark
 * class on root), and a content-paths shell for any tooling that still
 * inspects the JS config.
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
