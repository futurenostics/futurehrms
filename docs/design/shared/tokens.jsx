// Design tokens — Futurenostics HRMS
// Cool, modern SaaS direction: indigo-violet + mint, cool neutrals, sans-only.

const fnTokens = {
  fontSans: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontDisplay: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
  fontMono: '"Geist Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',

  light: {
    bg: 'oklch(0.965 0.004 250)',          // cool app bg (like #ECEEF1)
    bgSubtle: 'oklch(0.975 0.003 250)',
    bgPanel: 'oklch(1 0 0)',               // white cards
    bgInset: 'oklch(0.955 0.004 250)',
    border: 'oklch(0.92 0.005 250)',
    borderStrong: 'oklch(0.88 0.006 250)',
    divider: 'oklch(0.935 0.004 250)',

    fg: 'oklch(0.18 0.012 260)',
    fgMuted: 'oklch(0.50 0.012 260)',
    fgFaint: 'oklch(0.66 0.010 260)',
    fgInvert: 'oklch(0.98 0.003 250)',

    // Primary indigo-violet
    accent: 'oklch(0.55 0.18 280)',
    accentHover: 'oklch(0.49 0.20 280)',
    accentFg: 'oklch(0.99 0.003 250)',
    accentSoft: 'oklch(0.95 0.04 280)',
    accentSoftFg: 'oklch(0.42 0.16 280)',

    // Mint / teal — positive/secondary
    success: 'oklch(0.65 0.12 175)',
    successSoft: 'oklch(0.94 0.06 175)',
    successSoftFg: 'oklch(0.40 0.10 175)',

    // Amber — warning
    warning: 'oklch(0.74 0.13 75)',
    warningSoft: 'oklch(0.95 0.05 80)',
    warningSoftFg: 'oklch(0.46 0.10 70)',

    // Coral — danger (matches reference negative pill)
    danger: 'oklch(0.62 0.16 22)',
    dangerSoft: 'oklch(0.94 0.04 22)',
    dangerSoftFg: 'oklch(0.48 0.13 22)',

    // Sky — info
    info: 'oklch(0.58 0.13 245)',
    infoSoft: 'oklch(0.95 0.04 245)',
    infoSoftFg: 'oklch(0.42 0.12 245)',
  },

  dark: {
    bg: 'oklch(0.16 0.010 260)',
    bgSubtle: 'oklch(0.19 0.010 260)',
    bgPanel: 'oklch(0.22 0.010 260)',
    bgInset: 'oklch(0.14 0.010 260)',
    border: 'oklch(0.28 0.012 260)',
    borderStrong: 'oklch(0.36 0.014 260)',
    divider: 'oklch(0.24 0.010 260)',

    fg: 'oklch(0.96 0.005 250)',
    fgMuted: 'oklch(0.72 0.010 255)',
    fgFaint: 'oklch(0.56 0.010 255)',
    fgInvert: 'oklch(0.16 0.010 260)',

    accent: 'oklch(0.70 0.17 280)',
    accentHover: 'oklch(0.76 0.17 280)',
    accentFg: 'oklch(0.16 0.010 260)',
    accentSoft: 'oklch(0.30 0.10 280)',
    accentSoftFg: 'oklch(0.85 0.13 280)',

    success: 'oklch(0.74 0.13 175)',
    successSoft: 'oklch(0.28 0.07 175)',
    successSoftFg: 'oklch(0.82 0.12 175)',

    warning: 'oklch(0.80 0.14 75)',
    warningSoft: 'oklch(0.30 0.08 75)',
    warningSoftFg: 'oklch(0.84 0.13 75)',

    danger: 'oklch(0.70 0.16 22)',
    dangerSoft: 'oklch(0.28 0.07 22)',
    dangerSoftFg: 'oklch(0.82 0.13 22)',

    info: 'oklch(0.72 0.13 245)',
    infoSoft: 'oklch(0.28 0.07 245)',
    infoSoftFg: 'oklch(0.82 0.12 245)',
  },

  rXs: '6px', rSm: '8px', rMd: '10px', rLg: '14px', rXl: '18px', rFull: '999px',

  shadowXs: '0 1px 2px rgba(15,17,23,.04)',
  shadowSm: '0 1px 2px rgba(15,17,23,.04),0 1px 1px rgba(15,17,23,.03)',
  shadowMd: '0 4px 14px rgba(15,17,23,.06),0 2px 4px rgba(15,17,23,.04)',
  shadowLg: '0 16px 36px rgba(15,17,23,.10),0 6px 12px rgba(15,17,23,.06)',
};

function fnVars(mode = 'light', accentHue = 280) {
  const p = mode === 'dark' ? fnTokens.dark : fnTokens.light;
  const lAccent = mode === 'dark' ? 0.70 : 0.55;
  const cAccent = mode === 'dark' ? 0.17 : 0.18;
  const accent = `oklch(${lAccent} ${cAccent} ${accentHue})`;
  const accentHover = `oklch(${mode === 'dark' ? 0.76 : 0.49} ${cAccent + (mode === 'dark' ? 0 : 0.02)} ${accentHue})`;
  const accentSoft = `oklch(${mode === 'dark' ? 0.30 : 0.95} ${mode === 'dark' ? 0.10 : 0.04} ${accentHue})`;
  const accentSoftFg = `oklch(${mode === 'dark' ? 0.85 : 0.42} ${mode === 'dark' ? 0.13 : 0.16} ${accentHue})`;
  return {
    '--fn-bg': p.bg,
    '--fn-bg-subtle': p.bgSubtle,
    '--fn-bg-panel': p.bgPanel,
    '--fn-bg-inset': p.bgInset,
    '--fn-border': p.border,
    '--fn-border-strong': p.borderStrong,
    '--fn-divider': p.divider,
    '--fn-fg': p.fg,
    '--fn-fg-muted': p.fgMuted,
    '--fn-fg-faint': p.fgFaint,
    '--fn-fg-invert': p.fgInvert,
    '--fn-accent': accent,
    '--fn-accent-hover': accentHover,
    '--fn-accent-fg': p.accentFg,
    '--fn-accent-soft': accentSoft,
    '--fn-accent-soft-fg': accentSoftFg,
    '--fn-success': p.success, '--fn-success-soft': p.successSoft, '--fn-success-soft-fg': p.successSoftFg,
    '--fn-warning': p.warning, '--fn-warning-soft': p.warningSoft, '--fn-warning-soft-fg': p.warningSoftFg,
    '--fn-danger': p.danger, '--fn-danger-soft': p.dangerSoft, '--fn-danger-soft-fg': p.dangerSoftFg,
    '--fn-info': p.info, '--fn-info-soft': p.infoSoft, '--fn-info-soft-fg': p.infoSoftFg,
    '--fn-neutral-soft': p.bgInset, '--fn-neutral-soft-fg': p.fgMuted,
    // Cool pale tile for icon backgrounds (SectionHeader, KPI icons, etc.)
    '--fn-icon-tile': mode === 'dark' ? 'oklch(0.26 0.012 220)' : 'oklch(0.965 0.009 220)',
    '--fn-icon-tile-fg': mode === 'dark' ? 'oklch(0.72 0.012 220)' : 'oklch(0.50 0.020 220)',
    '--fn-font-sans': fnTokens.fontSans,
    '--fn-font-display': fnTokens.fontDisplay,
    '--fn-font-mono': fnTokens.fontMono,
    '--fn-shadow-xs': fnTokens.shadowXs,
    '--fn-shadow-sm': fnTokens.shadowSm,
    '--fn-shadow-md': fnTokens.shadowMd,
    '--fn-shadow-lg': fnTokens.shadowLg,
    fontFamily: fnTokens.fontSans,
    color: p.fg,
    background: p.bg,
  };
}

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
function fmtPKR(n) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n, d = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}
function fmtMoney(n, mode = 'USD', rate = 278.5) {
  if (mode === 'USD') return fmtUSD(n);
  return fmtPKR(n * rate);
}

Object.assign(window, { fnTokens, fnVars, fmtUSD, fmtPKR, fmtNum, fmtMoney });
