// Employee Self-Service Portal — useful, action-oriented widgets
function EmployeePortal({ currency = 'USD' }) {
  // Commission trend (12mo)
  const months = [
    { m: 'Jun', v: 480 }, { m: 'Jul', v: 720 }, { m: 'Aug', v: 940 },
    { m: 'Sep', v: 1120 }, { m: 'Oct', v: 1380 }, { m: 'Nov', v: 1640 },
    { m: 'Dec', v: 2100 }, { m: 'Jan', v: 1480 }, { m: 'Feb', v: 1820 },
    { m: 'Mar', v: 2240 }, { m: 'Apr', v: 1840 }, { m: 'May', v: 2880, draft: true },
  ];
  const maxV = 3200;
  const ytd = months.slice(-5).reduce((s, m) => s + m.v, 0);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--fn-fg-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 }}>
            <span>My space</span>
            <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
            <span>Friday 15 May 2026</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Hello, Bilal.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)' }}>
            You have 2 things to action this week. Your May commission is being processed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.calc}>Request time off</ToolbarPill>
          <ToolbarPill icon={I.send}>Get help</ToolbarPill>
          <Button icon={I.download}>Salary certificate</Button>
        </div>
      </div>

      {/* KPI row — personal stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.card} label="May commission" value="$2,880" delta="56.5%" deltaTrend="up" />
        <KPI icon={I.briefcase} label="Active projects" value="3" delta="2 ext · 1 b2b" deltaTone="neutral" deltaTrend="up" info />
        <KPI icon={I.clock} label="Leave balance" value="12.5" delta="of 18 days" deltaTone="success" deltaTrend="up" />
        <KPI icon={I.star} label="Performance" value="4.6" delta="0.4 vs prev" deltaTone="success" deltaTrend="up" />
      </div>

      {/* Row 1 — Hero (this month commission) + Your queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Commission hero */}
        <Card padded={false} style={{
          background: 'linear-gradient(135deg, oklch(0.97 0.03 280) 0%, oklch(0.96 0.04 175) 100%)',
          borderColor: 'color-mix(in oklch, var(--fn-accent) 20%, var(--fn-border))',
        }}>
          <SectionHeader
            icon={I.card}
            title="May 2026 commission"
            badge={<Badge tone="warning" dot>Draft</Badge>}
            right={<span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>Locks 31 May · pays 03 Jun</span>}
          />
          <div style={{ padding: '0 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 30, fontWeight: 500, color: 'var(--fn-fg-faint)', letterSpacing: '-0.02em' }}>$</span>
              <span style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.035em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 0.95 }}>
                2,880<span style={{ color: 'var(--fn-fg-faint)', fontWeight: 500, fontSize: 28 }}>.00</span>
              </span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge tone="success" trend="up">+$1,040 vs Apr</Badge>
              <span style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>across 3 source projects</span>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed color-mix(in oklch, var(--fn-accent) 18%, transparent)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-muted)', marginBottom: 10 }}>
                Source projects
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { p: 'Polaris CRM migration', role: 'Winner', amt: 2160, tone: 'accent', hue: 280, share: 75 },
                  { p: 'Acme Web Refresh', role: 'Communicator', amt: 588, tone: 'info', hue: 200, share: 21 },
                  { p: 'Vector Studio — brand site', role: 'Eligible · ⅗', amt: 132, tone: 'success', hue: 175, share: 4 },
                ].map(p => (
                  <div key={p.p} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: `oklch(0.93 0.06 ${p.hue})`, color: `oklch(0.40 0.14 ${p.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon d={I.briefcase} size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{p.p}</div>
                      <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{p.role} · {p.share}% of payout</div>
                    </div>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fn-fg)' }}>
                      ${p.amt.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Your queue — tasks for the employee */}
        <Card padded={false}>
          <SectionHeader
            icon={I.zap}
            title="Your queue"
            badge={<Badge tone="danger">2</Badge>}
          />
          <div style={{ padding: '4px 0 0' }}>
            {[
              { t: 'Complete self-assessment', s: 'Annual review · Talha Mansoor will see this', tag: 'Due 21 May', tagTone: 'warning', icon: I.star, hue: 280, action: 'Start' },
              { t: 'Update emergency contact', s: 'HR · last updated 2023', tag: 'No deadline', tagTone: 'neutral', icon: I.user, hue: 22, action: 'Update' },
              { t: 'Acknowledge new policy', s: 'Remote work policy v2 · 4 min read', tag: 'Due 20 May', tagTone: 'warning', icon: I.doc, hue: 175, action: 'Read' },
              { t: 'Set Q2 goals with manager', s: 'Suggested by HR', tag: 'In 7 days', tagTone: 'accent', icon: I.flag, hue: 200, action: 'Plan' },
            ].map((q, i, arr) => (
              <div key={i} style={{
                padding: '12px 22px', borderTop: i > 0 ? '1px solid var(--fn-divider)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: `oklch(0.93 0.06 ${q.hue})`, color: `oklch(0.40 0.14 ${q.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={q.icon} size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{q.t}</span>
                    <Badge tone={q.tagTone} style={{ fontSize: 10.5 }}>{q.tag}</Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', marginTop: 2 }}>{q.s}</div>
                </div>
                <button style={{
                  height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600,
                  background: i === 0 ? 'var(--fn-accent)' : 'var(--fn-bg-panel)',
                  color: i === 0 ? 'var(--fn-accent-fg)' : 'var(--fn-fg)',
                  border: i === 0 ? 'none' : '1px solid var(--fn-border-strong)',
                  borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}>{q.action}</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2 — Leave card + Payroll calendar + Performance snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 18 }}>
        {/* Leave balance */}
        <Card padded={false}>
          <SectionHeader
            icon={I.calc}
            title="Leave balance"
            right={<ToolbarPill icon={I.plus} small>Request</ToolbarPill>}
          />
          <div style={{ padding: '0 22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>12.5</span>
              <span style={{ fontSize: 13, color: 'var(--fn-fg-faint)', fontWeight: 500 }}>of 18 days available</span>
            </div>
            <div style={{ marginTop: 12, height: 10, borderRadius: 99, background: 'var(--fn-bg-inset)', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: '36%', background: 'var(--fn-success)' }} />
              <div style={{ width: '12%', background: 'var(--fn-warning)' }} />
              <div style={{ width: '52%', background: 'var(--fn-bg-inset)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>
              <span><Dot color="var(--fn-success)" /> Used 5.5d</span>
              <span><Dot color="var(--fn-warning)" /> Pending 2d</span>
              <span><Dot color="var(--fn-fg-faint)" /> Available 10.5d</span>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--fn-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
                Upcoming
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 6,
                  background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)',
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>JUN</span>
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, marginTop: 1 }}>10</span>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Casual leave · 2 days</div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>10–11 Jun · awaiting approval</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Payroll & payments */}
        <Card padded={false}>
          <SectionHeader icon={I.send} title="Next payout" />
          <div style={{ padding: '0 22px 20px' }}>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              ₨285k
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              Salary + $2,880 commission · pays 03 Jun
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'Base salary', v: '₨285,000', acc: 'HBL · ****4218' },
                { l: 'Commission', v: '$2,880.00', acc: 'Payoneer · ****8021' },
                { l: 'Tax withheld', v: '−₨42,750', acc: '15% slab · FBR', neg: true },
              ].map(p => (
                <div key={p.l} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-fg)' }}>{p.l}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{p.acc}</div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    color: p.neg ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg)',
                  }}>{p.v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
              <span>Net to receive</span>
              <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-success-soft-fg)' }}>≈ ₨1,044,138</span>
            </div>
          </div>
        </Card>

        {/* Performance snapshot */}
        <Card padded={false}>
          <SectionHeader icon={I.star} title="Performance snapshot" />
          <div style={{ padding: '0 22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                4.6<span style={{ color: 'var(--fn-fg-faint)', fontWeight: 500, fontSize: 18 }}> / 5</span>
              </span>
              <Badge tone="success" trend="up">Strong</Badge>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              Last review: Feb 2026 by Talha Mansoor
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { l: 'Technical depth', v: 4.8, comment: '"Standout pull-requests"' },
                { l: 'Communication', v: 4.5, comment: '"Clear in stand-ups"' },
                { l: 'Ownership', v: 4.6, comment: '"Drives projects end-to-end"' },
                { l: 'Mentorship', v: 4.4, comment: '"Helps probation engineers"' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>{s.l}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', fontWeight: 600 }}>{s.v}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)' }}>
                    <div style={{ height: '100%', width: `${s.v * 20}%`, background: 'var(--fn-accent)', borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3 — Big trend chart + Active projects */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card padded={false}>
          <SectionHeader
            icon={I.chart}
            title="My commission trend"
            right={<ToolbarPill iconRight={I.chev} small>12 months</ToolbarPill>}
          />
          <div style={{ padding: '4px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, paddingTop: 28 }}>
              {months.map(m => (
                <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {m.draft && (
                    <div style={{
                      position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 11, fontWeight: 700, color: 'var(--fn-accent-soft-fg)',
                      fontFamily: 'var(--fn-font-mono)', whiteSpace: 'nowrap',
                    }}>${(m.v / 1000).toFixed(1)}k</div>
                  )}
                  <div style={{
                    width: '100%', maxWidth: 30, height: `${(m.v / maxV) * 100}%`,
                    borderRadius: 6,
                    background: m.draft
                      ? 'var(--fn-accent-soft)'
                      : 'linear-gradient(180deg, var(--fn-accent) 0%, oklch(0.42 0.18 280) 100%)',
                    border: m.draft ? '1.5px dashed var(--fn-accent)' : 'none',
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {months.map(m => (
                <div key={m.m} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>
                  {m.m}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--fn-divider)' }}>
              {[
                { l: 'YTD earnings', v: `$${ytd.toLocaleString()}`, d: '+24% YoY' },
                { l: 'Best month', v: '$2,880', d: 'May 2026 (draft)' },
                { l: 'Lifetime payout', v: '$26,420', d: 'across 32 months' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.l}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader
            icon={I.briefcase}
            title="Active projects"
            badge={<Badge tone="neutral">3</Badge>}
          />
          <div>
            {[
              { p: 'Polaris CRM migration', client: 'Polaris Tech', role: 'Winner · 50%', progress: 70, due: 'Sep 2026', hue: 280, est: 4320 },
              { p: 'Acme Web Refresh', client: 'Acme Inc.', role: 'Communicator · 30%', progress: 40, due: 'Jul 2026', hue: 200, est: 864 },
              { p: 'Vector Studio — brand site', client: 'Vector Studio', role: 'Eligible · 6.7%', progress: 90, due: 'May 2026', hue: 175, est: 192 },
            ].map((p, i) => (
              <div key={p.p} style={{
                padding: '14px 22px', borderTop: i > 0 ? '1px solid var(--fn-divider)' : '1px solid var(--fn-divider)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: `oklch(0.93 0.06 ${p.hue})`, color: `oklch(0.40 0.14 ${p.hue})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d={I.briefcase} size={12} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.p}</div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{p.client} · {p.role}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--fn-success-soft-fg)' }}>
                    ~${p.est}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)' }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: `oklch(0.55 0.16 ${p.hue})`, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)', minWidth: 26, textAlign: 'right' }}>
                    {p.progress}%
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>· due {p.due}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 — Payslips + Documents + Team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card padded={false}>
          <SectionHeader
            icon={I.card}
            title="Recent payslips"
            right={<span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>View all</span>}
          />
          <InsetTable
            padding={14}
            cols={[
              { label: 'Month' },
              { label: 'Pay date', width: 110 },
              { label: 'Net pay', align: 'right' },
              { label: '', width: 36 },
            ]}
          >
            <tbody>
              {[
                { m: 'April 2026', d: '02 May', sal: 285000, com: 1840 },
                { m: 'March 2026', d: '02 Apr', sal: 260000, com: 2240 },
                { m: 'February 2026', d: '02 Mar', sal: 260000, com: 1820 },
                { m: 'January 2026', d: '02 Feb', sal: 260000, com: 1480 },
              ].map((p, i, arr) => {
                const net = p.sal + Math.round(p.com * 278.5);
                return (
                  <InsetRow key={p.m} bordered={i < arr.length - 1}>
                    <InsetCell first>
                      <div style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>{p.m}</div>
                      <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>
                        Salary + commission ${p.com}
                      </div>
                    </InsetCell>
                    <InsetCell>
                      <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{p.d}</span>
                    </InsetCell>
                    <InsetCell align="right">
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        ₨{(net / 1000).toFixed(0)}k
                      </span>
                    </InsetCell>
                    <InsetCell last align="right">
                      <Icon d={I.download} size={14} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                    </InsetCell>
                  </InsetRow>
                );
              })}
            </tbody>
          </InsetTable>
          <div style={{ height: 14 }} />
        </Card>

        <Card padded={false}>
          <SectionHeader
            icon={I.doc}
            title="Documents to sign"
            badge={<Badge tone="warning">2</Badge>}
          />
          <div>
            {[
              { name: 'Remote work policy v2', kind: 'Policy', date: 'Due 20 May', hue: 280, urgent: true },
              { name: 'NDA — Acme Inc.', kind: 'NDA', date: 'Due 25 May', hue: 22, urgent: true },
              { name: 'Annual tax certificate', kind: 'Tax', date: 'Ready · 2025', hue: 175, ready: true },
              { name: 'Employment letter', kind: 'HR Letter', date: 'Ready', hue: 200, ready: true },
            ].map((d, i, arr) => (
              <div key={d.name} style={{
                padding: '11px 22px', borderTop: '1px solid var(--fn-divider)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 32, height: 38, borderRadius: 5, flexShrink: 0,
                  background: `oklch(0.94 0.05 ${d.hue})`, border: `1px solid oklch(0.85 0.07 ${d.hue})`,
                  color: `oklch(0.40 0.13 ${d.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8.5, fontWeight: 700, letterSpacing: '0.02em',
                }}>
                  PDF
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 10.5, color: d.urgent ? 'var(--fn-warning-soft-fg)' : 'var(--fn-fg-faint)', marginTop: 2, fontWeight: d.urgent ? 600 : 400 }}>
                    {d.kind} · {d.date}
                  </div>
                </div>
                <Icon d={d.ready ? I.download : I.arrowR} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader icon={I.users} title="My team" />
          <div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
                Reports to
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.15 280)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                }}>TM</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Talha Mansoor</div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Head of Engineering</div>
                </div>
                <Icon d={I.mail} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
              </div>
            </div>

            <div style={{ padding: '12px 22px 16px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
                My direct reports · 3
              </div>
              {[
                { n: 'Hassan Tariq', r: 'Engineer · Probation', hue: 22 },
                { n: 'Faraz Iqbal', r: 'Engineer', hue: 280 },
                { n: 'Rabia Nasir', r: 'Engineer · Contractor', hue: 175 },
              ].map((r, i) => (
                <div key={r.n} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', borderTop: i > 0 ? '1px dashed var(--fn-divider)' : 'none',
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: `oklch(0.92 0.07 ${r.hue})`, color: `oklch(0.40 0.14 ${r.hue})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600,
                  }}>{r.n.split(' ').map(w => w[0]).join('')}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.n}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{r.r}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 5 — Upcoming + Recognition + Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 18 }}>
        <Card padded={false}>
          <SectionHeader icon={I.cake} title="Coming up at Futurenostics" />
          <div style={{ padding: '4px 22px 18px' }}>
            {[
              { date: 'TODAY', dateSub: 'Thu', t: 'Maira Khan turns 30', s: 'BD Associate · #birthdays', tone: 'warning' },
              { date: '21 MAY', dateSub: 'Wed', t: 'Your annual review', s: 'With Talha Mansoor · 14:00', tone: 'accent', mine: true },
              { date: '26 MAY', dateSub: 'Mon', t: 'Omar\'s 3-year anniversary', s: 'Engineering · auto-thread', tone: 'success' },
              { date: '01 JUN', dateSub: 'Sun', t: 'June commission processing', s: 'Lock for June projects', tone: 'info' },
              { date: '10 JUN', dateSub: 'Tue', t: 'Your leave: 10–11 Jun', s: 'Awaiting Talha\'s approval', tone: 'warning', mine: true },
            ].map((u, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderTop: i > 0 ? '1px dashed var(--fn-divider)' : 'none',
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: u.mine ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
                  border: '1px solid ' + (u.mine ? 'color-mix(in oklch, var(--fn-accent) 25%, transparent)' : 'var(--fn-border)'),
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: u.mine ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1 }}>{u.date}</span>
                  <span style={{ fontSize: 9.5, color: 'var(--fn-fg-faint)', lineHeight: 1, marginTop: 2 }}>{u.dateSub}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{u.t}</span>
                    {u.mine && <Badge tone="accent" dot>You</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', marginTop: 2 }}>{u.s}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader icon={I.star} title="Kudos & shoutouts" />
          <div style={{ padding: '4px 22px 18px' }}>
            {[
              { from: 'Talha Mansoor', text: 'Bilal carried the Polaris migration finish line — saved us 2 weeks.', when: '3 days ago', hue: 280 },
              { from: 'Maira Khan', text: 'Thanks for the client demo support last Thursday!', when: '1 week ago', hue: 175 },
              { from: 'Sana Lateef', text: 'Loved your write-up on the rate model in #engineering.', when: '2 weeks ago', hue: 22 },
            ].map((k, i) => (
              <div key={i} style={{
                padding: '10px 0', borderTop: i > 0 ? '1px dashed var(--fn-divider)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: `oklch(0.92 0.07 ${k.hue})`, color: `oklch(0.40 0.14 ${k.hue})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 600,
                  }}>{k.from.split(' ').map(w => w[0]).join('')}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-fg)' }}>{k.from}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginLeft: 'auto' }}>{k.when}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{k.text}"
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader icon={I.zap} title="Quick actions" />
          <div style={{ padding: '4px 0 14px' }}>
            {[
              { icon: I.calc, t: 'Request time off', s: 'Casual · sick · paid leave', hue: 175 },
              { icon: I.arrowU, t: 'Ask for an increment', s: 'Triggers HR review process', hue: 280 },
              { icon: I.doc, t: 'Request HR letter', s: 'Bank, embassy, etc.', hue: 22 },
              { icon: I.send, t: 'Raise a concern', s: 'Anonymously if needed', hue: 200 },
              { icon: I.briefcase, t: 'Refer a friend', s: 'Open positions · 3', hue: 145 },
            ].map((a, i, arr) => (
              <div key={i} style={{
                padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 12,
                borderTop: '1px solid var(--fn-divider)', cursor: 'pointer',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                  background: `oklch(0.93 0.06 ${a.hue})`, color: `oklch(0.40 0.14 ${a.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={a.icon} size={13} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{a.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{a.s}</div>
                </div>
                <Icon d={I.chevR} size={12} style={{ color: 'var(--fn-fg-faint)' }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

window.EmployeePortal = EmployeePortal;
