// HR Dashboard — patterned after the Nexus reference, applied to HR/commission data
function HRDashboard({ currency = 'USD' }) {
  // Weekly activity bars (Tue/Highlighted = approvals processed today)
  const week = [
  { d: 'Sun', v: 0.18, label: '2' },
  { d: 'Mon', v: 0.42, label: '8' },
  { d: 'Tue', v: 0.95, label: '14', active: true },
  { d: 'Wed', v: 0.30, label: '5' },
  { d: 'Thu', v: 0.55, label: '11' },
  { d: 'Fri', v: 0.48, label: '9' },
  { d: 'Sat', v: 0.08, label: '1' }];


  // Flow-chart data: 5 commission categories across 3 months
  const flowData = [
  {
    label: 'Mar', total: 41200,
    segments: [
    { key: 'external', color: 'oklch(0.40 0.18 280)', value: 18000 },
    { key: 'upw-johnny', color: 'oklch(0.62 0.20 280)', value: 8200 },
    { key: 'upw-michele', color: 'oklch(0.58 0.18 245)', value: 6000 },
    { key: 'b2b', color: 'oklch(0.72 0.14 175)', value: 6000 },
    { key: 'other', color: 'oklch(0.82 0.10 175)', value: 3000 }]

  },
  {
    label: 'Apr', total: 45840,
    segments: [
    { key: 'external', color: 'oklch(0.40 0.18 280)', value: 21000 },
    { key: 'upw-johnny', color: 'oklch(0.62 0.20 280)', value: 9000 },
    { key: 'upw-michele', color: 'oklch(0.58 0.18 245)', value: 7000 },
    { key: 'b2b', color: 'oklch(0.72 0.14 175)', value: 5800 },
    { key: 'other', color: 'oklch(0.82 0.10 175)', value: 3040 }]

  },
  {
    label: 'May', total: 48214,
    segments: [
    { key: 'external', color: 'oklch(0.40 0.18 280)', value: 22000 },
    { key: 'upw-johnny', color: 'oklch(0.62 0.20 280)', value: 9000 },
    { key: 'upw-michele', color: 'oklch(0.58 0.18 245)', value: 4280 },
    { key: 'b2b', color: 'oklch(0.72 0.14 175)', value: 9830 },
    { key: 'other', color: 'oklch(0.82 0.10 175)', value: 3104 }]

  }];


  const flowLegend = [
  { l: 'External', c: 'oklch(0.40 0.18 280)' },
  { l: 'Upwork · Johnny', c: 'oklch(0.62 0.20 280)' },
  { l: 'Upwork · Michele', c: 'oklch(0.58 0.18 245)' },
  { l: 'B2B', c: 'oklch(0.72 0.14 175)' },
  { l: 'Other', c: 'oklch(0.82 0.10 175)' }];


  // Recent disbursements list (integration-style)
  const recent = [
  { who: 'Bilal Rauf', role: 'Sr. Engineer', dept: 'Engineering', rate: 86, amt: 2880, hue: 280 },
  { who: 'Sana Lateef', role: 'BD Lead', dept: 'Business Dev', rate: 72, amt: 2410, hue: 175 },
  { who: 'Talha Mansoor', role: 'BD Manager', dept: 'Business Dev', rate: 68, amt: 2280, hue: 22 },
  { who: 'Maira Khan', role: 'BD Associate', dept: 'Business Dev', rate: 58, amt: 1920, hue: 245 },
  { who: 'Omar Sheikh', role: 'Sr. Engineer', dept: 'Engineering', rate: 49, amt: 1640, hue: 145 }];


  return (
    <>
      {/* Page header — matches reference: title + right toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Dashboard
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.clock}>01 May – 31 May</ToolbarPill>
          <ToolbarPill iconRight={I.chev}>Monthly</ToolbarPill>
          <ToolbarPill icon={I.filter}>Filter</ToolbarPill>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPI
          icon={I.users}
          label="Headcount"
          value="84"
          delta="7.2%"
          deltaTone="success"
          deltaTrend="up" />
        
        <KPI
          icon={I.briefcase}
          label="Active Projects"
          value="23"
          delta="15.0%"
          deltaTone="success"
          deltaTrend="up" />
        
        <KPI
          icon={I.clock}
          label="Pending Actions"
          value="6"
          delta="2 overdue"
          deltaTone="danger"
          deltaTrend="down" />
        
      </div>

      {/* Mid row — Commission Overview (big number + stacked chart) + Weekly Activity (bar chart) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card padded={false}>
          <SectionHeader icon={I.chart} title="Commission Overview" padding="20px 22px 0" right={
          <div style={{ display: 'flex', gap: 8 }}>
              <ToolbarPill icon={I.filter} small>Filter</ToolbarPill>
              <ToolbarPill icon={I.sort} small>Sort</ToolbarPill>
              <span style={{
              width: 32, height: 32, borderRadius: 6, border: '1px solid var(--fn-border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)'
            }}>
                <Icon d={I.more} size={15} />
              </span>
            </div>
          } />
          <div style={{ padding: '14px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--fn-fg-faint)', letterSpacing: '-0.02em' }}>$</span>
              <span style={{
                fontSize: 36, letterSpacing: '-0.03em', color: 'var(--fn-fg)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontWeight: "400"
              }}>48,214<span style={{ color: 'var(--fn-fg-faint)', fontWeight: "400" }}>.50</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Badge tone="success" trend="up">13.6%</Badge>
              <span style={{ fontSize: 13, color: 'var(--fn-fg-muted)' }}>+ $5,820 vs April · draft for approval</span>
            </div>
          </div>

          {/* Flow stack chart */}
          <div style={{ padding: '24px 12px 16px' }}>
            <FlowStackChart data={flowData} height={300} pillWidth={130} currency={currency} />

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, marginTop: 6, paddingTop: 14, borderTop: '1px solid var(--fn-divider)', flexWrap: 'wrap', paddingInline: 10, justifyContent: 'center' }}>
              {flowLegend.map((g) =>
              <span key={g.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fn-fg-muted)', fontWeight: 500 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: g.c }} />
                  {g.l}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Your queue — action panel */}
        <Card padded={false} style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHeader
            icon={I.zap}
            title="Your queue"
            padding="20px 22px 0"
            right={<><Badge tone="danger" style={{ marginRight: 'auto', marginLeft: -4 }}>5</Badge><ToolbarPill iconRight={I.chev} small>Today</ToolbarPill></>} />
          

          {/* Progress strip — completed today */}
          <div style={{ padding: '16px 22px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fn-fg-muted)' }}>Completed today</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: 'var(--fn-fg)' }}>9</span>
                <span style={{ color: 'var(--fn-fg-faint)' }}> / 14</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, height: 10 }}>
              {Array.from({ length: 14 }).map((_, i) =>
              <div key={i} style={{
                flex: 1, borderRadius: 3,
                background: i < 9 ? 'var(--fn-accent)' : i === 9 ? 'var(--fn-accent-soft)' : 'var(--fn-bg-inset)'
              }} />
              )}
            </div>
          </div>

          {/* Pending action items */}
          <div style={{ flex: 1, padding: '14px 0 0' }}>
            {[
            {
              kind: 'commission',
              icon: I.calc, hue: 280,
              title: 'May commission run',
              sub: '$48,214.50 · 18 recipients',
              tag: 'Overdue 1d', tagTone: 'danger',
              action: 'Approve'
            },
            {
              kind: 'evaluation',
              icon: I.star, hue: 245,
              title: 'Probation review · Hassan Tariq',
              sub: 'Reviewer awaiting · Eng',
              tag: 'Due in 3d', tagTone: 'warning',
              action: 'Review'
            },
            {
              kind: 'hold',
              icon: I.hold, hue: 22,
              title: 'GreenLeaf eCommerce on hold',
              sub: 'Decide carry-forward to June',
              tag: 'Action needed', tagTone: 'danger',
              action: 'Decide'
            },
            {
              kind: 'onboard',
              icon: I.user, hue: 175,
              title: 'Onboard Awais Mahmood',
              sub: 'Joins Mon 18 May · BD',
              tag: 'In 3d', tagTone: 'success',
              action: 'Prepare'
            }].
            map((item, i) =>
            <div key={i} style={{
              padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 12,
              borderTop: '1px solid var(--fn-divider)'
            }}>
                <span style={{
                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                background: `oklch(0.94 0.05 ${item.hue})`,
                color: `oklch(0.40 0.15 ${item.hue})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                  <Icon d={item.icon} size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: 'var(--fn-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: "500" }}>
                      {item.title}
                    </span>
                    <Badge tone={item.tagTone} style={{ flexShrink: 0, fontSize: 10.5, padding: '1px 6px' }}>
                      {item.tag}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.sub}
                  </div>
                </div>
                <button style={{
                height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600,
                background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
                border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0
              }}>
                  {item.action}
                </button>
              </div>
            )}
          </div>

          <div style={{
            padding: '12px 22px', borderTop: '1px solid var(--fn-divider)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--fn-bg-subtle)', borderRadius: '0 0 10px 10px'
          }}>
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>1 overdue</span> · earliest action 14 May
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>
              See all queue →
            </span>
          </div>
        </Card>
      </div>

      {/* Bottom row — Department distribution (donut-ish) + Recent disbursements table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        <Card padded={false}>
          <SectionHeader icon={I.building} title="Headcount Distribution" padding="20px 22px 14px" right={<ToolbarPill iconRight={I.chev} small>This month</ToolbarPill>} />

          <div style={{ padding: '0 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              {[
              { l: 'Engineering', n: 42, c: 'var(--fn-accent)' },
              { l: 'Business Dev', n: 21, c: 'oklch(0.70 0.13 175)' },
              { l: 'Operations', n: 12, c: 'oklch(0.62 0.13 245)' }].
              map((d) =>
              <div key={d.l} style={{ flex: 1, borderLeft: `2px solid ${d.c}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontWeight: 500 }}>{d.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                    {d.n} <span style={{ color: 'var(--fn-fg-faint)', fontWeight: 500, fontSize: 13 }}>ppl</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Half-donut */}
          <div style={{ padding: '20px 22px 24px', display: 'flex', justifyContent: 'center' }}>
            <HalfDonut data={[
            { v: 42, c: 'var(--fn-accent)' },
            { v: 21, c: 'oklch(0.70 0.13 175)' },
            { v: 12, c: 'var(--fn-fg-faint)', solid: false },
            { v: 9, c: 'var(--fn-fg-faint)', solid: false }]
            } />
          </div>
          <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>0 ppl</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>84 ppl</span>
          </div>
        </Card>

        {/* Top Earners — integration-style list */}
        <Card padded={false}>
          <div style={{ padding: '20px 22px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 6,
                border: '1px solid var(--fn-border-strong)',
                background: 'var(--fn-bg-panel)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fn-fg-muted)', borderWidth: "0px", backgroundColor: "rgb(242, 247, 248)"
              }}>
                <Icon d={I.sort} size={15} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.01em' }}>
                Top Earners — May 2026
              </span>
            </div>
            <span style={{
              fontSize: 13, color: 'var(--fn-accent-soft-fg)', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.005em'
            }}>See All</span>
          </div>

          <div style={{ padding: '0 18px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th colSpan={5} style={{ padding: 0 }}>
                    <div style={{
                      background: 'var(--fn-bg-subtle)',
                      borderRadius: 8,
                      padding: 0,
                      marginTop: 4,
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: 56, padding: '14px 0 14px 22px', textAlign: "left" }}>
                              <CheckSquare />
                            </td>
                            <td style={{ textAlign: 'left', padding: '14px 8px', fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Person
                            </td>
                            <td style={{ textAlign: 'left', padding: '14px 8px', fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Department
                            </td>
                            <td style={{ textAlign: 'left', padding: '14px 8px', fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Share
                            </td>
                            <td style={{ textAlign: 'right', padding: '14px 22px 14px 8px', fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Commission
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) =>
                <tr key={r.who}>
                    <td style={{ padding: '14px 0 14px 22px', borderBottom: i < recent.length - 1 ? '1px solid var(--fn-divider)' : 'none', width: 56 }}><CheckSquare /></td>
                    <td style={{ padding: '14px 8px', borderBottom: i < recent.length - 1 ? '1px solid var(--fn-divider)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `oklch(0.92 0.07 ${r.hue})`, color: `oklch(0.38 0.15 ${r.hue})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0
                      }}>
                          {r.who.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </span>
                        <span style={{ fontWeight: 500, color: 'var(--fn-fg)' }}>{r.who}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--fn-fg-muted)', borderBottom: i < recent.length - 1 ? '1px solid var(--fn-divider)' : 'none' }}>{r.dept}</td>
                    <td style={{ padding: '14px 8px', borderBottom: i < recent.length - 1 ? '1px solid var(--fn-divider)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ height: 6, flex: 1, background: 'var(--fn-bg-inset)', borderRadius: 99, maxWidth: 110, minWidth: 80 }}>
                          <div style={{ height: '100%', width: `${r.rate}%`, background: 'var(--fn-accent)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, minWidth: 36 }}>{r.rate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 22px 14px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', borderBottom: i < recent.length - 1 ? '1px solid var(--fn-divider)' : 'none' }}>
                      {currency === 'USD' ? `$${r.amt.toLocaleString()}.00` : `₨${(r.amt * 278.5).toLocaleString('en-PK')}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>);

}

// Small reusable bits
function ToolbarPill({ children, icon, iconRight, small, style }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: small ? 30 : 36, padding: small ? '0 10px' : '0 12px',
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)',
      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      ...style
    }}>
      {icon && <Icon d={icon} size={13} style={{ color: 'var(--fn-fg-muted)' }} />}
      {children}
      {iconRight && <Icon d={iconRight} size={13} style={{ color: 'var(--fn-fg-muted)' }} />}
    </button>);

}

function StackedSegment({ color, height }) {
  // Render the inset highlight + the colored stack as a single rounded block
  return (
    <div style={{
      height: Math.max(height / 4, 14), borderRadius: 6,
      background: color, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 4, left: 4, right: 4, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.35)' }} />
    </div>);

}

function CheckSquare({ checked }) {
  return (
    <span style={{
      display: 'inline-flex', width: 20, height: 20, borderRadius: 5,
      border: '1.5px solid var(--fn-border-strong)',
      background: checked ? 'var(--fn-accent)' : 'var(--fn-bg-panel)'
    }} />);

}

function HalfDonut({ data }) {
  // data: [{ v, c, solid? }] — solid items are arcs (butt/flat caps everywhere);
  // items with solid:false render as evenly-spaced radial tick marks.
  const W = 260, H = 140;
  const cx = W / 2, cy = H - 8;
  const radius = 92;
  const stroke = 28;
  const total = data.reduce((s, d) => s + d.v, 0);
  // Half-circle: 180° (left, π) → 360° (right, 2π)
  const gap = 0.06; // gap between any two adjacent segments (solid↔solid, solid↔tick, tick↔tick)

  // Tick band
  const tickInner = radius - stroke / 2 + 1;
  const tickOuter = radius + stroke / 2 - 1;

  // Build segment angles
  const segments = [];
  let acc = 0;
  data.forEach(d => {
    const start = (acc / total) * Math.PI + Math.PI;
    const end = ((acc + d.v) / total) * Math.PI + Math.PI;
    acc += d.v;
    segments.push({ ...d, start, end });
  });

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Solid arcs — flat butt caps everywhere */}
      {segments.map((seg, i) => {
        if (seg.solid === false) return null;
        const prev = segments[i - 1];
        const next = segments[i + 1];
        // Insert a half-gap on any side where there's a neighbour (solid or tick)
        const insetStart = prev ? gap / 2 : 0;
        const insetEnd = next ? gap / 2 : 0;
        const a1 = seg.start + insetStart;
        const a2 = seg.end - insetEnd;
        const x1 = cx + radius * Math.cos(a1);
        const y1 = cy + radius * Math.sin(a1);
        const x2 = cx + radius * Math.cos(a2);
        const y2 = cy + radius * Math.sin(a2);
        const large = a2 - a1 > Math.PI ? 1 : 0;
        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
        return (
          <path key={i} d={path} stroke={seg.c} strokeWidth={stroke}
            fill="none" strokeLinecap="butt" />
        );
      })}

      {/* Tick segments — inset on both sides so adjacent ticks show a visible gap */}
      {segments.map((seg, i) => {
        if (seg.solid !== false) return null;
        const prev = segments[i - 1];
        const next = segments[i + 1];
        const insetStart = (prev ? gap / 2 : 0);
        const insetEnd = (next ? gap / 2 : 0);
        const a1 = seg.start + insetStart;
        const a2 = seg.end - insetEnd;
        const arc = a2 - a1;
        const tickStep = 0.045;
        const tickCount = Math.max(3, Math.floor(arc / tickStep));
        const actualStep = arc / tickCount;
        return (
          <g key={`t-${i}`}>
            {Array.from({ length: tickCount + 1 }).map((_, ti) => {
              const a = a1 + ti * actualStep;
              const x1 = cx + tickInner * Math.cos(a);
              const y1 = cy + tickInner * Math.sin(a);
              const x2 = cx + tickOuter * Math.cos(a);
              const y2 = cy + tickOuter * Math.sin(a);
              return (
                <line key={ti} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={seg.c} strokeWidth="1.2" strokeLinecap="butt" opacity="0.55" />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { HRDashboard, ToolbarPill, CheckSquare });