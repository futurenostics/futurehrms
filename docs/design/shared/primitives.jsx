// Primitives for HRMS screens. Pure React/JSX, no shadcn dep — styled inline
// with our token vars so each artboard is self-contained.

const Icon = ({ d, size = 16, stroke = 1.6, fill = 'none', style }) =>
<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>;


// Hand-rolled minimal icons (Lucide-style geometry)
const I = {
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 0 0 4 0',
  chev: 'M6 9l6 6 6-6',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  filter: 'M3 6h18M6 12h12M10 18h4',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  calc: 'M9 7h6m-6 4h6m-6 4h4M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  scale: 'M16 16l3-8 3 8M2 16l3-8 3 8M7 8h10M12 4v16M5 20h14',
  bell2: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 0 0 4 0',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  list: 'M3 6h18M3 12h18M3 18h18',
  sort: 'M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  home: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  chart: 'M3 3v18h18M7 14l4-4 4 4 5-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  arrowU: 'M12 19V5M5 12l7-7 7 7',
  arrowD: 'M12 5v14M19 12l-7 7-7-7',
  arrowR: 'M5 12h14M12 5l7 7-7 7',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  cake: 'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s1-1 4-1 4 2 8 2 4-1 4-1M2 21h20M12 3v3M12 6l-2-2M12 6l2-2',
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01',
  command: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V3',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  card: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22',
  hold: 'M6 4h4v16H6zM14 4h4v16h-4z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  layers: 'M12 2l10 6-10 6L2 8l10-6zM2 16l10 6 10-6M2 12l10 6 10-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
};

// Buttons
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full, style, ...p }) {
  const sz = size === 'sm' ?
  { h: 28, padX: 10, font: 12.5, gap: 6, icon: 14, radius: 6 } :
  size === 'lg' ?
  { h: 40, padX: 16, font: 14, gap: 8, icon: 16, radius: 8 } :
  { h: 34, padX: 12, font: 13, gap: 7, icon: 15, radius: 6 };
  const variants = {
    primary: { background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)', border: '1px solid var(--fn-accent)' },
    secondary: { background: 'var(--fn-bg-panel)', color: 'var(--fn-fg)', border: '1px solid var(--fn-border-strong)' },
    ghost: { background: 'transparent', color: 'var(--fn-fg)', border: '1px solid transparent' },
    soft: { background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)', border: '1px solid transparent' },
    danger: { background: 'var(--fn-danger)', color: '#fff', border: '1px solid var(--fn-danger)' },
    success: { background: 'var(--fn-success)', color: '#fff', border: '1px solid var(--fn-success)' },
    outline: { background: 'transparent', color: 'var(--fn-fg)', border: '1px solid var(--fn-border-strong)' },
    dark: { background: 'var(--fn-fg)', color: 'var(--fn-fg-invert)', border: '1px solid var(--fn-fg)' }
  };
  return (
    <button {...p} style={{
      height: sz.h, padding: `0 ${sz.padX}px`, fontSize: sz.font, gap: sz.gap,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', fontWeight: 500, borderRadius: sz.radius, cursor: 'pointer',
      width: full ? '100%' : undefined, letterSpacing: '-0.005em',
      ...variants[variant], ...style
    }}>
      {icon && <Icon d={icon} size={sz.icon} />}
      {children}
      {iconRight && <Icon d={iconRight} size={sz.icon} />}
    </button>);

}

// Badge / pill / chip
function Badge({ children, tone = 'neutral', dot, trend, style }) {
  const tones = {
    neutral: { bg: 'var(--fn-bg-inset)', fg: 'var(--fn-fg-muted)', dot: 'var(--fn-fg-faint)', border: 'var(--fn-border)' },
    accent: { bg: 'var(--fn-accent-soft)', fg: 'var(--fn-accent-soft-fg)', dot: 'var(--fn-accent)', border: 'var(--fn-accent)' },
    success: { bg: 'var(--fn-success-soft)', fg: 'var(--fn-success-soft-fg)', dot: 'var(--fn-success)', border: 'var(--fn-success)' },
    warning: { bg: 'var(--fn-warning-soft)', fg: 'var(--fn-warning-soft-fg)', dot: 'var(--fn-warning)', border: 'var(--fn-warning)' },
    danger: { bg: 'var(--fn-danger-soft)', fg: 'var(--fn-danger-soft-fg)', dot: 'var(--fn-danger)', border: 'var(--fn-danger)' },
    info: { bg: 'var(--fn-info-soft)', fg: 'var(--fn-info-soft-fg)', dot: 'var(--fn-info)', border: 'var(--fn-info)' },
    outline: { bg: 'transparent', fg: 'var(--fn-fg-muted)', dot: 'var(--fn-fg-faint)', border: 'var(--fn-border)' }
  };
  const t = tones[tone];
  const arrow = trend === 'up' ? '↗' : trend === 'down' ? '↘' : null;
  // Trend pills get the outlined-pill treatment: soft bg + faint colored border + colored text
  const baseStyle = trend
    ? {
        background: t.bg, color: t.fg,
        border: `1px solid color-mix(in oklch, ${t.border} 35%, transparent)`,
        padding: '2px 9px', fontWeight: 600,
      }
    : {
        background: t.bg, color: t.fg,
        border: t.border && tone === 'outline' ? `1px solid ${t.border}` : 'none',
        padding: '2px 8px', fontWeight: 600,
      };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      borderRadius: 6, fontSize: 12,
      lineHeight: 1.55, letterSpacing: '-0.005em',
      fontVariantNumeric: 'tabular-nums',
      ...baseStyle, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot }} />}
      {children}
      {arrow && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 1 }}>{arrow}</span>}
    </span>
  );
}

// Avatar
function Avatar({ name = 'AB', size = 28, src, tone }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [25, 65, 145, 200, 280, 320];
  const hue = tone ?? hues[(name.charCodeAt(0) + name.charCodeAt(name.length - 1)) % hues.length];
  return (
    <span style={{
      width: size, height: size, borderRadius: 999,
      background: `oklch(0.9 0.06 ${hue})`, color: `oklch(0.35 0.10 ${hue})`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0
    }}>
      {initials}
    </span>);

}

// Card
function Card({ children, style, padded = true, ...p }) {
  return (
    <div {...p} style={{
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
      borderRadius: 6, padding: padded ? 20 : 0, ...style
    }}>{children}</div>);

}

// Inputs
function Input({ icon, style, suffix, ...p }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 34, padding: '0 10px',
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 6, gap: 8, fontSize: 13, ...style
    }}>
      {icon && <Icon d={icon} size={14} style={{ color: 'var(--fn-fg-faint)' }} />}
      <input {...p} style={{
        flex: 1, border: 0, background: 'transparent', outline: 'none', minWidth: 0,
        fontFamily: 'inherit', fontSize: 13, color: 'var(--fn-fg)'
      }} />
      {suffix && <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{suffix}</span>}
    </div>);

}

// Section header (title + description + actions)
function PageHeader({ title, subtitle, actions, kicker, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, ...style }}>
      <div>
        {kicker && <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 6, fontWeight: 600 }}>{kicker}</div>}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fn-fg)' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>);

}

// KPI tile — flat icon + label, very large bold number with inline trend pill
function KPI({ label, value, delta, deltaTone = 'success', deltaTrend = 'up', sub, icon, info = true, suffix }) {
  return (
    <Card style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon &&
        <span style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--fn-icon-tile)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-icon-tile-fg)', flexShrink: 0
        }}>
          <Icon d={icon} size={14} />
        </span>
        }
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--fn-fg)' }}>{label}</span>
        {info &&
        <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={15}
        style={{ color: 'var(--fn-fg-faint)', marginLeft: 'auto' }} />
        }
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        {suffix && <span style={{ fontSize: 30, fontWeight: 500, color: 'var(--fn-fg-faint)', letterSpacing: '-0.02em' }}>{suffix}</span>}
        <span style={{
          fontSize: 34, letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: 'var(--fn-fg)', fontWeight: "400"
        }}>{value}</span>
        {delta != null && <Badge tone={deltaTone} trend={deltaTrend}>{delta}</Badge>}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--fn-fg-faint)', marginTop: 12 }}>{sub}</div>}
    </Card>);

}

// Tabs (visual only)
function Tabs({ items, active, style }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--fn-border)', ...style }}>
      {items.map((it) => {
        const isActive = it === active || it.key === active;
        const label = typeof it === 'string' ? it : it.label;
        const count = typeof it === 'object' ? it.count : undefined;
        return (
          <div key={label} style={{
            padding: '10px 14px', fontSize: 13, fontWeight: 500,
            color: isActive ? 'var(--fn-fg)' : 'var(--fn-fg-muted)',
            borderBottom: isActive ? '2px solid var(--fn-accent)' : '2px solid transparent',
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
          }}>
            {label}
            {count != null &&
            <span style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 99,
              background: isActive ? 'var(--fn-accent-soft)' : 'var(--fn-bg-inset)',
              color: isActive ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
              fontVariantNumeric: 'tabular-nums'
            }}>{count}</span>
            }
          </div>);

      })}
    </div>);

}

// Money display - shows USD with PKR underneath if currencyMode is "both"
function Money({ usd, mode = 'USD', rate = 278.5, mono = true, size = 13 }) {
  const display = mode === 'USD' ? fmtUSD(usd) : fmtPKR(usd * rate);
  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums', fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
      fontSize: size, letterSpacing: '-0.01em'
    }}>{display}</span>);

}

// Compact tabular row dot
function Dot({ color = 'var(--fn-fg-faint)', size = 6 }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: color, display: 'inline-block' }} />;
}

// Simple kbd
function Kbd({ children }) {
  return <span style={{
    fontFamily: 'var(--fn-font-mono)', fontSize: 10.5, padding: '2px 5px',
    border: '1px solid var(--fn-border-strong)', borderRadius: 4,
    color: 'var(--fn-fg-muted)', background: 'var(--fn-bg-panel)'
  }}>{children}</span>;
}

// Section header — soft-filled icon tile + title, consistent across all widget cards
function SectionHeader({ icon, title, badge, right, padding = '20px 22px 16px' }) {
  return (
    <div style={{
      padding, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--fn-icon-tile)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-icon-tile-fg)', flexShrink: 0
        }}>
          <Icon d={icon} size={16} />
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </span>
        {badge}
      </div>
      {right}
    </div>);

}

// Inset-style table helpers
//
// Pattern: card body has horizontal padding; header sits in a rounded "bg-subtle"
// pill that's also inset; row borders sit between rows only (no top border on
// first row, no bottom border on last row). All tables across the app use this.
//
// Usage:
//   <InsetTable cols={[
//     { label: '', width: 48, render: first => <CheckSquare /> },          // first col
//     { label: 'Person', render: ... },
//     { label: 'Amount', align: 'right', sortable: true },
//   ]} padding={14}>
//     {rows.map((r, i) => (
//       <InsetRow key={i} bordered={i < rows.length - 1}>
//         <InsetCell first><CheckSquare /></InsetCell>
//         <InsetCell><...></InsetCell>
//         <InsetCell align="right" last>...</InsetCell>
//       </InsetRow>
//     ))}
//   </InsetTable>

function InsetTable({ cols, children, padding = 14 }) {
  return (
    <div style={{ padding: `0 ${padding}px` }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, tableLayout: 'fixed' }}>
        <colgroup>
          {cols.map((c, i) => <col key={i} style={c.width ? { width: c.width } : {}} />)}
        </colgroup>
        <thead>
          <tr>
            <th colSpan={cols.length} style={{ padding: 0 }}>
              <div style={{ background: 'var(--fn-bg-subtle)', borderRadius: 8, marginTop: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    {cols.map((c, i) => <col key={i} style={c.width ? { width: c.width } : {}} />)}
                  </colgroup>
                  <tbody>
                    <tr>
                      {cols.map((c, i) => {
                        const isFirst = i === 0;
                        const isLast = i === cols.length - 1;
                        return (
                          <td key={i} style={{
                            textAlign: c.align || 'left',
                            padding: isFirst
                              ? '12px 0 12px 18px'
                              : isLast
                                ? '12px 18px 12px 12px'
                                : '12px 12px',
                            fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                              {c.label}
                              {c.sortable && <Icon d="M12 5v14M5 12l7 7 7-7" size={11} style={{ opacity: 0.6 }} />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </th>
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function InsetRow({ children, bordered = true, highlight, style }) {
  // bordered controls whether THIS row's cells render a bottom divider.
  // Each cell uses the row's `bordered` state.
  const ctx = { bordered, highlight };
  return (
    <tr style={style} data-bordered={bordered}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { _rowBordered: bordered, _rowHighlight: highlight }) : child
      )}
    </tr>
  );
}

function InsetCell({ children, align = 'left', first, last, _rowBordered, _rowHighlight, colSpan, style }) {
  return (
    <td colSpan={colSpan} style={{
      padding: first
        ? '12px 0 12px 18px'
        : last
          ? '12px 18px 12px 12px'
          : '12px 12px',
      textAlign: align,
      borderBottom: _rowBordered ? '1px solid var(--fn-divider)' : 'none',
      background: _rowHighlight,
      verticalAlign: 'middle',
      ...style,
    }}>
      {children}
    </td>
  );
}

Object.assign(window, { Icon, I, Button, Badge, Avatar, Card, Input, PageHeader, KPI, Tabs, Money, Dot, Kbd, SectionHeader, InsetTable, InsetRow, InsetCell });
