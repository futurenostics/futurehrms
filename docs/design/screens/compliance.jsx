// Brief 29 — Payroll Compliance dashboard

function ComplianceDashboard({ state = 'mixed' }) {
  const allGreen = state === 'green';
  const preAudit = state === 'audit';

  const statuses = [
    { l: 'Tax filing', tone: allGreen ? 'success' : 'success', icon: I.scale, hue: 280,
      detail: 'Slabs configured · Last run computed correctly', deadline: 'Annual return due in 45 days' },
    { l: 'EOBI', tone: 'success', icon: I.shield, hue: 175,
      detail: 'Registered · 84 contributions filed for April', deadline: 'Next due 15 May' },
    { l: 'Provident Fund', tone: 'success', icon: I.card, hue: 145,
      detail: 'Recognized · 84 enrolled · Balance reconciled', deadline: null },
    { l: 'Gratuity reserve', tone: 'info', icon: I.flag, hue: 245,
      detail: 'PKR 4,890,000 accrued liability', deadline: 'Across 12 eligible employees', informational: true },
    { l: 'Bank compliance', tone: allGreen ? 'success' : 'warning', icon: I.card, hue: 22,
      detail: allGreen ? '84/84 employees verified' : '82/84 verified · 2 pending', deadline: null },
    { l: 'Document compliance', tone: allGreen ? 'success' : 'danger', icon: I.doc, hue: 200,
      detail: allGreen ? '84 CNICs current' : '78 CNICs verified · 6 expiring · 2 missing', deadline: 'Action needed before payroll' },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em' }}>
            Payroll compliance
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            Statutory compliance status across all payroll obligations. Review monthly to stay audit-ready.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill iconRight={I.chev}>This month</ToolbarPill>
          <Button variant="secondary" icon={I.download}>Audit pack</Button>
        </div>
      </div>

      {/* Status cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
        {statuses.map(s => <StatusCard key={s.l} {...s} />)}
      </div>

      {/* Upcoming deadlines + open issues */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card padded={false}>
          <SectionHeader icon={I.clock} title="Upcoming compliance deadlines" padding="18px 22px 14px"
            badge={<Badge tone="warning">3 within 30d</Badge>} />
          <div style={{ padding: '0 22px 18px' }}>
            {[
              { l: 'EOBI April return filing', d: '15 May 2026', sub: 'in 0 days', tone: 'danger', action: 'Mark filed' },
              { l: 'Monthly PKR payroll · May disbursement', d: '02 Jun 2026', sub: 'in 18 days', tone: 'info' },
              { l: 'Provident Fund quarterly statement', d: '15 Jun 2026', sub: 'in 31 days', tone: 'info' },
              { l: 'Annual tax certificates · FY 2025-26', d: '15 Jul 2026', sub: 'in 61 days', tone: 'neutral' },
              { l: 'Income tax annual return (employer)', d: '30 Sep 2026', sub: 'in 138 days', tone: 'neutral' },
            ].map((d, i, arr) => (
              <div key={i} style={{
                padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                  background: d.tone === 'danger' ? 'var(--fn-danger-soft)' : d.tone === 'info' ? 'var(--fn-info-soft)' : 'var(--fn-icon-tile)',
                  color: d.tone === 'danger' ? 'var(--fn-danger-soft-fg)' : d.tone === 'info' ? 'var(--fn-info-soft-fg)' : 'var(--fn-icon-tile-fg)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={I.clock} size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{d.l}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', marginTop: 1 }}>
                    {d.d}
                  </div>
                </div>
                <Badge tone={d.tone} dot>{d.sub}</Badge>
                {d.action && <Button size="sm" variant="secondary" style={{ height: 26 }}>{d.action}</Button>}
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader icon="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            title="Open issues" badge={<Badge tone="danger">{allGreen ? 0 : 3}</Badge>}
            padding="18px 22px 14px" />
          {allGreen ? (
            <div style={{ padding: '24px 22px 28px' }}>
              <EmptyState
                icon={I.check}
                title="All clear"
                body="No outstanding compliance issues. Run monthly reviews to keep it this way."
              />
            </div>
          ) : (
            <div style={{ padding: '0 22px 18px' }}>
              {[
                { l: '5 employees missing CNIC documents', sub: 'Payroll cannot be fully disbursed', tone: 'danger' },
                { l: '1 tax slab gap detected', sub: 'Slab 4 to Slab 5 has no overlap rule', tone: 'warning' },
                { l: 'EOBI registration number missing', sub: 'Contributions computed but cannot be filed', tone: 'warning' },
              ].map((iss, i, arr) => (
                <div key={i} style={{
                  padding: '11px 0', display: 'flex', alignItems: 'flex-start', gap: 10,
                  borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: iss.tone === 'danger' ? 'var(--fn-danger-soft)' : 'var(--fn-warning-soft)',
                    color: iss.tone === 'danger' ? 'var(--fn-danger-soft-fg)' : 'var(--fn-warning-soft-fg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={11} stroke={2.5} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{iss.l}</div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)', marginTop: 2 }}>{iss.sub}</div>
                  </div>
                  <Button size="sm" iconRight={I.arrowR} style={{ height: 26 }}>Resolve</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Annual calendar */}
      <Card padded={false} style={{ marginBottom: 18 }}>
        <SectionHeader icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
          title="Annual compliance calendar · FY 2025-26"
          padding="18px 22px 14px"
          right={<ToolbarPill iconRight={I.chev} small>Group: deadline</ToolbarPill>}
        />
        <div style={{ padding: '0 22px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
            {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => {
              const isCurrent = i === 10;
              const isPast = i < 10;
              const events = {
                Jul: [{ c: 'oklch(0.55 0.16 145)', l: 'Tax certs' }],
                Aug: [],
                Sep: [{ c: 'oklch(0.55 0.16 22)', l: 'Annual return' }],
                Oct: [],
                Nov: [],
                Dec: [],
                Jan: [{ c: 'oklch(0.55 0.16 175)', l: 'EOBI Q2' }],
                Feb: [],
                Mar: [],
                Apr: [{ c: 'oklch(0.55 0.16 175)', l: 'EOBI Q3' }],
                May: [{ c: 'oklch(0.55 0.16 22)', l: 'EOBI Apr' }],
                Jun: [{ c: 'oklch(0.55 0.16 245)', l: 'PF stmt' }],
              }[m] || [];
              return (
                <div key={m} style={{
                  padding: '12px 8px', borderRadius: 6,
                  background: isCurrent ? 'var(--fn-accent-soft)' : isPast ? 'var(--fn-bg-subtle)' : 'var(--fn-bg-panel)',
                  border: '1px solid ' + (isCurrent ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border)'),
                  minHeight: 70, display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: isCurrent ? 'var(--fn-accent-soft-fg)' : isPast ? 'var(--fn-fg-faint)' : 'var(--fn-fg-muted)',
                  }}>
                    {m}
                  </div>
                  <div style={{ flex: 1, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {events.map((e, j) => (
                      <div key={j} style={{
                        padding: '2px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                        background: `${e.c}22`, color: e.c,
                      }}>{e.l}</div>
                    ))}
                  </div>
                  {isCurrent && <div style={{ marginTop: 4, fontSize: 9, color: 'var(--fn-accent-soft-fg)', fontWeight: 700 }}>NOW</div>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 14, fontSize: 11, color: 'var(--fn-fg-muted)' }}>
            {[
              { c: 'oklch(0.55 0.16 175)', l: 'EOBI filings' },
              { c: 'oklch(0.55 0.16 145)', l: 'Tax certificates' },
              { c: 'oklch(0.55 0.16 22)', l: 'Annual returns' },
              { c: 'oklch(0.55 0.16 245)', l: 'PF statements' },
            ].map(l => (
              <span key={l.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: l.c }} />
                {l.l}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Activities + Exports */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card padded={false}>
          <SectionHeader icon={I.clock} title="Recent compliance activities" padding="18px 22px 14px" />
          <div style={{ padding: '0 22px 18px' }}>
            {[
              { a: 'Asma Ali', t: 'filed EOBI return for April', when: '2 weeks ago', tone: 'success' },
              { a: 'System', t: 'flagged 6 CNICs expiring within 90 days', when: '1 week ago', tone: 'warning' },
              { a: 'Asma Ali', t: 'updated tax slabs to FY 2025-26', when: '1 week ago', tone: 'accent' },
              { a: 'Finance Manager', t: 'reconciled PF balance with bank', when: '5 days ago', tone: 'success' },
              { a: 'Asma Ali', t: 'generated 78 of 84 tax certificates', when: '3 days ago', tone: 'accent' },
            ].map((e, i, arr) => (
              <div key={i} style={{
                padding: '8px 0', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: e.tone === 'success' ? 'var(--fn-success)' : e.tone === 'warning' ? 'var(--fn-warning)' : 'var(--fn-accent)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--fn-fg)', flex: 1 }}>
                  <strong style={{ fontWeight: 600 }}>{e.a}</strong> <span style={{ color: 'var(--fn-fg-muted)' }}>{e.t}</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{e.when}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <SectionHeader icon={I.download} title="Audit-ready exports" padding="18px 22px 14px" />
          <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Monthly statutory compliance pack', sub: 'Payroll register · EOBI return · tax summary · bank file', icon: I.card, hue: 175 },
              { l: 'Annual compliance pack · FY 2025-26', sub: 'Full year · for external audit', icon: I.shield, hue: 280 },
              { l: 'FBR audit response pack', sub: 'Targeted reports for FBR queries', icon: I.scale, hue: 22, featured: preAudit },
              { l: 'EOBI annual contribution summary', sub: 'For EOBI registration renewal', icon: I.users, hue: 145 },
            ].map((e, i) => (
              <button key={i} style={{
                padding: '12px 14px', borderRadius: 8,
                background: e.featured ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
                border: '1px solid ' + (e.featured ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border)'),
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                  background: `oklch(0.92 0.07 ${e.hue})`, color: `oklch(0.38 0.16 ${e.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={e.icon} size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{e.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{e.sub}</div>
                </div>
                <Icon d={I.download} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function StatusCard({ l, tone, icon, hue, detail, deadline, informational }) {
  const toneColors = {
    success: { bg: 'var(--fn-success-soft)', fg: 'var(--fn-success-soft-fg)', border: 'var(--fn-success)', dot: 'var(--fn-success)', label: 'Compliant' },
    warning: { bg: 'var(--fn-warning-soft)', fg: 'var(--fn-warning-soft-fg)', border: 'var(--fn-warning)', dot: 'var(--fn-warning)', label: 'Attention' },
    danger: { bg: 'var(--fn-danger-soft)', fg: 'var(--fn-danger-soft-fg)', border: 'var(--fn-danger)', dot: 'var(--fn-danger)', label: 'Action needed' },
    info: { bg: 'var(--fn-icon-tile)', fg: 'var(--fn-fg)', border: 'var(--fn-border)', dot: 'var(--fn-fg-muted)', label: 'Info' },
  }[tone];
  return (
    <Card padded={false} style={{ borderColor: tone === 'danger' || tone === 'warning' ? `color-mix(in oklch, ${toneColors.border} 30%, transparent)` : undefined, cursor: 'pointer' }}>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: `oklch(0.92 0.07 ${hue})`, color: `oklch(0.38 0.16 ${hue})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={icon} size={16} />
          </span>
          {informational ? <Badge tone="info">Info</Badge> : <Badge tone={tone} dot>{toneColors.label}</Badge>}
        </div>
        <div style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.01em' }}>{l}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>{detail}</div>
        {deadline && (
          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--fn-border)',
            fontSize: 11, color: 'var(--fn-fg-faint)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Icon d={I.clock} size={11} />
            {deadline}
          </div>
        )}
      </div>
    </Card>
  );
}

Object.assign(window, { ComplianceDashboard });
