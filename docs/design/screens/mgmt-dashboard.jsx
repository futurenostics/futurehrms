// Management Dashboard variation — finance-forward, editorial big numbers, charts
function MgmtDashboard({ currency = 'USD' }) {
  // Trend data: 12 months commission disbursed (USD k)
  const trend = [
  { m: 'Jun', v: 28 }, { m: 'Jul', v: 34 }, { m: 'Aug', v: 31 },
  { m: 'Sep', v: 39 }, { m: 'Oct', v: 36 }, { m: 'Nov', v: 41 },
  { m: 'Dec', v: 46 }, { m: 'Jan', v: 38 }, { m: 'Feb', v: 42 },
  { m: 'Mar', v: 45 }, { m: 'Apr', v: 51 }, { m: 'May', v: 48, draft: true }];

  const max = 56;
  const W = 720,H = 180,padL = 32,padR = 16,padT = 14,padB = 28;
  const innerW = W - padL - padR,innerH = H - padT - padB;
  const stepX = innerW / (trend.length - 1);
  const points = trend.map((t, i) => ({ x: padL + i * stepX, y: padT + innerH * (1 - t.v / max), ...t }));
  const path = points.map((p, i) => i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`).join(' ');
  const area = `${path} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`;

  const topEarners = [
  { name: 'Bilal Rauf', role: 'BD Manager', total: 6840, count: 9, growth: '+18%' },
  { name: 'Sana Lateef', role: 'BD Lead', total: 5210, count: 7, growth: '+9%' },
  { name: 'Omar Sheikh', role: 'Sr. Engineer', total: 4180, count: 4, growth: '+22%' },
  { name: 'Maira Khan', role: 'BD Associate', total: 3920, count: 6, growth: '+4%' },
  { name: 'Faraz Iqbal', role: 'Engineer', total: 3110, count: 3, growth: '-2%', neg: true },
  { name: 'Talha Mansoor', role: 'BD Manager', total: 2980, count: 5, growth: '+11%' }];


  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>Management overview</div>
          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>·</span>
          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>FY 2026 · May (draft)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <h1 style={{
              margin: 0, fontFamily: 'var(--fn-font-display)', fontSize: 48, fontWeight: 600,
              letterSpacing: '-0.018em', lineHeight: 1.0, color: 'var(--fn-fg)'
            }}>
              Up <span style={{ color: 'var(--fn-accent)' }}>13.6%</span> on April.
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--fn-fg-muted)', fontSize: 14, maxWidth: 560 }}>
              May projects on track for {currency === 'USD' ? '$48.2k' : '₨13.4M'} in commissions. External has overtaken Upwork for the third month running.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" icon={I.download}>Export deck</Button>
            <Button variant="secondary" icon={I.calc}>Drill: by project</Button>
          </div>
        </div>
      </div>

      {/* Big KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 28, border: '1px solid var(--fn-border)', borderRadius: 10, overflow: 'hidden', background: 'var(--fn-bg-panel)' }}>
        {[
        { k: 'May commission run', v: currency === 'USD' ? '$48,214' : '₨13,427k', s: '23 projects · 18 people', d: '+13.6% MoM', t: 'success' },
        { k: 'Revenue booked', v: currency === 'USD' ? '$312k' : '₨86.9M', s: 'across all categories', d: '+8.1% MoM', t: 'success' },
        { k: 'Payout / revenue', v: '15.4%', s: 'commissions ÷ revenue', d: '+0.6 pts', t: 'warning' },
        { k: 'Avg. per recipient', v: currency === 'USD' ? '$2,679' : '₨746k', s: '18 people on payroll', d: '+9.2% MoM', t: 'success' }].
        map((k, i) =>
        <div key={k.k} style={{ padding: 22, borderRight: i < 3 ? '1px solid var(--fn-border)' : 'none' }}>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{k.k}</div>
            <div style={{
            marginTop: 12, fontFamily: 'var(--fn-font-display)', fontSize: 38,
            letterSpacing: '-0.015em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', fontWeight: "400"
          }}>{k.v}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{k.s}</span>
              <Badge tone={k.t} dot>{k.d}</Badge>
            </div>
          </div>
        )}
      </div>

      {/* Chart + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card padded={false}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Monthly commission trend</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Disbursed amount · Jun 2025 → May 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 7, padding: 2 }}>
              {['3M', '6M', '12M', 'FY'].map((t, i) =>
              <span key={t} style={{
                padding: '4px 10px', fontSize: 11.5, fontWeight: 500,
                borderRadius: 5, background: i === 2 ? 'var(--fn-bg-panel)' : 'transparent',
                color: i === 2 ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
                boxShadow: i === 2 ? 'var(--fn-shadow-xs)' : 'none'
              }}>{t}</span>
              )}
            </div>
          </div>
          <div style={{ padding: '8px 12px 16px' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
              <defs>
                <linearGradient id="gA" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--fn-accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--fn-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Y gridlines */}
              {[0, 14, 28, 42, 56].map((v, i) => {
                const y = padT + innerH * (1 - v / max);
                return (
                  <g key={v}>
                    <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--fn-divider)" strokeWidth="1" strokeDasharray={i ? "" : ""} />
                    <text x={padL - 8} y={y + 3} fontSize="10" textAnchor="end" fill="var(--fn-fg-faint)" fontFamily="var(--fn-font-mono)">{v}k</text>
                  </g>);

              })}
              {/* Area + line */}
              <path d={area} fill="url(#gA)" />
              <path d={path} fill="none" stroke="var(--fn-accent)" strokeWidth="2" />
              {/* Points */}
              {points.map((p, i) =>
              <g key={i}>
                  <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5}
                fill={p.draft ? 'var(--fn-bg-panel)' : 'var(--fn-accent)'}
                stroke="var(--fn-accent)" strokeWidth={p.draft ? 2 : 1} />
                  <text x={p.x} y={H - 8} fontSize="10.5" textAnchor="middle" fill="var(--fn-fg-faint)" fontFamily="var(--fn-font-mono)">{p.m}</text>
                </g>
              )}
              {/* Highlight May */}
              <text x={points[points.length - 1].x} y={points[points.length - 1].y - 10} fontSize="10.5" textAnchor="middle" fill="var(--fn-fg-muted)" fontFamily="var(--fn-font-mono)">$48k · draft</text>
            </svg>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--fn-divider)' }}>
              {[
              { c: 'External', amt: 25104, pct: 52, color: 'var(--fn-accent)' },
              { c: 'Upwork', amt: 13280, pct: 28, color: 'var(--fn-warning)' },
              { c: 'B2B', amt: 9830, pct: 20, color: 'var(--fn-info)' }].
              map((b) =>
              <div key={b.c}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot color={b.color} />
                    <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{b.c}</span>
                  </div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--fn-font-mono)', fontSize: 18, fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', letterSpacing: '-0.02em' }}>
                    {currency === 'USD' ? fmtUSD(b.amt) : fmtPKR(b.amt * 278.5)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{b.pct}% of May total</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Top earners */}
        <Card padded={false}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--fn-divider)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Top earners — May</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>By commission earned</div>
          </div>
          {topEarners.map((p, i) =>
          <div key={p.name} style={{
            padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: i < topEarners.length - 1 ? '1px solid var(--fn-divider)' : 'none'
          }}>
              <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11, color: 'var(--fn-fg-faint)', width: 16 }}>{(i + 1).toString().padStart(2, '0')}</span>
              <Avatar name={p.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{p.role} · {p.count} projects</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                  {currency === 'USD' ? fmtUSD(p.total) : fmtPKR(p.total * 278.5)}
                </div>
                <div style={{ fontSize: 10.5, color: p.neg ? 'var(--fn-danger)' : 'var(--fn-success)', fontFamily: 'var(--fn-font-mono)' }}>{p.growth}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <Card padded={false}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>BD performance — last 90 days</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Win rate · pipeline · effective rate</div>
            </div>
          </div>
          <InsetTable
            padding={14}
            cols={[
              { label: 'Person' },
              { label: 'Pipeline', align: 'right', width: 100 },
              { label: 'Won', align: 'right', width: 80 },
              { label: 'Win %', align: 'right', width: 90 },
              { label: 'Comm. earned', align: 'right', width: 130 },
            ]}
          >
            <tbody>
              {[
              { n: 'Bilal Rauf', r: 'Manager', pipe: 31, won: 19, wr: 61, earn: 6840 },
              { n: 'Sana Lateef', r: 'Lead', pipe: 22, won: 12, wr: 55, earn: 5210 },
              { n: 'Maira Khan', r: 'Associate', pipe: 18, won: 9, wr: 50, earn: 3920 },
              { n: 'Talha Mansoor', r: 'Manager', pipe: 14, won: 7, wr: 50, earn: 2980 }].
              map((r, i, arr) =>
                <InsetRow key={r.n} bordered={i < arr.length - 1}>
                  <InsetCell first>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.n} size={26} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.n}</div>
                        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>BD · {r.r}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>{r.pipe}</span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{r.won}</span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{r.wr}%</span>
                  </InsetCell>
                  <InsetCell align="right" last>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {currency === 'USD' ? fmtUSD(r.earn) : fmtPKR(r.earn * 278.5)}
                    </span>
                  </InsetCell>
                </InsetRow>
              )}
            </tbody>
          </InsetTable>
          <div style={{ height: 14 }} />
        </Card>

        <Card padded={false}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Effective hourly rate by Upwork profile</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Logged hours ÷ commission · last 30 days</div>
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
            { p: 'Johnny Lee', hrs: 184, rate: 38.5, target: 35 },
            { p: 'Michele Park', hrs: 152, rate: 42.1, target: 35 },
            { p: 'Daniel Voss', hrs: 96, rate: 31.4, target: 35, under: true },
            { p: 'Rebecca Im', hrs: 88, rate: 36.8, target: 35 }].
            map((p) =>
            <div key={p.p}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.p}</div>
                  <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: p.under ? 'var(--fn-danger)' : 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums' }}>${p.rate.toFixed(1)}/hr</div>
                </div>
                <div style={{ height: 24, background: 'var(--fn-bg-inset)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                  height: '100%', width: `${Math.min(p.rate / 50 * 100, 100)}%`,
                  background: p.under ? 'var(--fn-danger-soft)' : 'var(--fn-accent-soft)',
                  borderRight: `2px solid ${p.under ? 'var(--fn-danger)' : 'var(--fn-accent)'}`
                }} />
                  <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: `${p.target / 50 * 100}%`,
                  borderLeft: '1px dashed var(--fn-fg-faint)'
                }} />
                  <div style={{
                  position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                  fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)'
                }}>{p.hrs} hrs</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ borderLeft: '1px dashed var(--fn-fg-faint)', height: 14, display: 'inline-block' }} /> Target rate $35/hr
            </div>
          </div>
        </Card>
      </div>
    </>);

}

window.MgmtDashboard = MgmtDashboard;