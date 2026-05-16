/**
 * Token reference data for the style guide.
 *
 * Source of truth: packages/config/tailwind/fn-tokens.css §1.
 * Keep in sync — when a token's OKLCH/value changes in fn-tokens.css,
 * update the matching row here so the rendered swatch shows both the
 * live var() output AND the source value for side-by-side check.
 *
 * Why hard-coded vs read at runtime: a stale label is a louder
 * regression signal than a live one. If the swatch and the label
 * disagree, someone touched fn-tokens.css without updating this file.
 */

export const TOKENS = {
  /* §1.1 — Surfaces / borders / fg */
  surfaces: [
    { token: 'bg', value: 'oklch(0.965 0.004 250)' },
    { token: 'bg-subtle', value: 'oklch(0.975 0.003 250)' },
    { token: 'bg-panel', value: 'oklch(1 0 0)' },
    { token: 'bg-inset', value: 'oklch(0.955 0.004 250)' },
    { token: 'border', value: 'oklch(0.92 0.005 250)' },
    { token: 'border-strong', value: 'oklch(0.88 0.006 250)' },
    { token: 'divider', value: 'oklch(0.935 0.004 250)' },
    { token: 'fg', value: 'oklch(0.18 0.012 260)' },
    { token: 'fg-muted', value: 'oklch(0.5 0.012 260)' },
    { token: 'fg-faint', value: 'oklch(0.66 0.01 260)' },
    { token: 'fg-invert', value: 'oklch(0.98 0.003 250)' },
  ],

  /* §1.2 — Accent */
  accent: [
    { token: 'accent', value: 'oklch(0.55 0.18 280)' },
    { token: 'accent-hover', value: 'oklch(0.49 0.20 280)' },
    { token: 'accent-fg', value: 'oklch(0.99 0.003 250)' },
    { token: 'accent-soft', value: 'oklch(0.95 0.04 280)' },
    { token: 'accent-soft-fg', value: 'oklch(0.42 0.16 280)' },
  ],

  /* §1.3 — Semantic */
  semantic: [
    { token: 'success', value: 'oklch(0.65 0.12 175)' },
    { token: 'success-soft', value: 'oklch(0.94 0.06 175)' },
    { token: 'success-soft-fg', value: 'oklch(0.40 0.10 175)' },
    { token: 'warning', value: 'oklch(0.74 0.13 75)' },
    { token: 'warning-soft', value: 'oklch(0.95 0.05 80)' },
    { token: 'warning-soft-fg', value: 'oklch(0.46 0.10 70)' },
    { token: 'danger', value: 'oklch(0.62 0.16 22)' },
    { token: 'danger-soft', value: 'oklch(0.94 0.04 22)' },
    { token: 'danger-soft-fg', value: 'oklch(0.48 0.13 22)' },
    { token: 'info', value: 'oklch(0.58 0.13 245)' },
    { token: 'info-soft', value: 'oklch(0.95 0.04 245)' },
    { token: 'info-soft-fg', value: 'oklch(0.42 0.12 245)' },
    { token: 'icon-tile', value: 'oklch(0.965 0.009 220)' },
    { token: 'icon-tile-fg', value: 'oklch(0.50 0.020 220)' },
  ],

  /* §1.5 — Avatar / chip 10-hue ring */
  avatarHues: [
    { name: 'coral', hue: 22 },
    { name: 'amber', hue: 65 },
    { name: 'lime', hue: 95 },
    { name: 'mint', hue: 145 },
    { name: 'teal', hue: 175 },
    { name: 'sky', hue: 200 },
    { name: 'blue', hue: 245 },
    { name: 'violet', hue: 280 },
    { name: 'fuchsia', hue: 320 },
    { name: 'rose', hue: 350 },
  ],

  /* §1.10 — Font sizes (31 tokens, every distinct px value) */
  fontSizes: [
    { token: 'fn-pico', value: '4px' },
    { token: 'fn-pico-plus', value: '4.5px' },
    { token: 'fn-2xs', value: '6px' },
    { token: 'fn-2xs-plus', value: '8px' },
    { token: 'fn-2xs-hi', value: '8.5px' },
    { token: 'fn-xs-lo', value: '9px' },
    { token: 'fn-xs-lo-plus', value: '9.5px' },
    { token: 'fn-xs', value: '10px' },
    { token: 'fn-xs-plus', value: '10.5px' },
    { token: 'fn-sm', value: '11px' },
    { token: 'fn-sm-plus', value: '11.5px' },
    { token: 'fn-base-lo', value: '12px' },
    { token: 'fn-base-lo-plus', value: '12.5px' },
    { token: 'fn-base', value: '13px' },
    { token: 'fn-base-plus', value: '13.5px' },
    { token: 'fn-md', value: '14px' },
    { token: 'fn-md-plus', value: '14.5px' },
    { token: 'fn-lg', value: '15px' },
    { token: 'fn-lg-plus', value: '16px' },
    { token: 'fn-xl', value: '17px' },
    { token: 'fn-xl-plus', value: '18px' },
    { token: 'fn-2xl', value: '20px' },
    { token: 'fn-2xl-plus', value: '22px' },
    { token: 'fn-3xl', value: '24px' },
    { token: 'fn-3xl-plus', value: '26px' },
    { token: 'fn-4xl', value: '28px' },
    { token: 'fn-4xl-plus', value: '30px' },
    { token: 'fn-5xl', value: '32px' },
    { token: 'fn-5xl-plus', value: '34px' },
    { token: 'fn-6xl', value: '36px' },
    { token: 'fn-6xl-plus', value: '38px' },
    { token: 'fn-display', value: '56px' },
    { token: 'fn-loading', value: '140px' },
  ],

  /* §1.11 — Font weights */
  fontWeights: [
    { token: 'fn-normal', value: '400' },
    { token: 'fn-medium', value: '500' },
    { token: 'fn-semibold', value: '600' },
    { token: 'fn-bold', value: '700' },
    { token: 'fn-extrabold', value: '800' },
  ],

  /* §1.12 — Line heights */
  lineHeights: [
    { token: 'fn-none', value: '0.95' },
    { token: 'fn-unit', value: '1' },
    { token: 'fn-tight', value: '1.35' },
    { token: 'fn-tight-plus', value: '1.4' },
    { token: 'fn-snug', value: '1.45' },
    { token: 'fn-normal', value: '1.5' },
    { token: 'fn-normal-plus', value: '1.55' },
    { token: 'fn-relaxed', value: '1.6' },
    { token: 'fn-loose', value: '1.7' },
    { token: 'fn-loose-plus', value: '1.8' },
    { token: 'fn-extra', value: '1.9' },
  ],

  /* §1.13 — Tracking */
  tracking: [
    { token: 'fn-display-tightest', value: '-0.05em' },
    { token: 'fn-display-snug', value: '-0.04em' },
    { token: 'fn-display-tighter', value: '-0.03em' },
    { token: 'fn-display-tight', value: '-0.025em' },
    { token: 'fn-tight-lo', value: '-0.015em' },
    { token: 'fn-tight', value: '-0.02em' },
    { token: 'fn-micro-tight', value: '-0.01em' },
    { token: 'fn-micro-loose', value: '-0.005em' },
    { token: 'fn-normal', value: '0' },
    { token: 'fn-positive-mini', value: '0.02em' },
    { token: 'fn-wide', value: '0.04em' },
    { token: 'fn-positive-mid', value: '0.05em' },
    { token: 'fn-uppercase-tight', value: '0.06em' },
    { token: 'fn-uppercase', value: '0.08em' },
    { token: 'fn-uppercase-wide', value: '0.10em' },
  ],

  /* §1.14 — Spacing */
  spacing: [
    { token: 'fn-0', value: '0px' },
    { token: 'fn-px', value: '1px' },
    { token: 'fn-0_5', value: '2px' },
    { token: 'fn-0_75', value: '3px' },
    { token: 'fn-1', value: '4px' },
    { token: 'fn-1_25', value: '5px' },
    { token: 'fn-1_5', value: '6px' },
    { token: 'fn-1_75', value: '7px' },
    { token: 'fn-2', value: '8px' },
    { token: 'fn-2_25', value: '9px' },
    { token: 'fn-2_5', value: '10px' },
    { token: 'fn-3', value: '12px' },
    { token: 'fn-3_5', value: '14px' },
    { token: 'fn-4', value: '16px' },
    { token: 'fn-4_5', value: '18px' },
    { token: 'fn-5', value: '20px' },
    { token: 'fn-5_5', value: '22px' },
    { token: 'fn-6', value: '24px' },
    { token: 'fn-7', value: '28px' },
    { token: 'fn-8', value: '32px' },
    { token: 'fn-9', value: '36px' },
    { token: 'fn-10', value: '40px' },
    { token: 'fn-11', value: '44px' },
    { token: 'fn-12', value: '48px' },
    { token: 'fn-13', value: '52px' },
    { token: 'fn-14', value: '56px' },
    { token: 'fn-15', value: '60px' },
    { token: 'fn-16', value: '64px' },
  ],

  /* §1.7 — Radius */
  radius: [
    { token: 'fn-px', value: '1px' },
    { token: 'fn-2xs', value: '3px' },
    { token: 'fn-xs-minus', value: '4px' },
    { token: 'fn-xs-low', value: '5px' },
    { token: 'fn-xs', value: '6px' },
    { token: 'fn-xs-plus', value: '7px' },
    { token: 'fn-sm', value: '8px' },
    { token: 'fn-md', value: '10px' },
    { token: 'fn-md-plus', value: '12px' },
    { token: 'fn-lg', value: '14px' },
    { token: 'fn-xl', value: '18px' },
    { token: 'fn-full', value: '9999px' },
  ],

  /* §1.8 — Shadow */
  shadows: [
    { token: 'xs', description: 'Hairline lift — buttons, inputs at rest.' },
    { token: 'sm', description: 'Cards, panels, table rows.' },
    { token: 'md', description: 'Floating bar, KPI hover, raised buttons.' },
    { token: 'lg', description: 'Detached panels, sticky toolbars.' },
    { token: 'popover', description: 'Popovers, dropdowns.' },
    { token: 'popover-strong', description: 'Popovers needing more contrast (light bg under).' },
    { token: 'drawer-right', description: 'Right-side sheet (open).' },
    { token: 'drawer-left', description: 'Left edge of a right-side sheet.' },
    { token: 'dialog', description: 'Modal dialogs.' },
    { token: 'hero', description: 'Hero cards on auth/marketing surfaces.' },
    { token: 'auth-card', description: 'Login / signup card.' },
  ],

  /* §1.17 — Transitions */
  durations: [
    { token: 'fn-fast', value: '120ms' },
    { token: 'fn-base', value: '150ms' },
    { token: 'fn-medium', value: '180ms' },
    { token: 'fn-slow', value: '200ms' },
    { token: 'fn-slower', value: '300ms' },
  ],
  easings: [
    { token: 'fn-standard', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    { token: 'fn-emphasized', value: 'cubic-bezier(0.2, 0, 0, 1)' },
  ],

  /* §1.16 — Sizing primitives */
  avatarSizes: [
    { token: '--fn-avatar-xs', value: '20px' },
    { token: '--fn-avatar-sm', value: '24px' },
    { token: '--fn-avatar-md', value: '28px' },
    { token: '--fn-avatar-md-plus', value: '32px' },
    { token: '--fn-avatar-lg', value: '36px' },
    { token: '--fn-avatar-xl', value: '48px' },
    { token: '--fn-avatar-2xl', value: '64px' },
  ],
  iconTileSizes: [
    { token: '--fn-icon-tile-sm', value: '28px', radius: '7px' },
    { token: '--fn-icon-tile-md', value: '36px', radius: '8px' },
    { token: '--fn-icon-tile-lg', value: '40px', radius: '10px' },
    { token: '--fn-icon-tile-xl', value: '48px', radius: '14px' },
  ],
} as const;
