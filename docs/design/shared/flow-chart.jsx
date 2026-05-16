// FlowStackChart — matches the reference Sales Overview chart.
// Each month is a vertical stack of pill-shaped segments. Between months,
// each category is bridged by a tapering, semi-transparent ribbon
// connecting top-edge → top-edge and bottom-edge → bottom-edge with bezier curves.

// Renders a single rounded-pill segment.
function PillSegment({ x, y, width, height, color }) {
  // Min height to keep small values visible; large radius for pill look
  const h = Math.max(height, 14);
  const radius = Math.min(h / 2, 12);
  return (
    <rect x={x} y={y} width={width} height={h} rx={radius} ry={radius} fill={color} />
  );
}

// Smooth-edge ribbon between two segments in adjacent months.
// The ribbon is inset from each pill by a small gap, and its ends are rounded
// (small corner radius) so it matches the pill's rounded corners cleanly.
function FlowRibbon({ x1, x2, y1Top, y1Bot, y2Top, y2Bot, color }) {
  const gap = 6;     // horizontal gap from the pill
  const r = 5;       // corner radius on each end of the ribbon
  // Pull endpoints away from the pills
  const lx = x1 + gap;
  const rx = x2 - gap;
  // Clamp radii so they never exceed half the segment height
  const lr = Math.min(r, Math.max(0, (y1Bot - y1Top) / 2 - 0.5));
  const rr = Math.min(r, Math.max(0, (y2Bot - y2Top) / 2 - 0.5));
  // Horizontal midpoint for the bezier control points (use inset edges)
  const midX = (lx + rx) / 2;
  const d = [
    // Top edge — start just below top-left corner radius
    `M ${lx} ${y1Top + lr}`,
    // Top-left corner
    `Q ${lx} ${y1Top}, ${lx + lr} ${y1Top}`,
    // Top bezier: lx+lr -> rx-rr along the top
    `C ${midX} ${y1Top}, ${midX} ${y2Top}, ${rx - rr} ${y2Top}`,
    // Top-right corner
    `Q ${rx} ${y2Top}, ${rx} ${y2Top + rr}`,
    // Right edge (vertical, shortened by both radii)
    `L ${rx} ${y2Bot - rr}`,
    // Bottom-right corner
    `Q ${rx} ${y2Bot}, ${rx - rr} ${y2Bot}`,
    // Bottom bezier back to bottom-left
    `C ${midX} ${y2Bot}, ${midX} ${y1Bot}, ${lx + lr} ${y1Bot}`,
    // Bottom-left corner
    `Q ${lx} ${y1Bot}, ${lx} ${y1Bot - lr}`,
    // Left edge (closes path back to start)
    'Z',
  ].join(' ');
  return <path d={d} fill={color} opacity="0.22" />;
}

// data: [{ label, total, segments: [{ key, color, value }] }]
function FlowStackChart({ data, height = 280, pillWidth = 120, currency = 'USD', rate = 278.5 }) {
  // Layout
  const W = 800;
  // padX must be at least pillWidth/2 so the leftmost/rightmost pills sit inside the viewBox.
  // Add a touch extra so the total-amount labels above the stacks don't crowd the card edges.
  const padX = Math.max(pillWidth / 2 + 18, 60);
  const labelSpace = 32;            // bottom space for month labels
  const totalSpace = 28;            // top space for $ total labels
  const innerH = height - labelSpace - totalSpace;

  // Determine vertical scale — based on the largest month total
  const maxTotal = Math.max(...data.map(m => m.total));
  // Use a gap between pills
  const gap = 6;

  // Column x positions (centers)
  const cols = data.map((_, i) => padX + (i * (W - 2 * padX)) / (data.length - 1));

  // For each column, compute segments y-positions stacked from bottom
  const layouts = data.map((m, mi) => {
    const baseY = totalSpace + innerH;     // bottom of stack
    let cursor = baseY;
    const segs = m.segments.map(s => {
      // Use sqrt scaling so small values still get visible height
      const heightUnscaled = (s.value / maxTotal) * innerH;
      const h = Math.max(heightUnscaled, 14);
      const top = cursor - h;
      const seg = { ...s, top, bottom: cursor, x: cols[mi] - pillWidth / 2, h };
      cursor -= (h + gap);
      return seg;
    });
    return { ...m, segs, centerX: cols[mi] };
  });

  // Format currency
  const fmt = (n) => currency === 'USD'
    ? `$${n.toLocaleString('en-US')}`
    : `₨${Math.round(n * rate / 1000)}k`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible' }}>
      {/* Ribbons first (so pills sit on top) */}
      {layouts.slice(0, -1).map((m, mi) => {
        const next = layouts[mi + 1];
        return m.segs.map((s, si) => {
          const s2 = next.segs[si];
          if (!s2) return null;
          const xR = s.x + pillWidth;
          const xL = s2.x;
          return (
            <FlowRibbon key={`${mi}-${si}`}
              x1={xR} x2={xL}
              y1Top={s.top} y1Bot={s.bottom}
              y2Top={s2.top} y2Bot={s2.bottom}
              color={s.color}
            />
          );
        });
      })}

      {/* Pills + month labels */}
      {layouts.map((m, mi) => (
        <g key={m.label}>
          {/* Total label */}
          <text x={m.centerX} y={Math.min(...m.segs.map(s => s.top)) - 10}
            textAnchor="middle" fontSize="13" fontWeight="700"
            fill="var(--fn-fg)" fontFamily="var(--fn-font-mono)"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(m.total)}
          </text>
          {/* Pill segments */}
          {m.segs.map((s, si) => (
            <PillSegment key={si} x={s.x} y={s.top} width={pillWidth} height={s.h} color={s.color} />
          ))}
          {/* Month label */}
          <text x={m.centerX} y={height - 10} textAnchor="middle"
            fontSize="13" fontWeight="500" fill="var(--fn-fg-muted)">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

window.FlowStackChart = FlowStackChart;
