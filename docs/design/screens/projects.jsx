// Projects list + New Project form with live commission preview
function ProjectsList({ currency = 'USD' }) {
  const projects = [
    { id: 'PRJ-1042', cat: 'External', name: 'Acme Web Refresh', client: 'Acme Inc.', revenue: 12000, comm: 2880, winner: 'Bilal Rauf', communicator: 'Talha Mansoor', start: '08 May 2026', hold: false, status: 'In billing' },
    { id: 'PRJ-1039', cat: 'Upwork', name: 'Sterling — SaaS dashboard', client: 'Sterling Holdings', revenue: 8400, comm: 2016, winner: 'Sana Lateef', communicator: 'Maira Khan', start: '03 May 2026', hold: false, status: 'In billing' },
    { id: 'PRJ-1037', cat: 'B2B', name: 'Northwind partnership Q2', client: 'Northwind Bank', revenue: 24000, comm: 4800, winner: 'Talha Mansoor', communicator: 'Omar Sheikh', start: '01 May 2026', hold: false, status: 'In billing' },
    { id: 'PRJ-1035', cat: 'Upwork', name: 'GreenLeaf — eCommerce', client: 'GreenLeaf Co.', revenue: 6200, comm: 0, winner: 'Maira Khan', communicator: 'Bilal Rauf', start: '28 Apr 2026', hold: true, status: 'Payment hold' },
    { id: 'PRJ-1034', cat: 'External', name: 'Polaris CRM migration', client: 'Polaris Tech', revenue: 18000, comm: 4320, winner: 'Bilal Rauf', communicator: 'Sana Lateef', start: '24 Apr 2026', hold: false, status: 'In billing' },
    { id: 'PRJ-1031', cat: 'Upwork · Johnny', name: 'Pixel Co. — mobile app', client: 'Pixel Co.', revenue: 5800, comm: 1740, winner: 'Sana Lateef', communicator: 'Maira Khan', start: '21 Apr 2026', hold: false, status: 'In billing' },
    { id: 'PRJ-1028', cat: 'B2B', name: 'Helix Labs · platform retainer', client: 'Helix Labs', revenue: 9000, comm: 1800, winner: 'Talha Mansoor', communicator: 'Faraz Iqbal', start: '15 Apr 2026', hold: false, status: 'Complete' },
    { id: 'PRJ-1024', cat: 'External', name: 'Vector Studio — brand site', client: 'Vector Studio', revenue: 4500, comm: 1080, winner: 'Maira Khan', communicator: 'Bilal Rauf', start: '08 Apr 2026', hold: false, status: 'Complete' },
  ];

  const catTone = { External: 'accent', Upwork: 'warning', B2B: 'info', 'Upwork · Johnny': 'warning' };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="External, Upwork, and B2B projects across all departments. Commission rules apply on approve."
        actions={<>
          <Button variant="secondary" icon={I.download}>Export</Button>
          <Button icon={I.plus}>New project</Button>
        </>}
      />

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { c: 'External', n: 11, rev: 96400, comm: 23136, color: 'var(--fn-accent)', desc: 'Direct client engagements' },
          { c: 'Upwork', n: 8, rev: 41200, comm: 10080, color: 'var(--fn-warning)', desc: 'Across 4 profiles · Johnny/Michele/Daniel/Rebecca' },
          { c: 'B2B', n: 4, rev: 58000, comm: 9830, color: 'var(--fn-info)', desc: 'Partnership & retainer accounts' },
        ].map(s => (
          <Card key={s.c} padded={false}>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 99 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg)' }}>{s.c}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fn-fg-faint)' }}>{s.n} active</span>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>Revenue (MTD)</div>
                  <div style={{ fontFamily: 'var(--fn-font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', lineHeight: 1 }}>
                    {currency === 'USD' ? `$${(s.rev / 1000).toFixed(1)}k` : `₨${((s.rev * 278.5) / 100000).toFixed(1)}L`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>Commission</div>
                  <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 14, fontVariantNumeric: 'tabular-nums', color: s.color, fontWeight: 600, marginTop: 4 }}>
                    {currency === 'USD' ? fmtUSD(s.comm) : fmtPKR(s.comm * 278.5)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fn-fg-muted)' }}>{s.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['All categories', 'External', 'Upwork', 'B2B'].map((t, i) => (
          <span key={t} style={{
            padding: '6px 12px', fontSize: 12.5, fontWeight: 500, borderRadius: 7, cursor: 'pointer',
            background: i === 0 ? 'var(--fn-fg)' : 'var(--fn-bg-panel)',
            color: i === 0 ? 'var(--fn-fg-invert)' : 'var(--fn-fg-muted)',
            border: '1px solid ' + (i === 0 ? 'var(--fn-fg)' : 'var(--fn-border)'),
          }}>{t}</span>
        ))}
        <div style={{ flex: 1 }} />
        <Input icon={I.search} placeholder="Find project…" style={{ width: 260, height: 32 }} />
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Project' },
            { label: 'Category', width: 130 },
            { label: 'Winner / Communicator', width: 200 },
            { label: 'Revenue', align: 'right', width: 130 },
            { label: 'Commission', align: 'right', width: 140 },
            { label: 'Status', width: 130 },
          ]}
        >
          <tbody>
            {projects.map((p, i) => (
              <InsetRow key={p.id} bordered={i < projects.length - 1}>
                <InsetCell first>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>{p.id} · {p.client}</div>
                </InsetCell>
                <InsetCell>
                  <Badge tone={catTone[p.cat]} dot>{p.cat}</Badge>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={p.winner} size={22} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{p.winner}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Avatar name={p.communicator} size={22} />
                    <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>{p.communicator}</span>
                  </div>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {currency === 'USD' ? fmtUSD(p.revenue) : fmtPKR(p.revenue * 278.5)}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: p.hold ? 'var(--fn-fg-faint)' : 'var(--fn-fg)' }}>
                    {p.hold ? '— (held)' : (currency === 'USD' ? fmtUSD(p.comm) : fmtPKR(p.comm * 278.5))}
                  </span>
                </InsetCell>
                <InsetCell last>
                  <Badge tone={p.hold ? 'warning' : p.status === 'Complete' ? 'success' : 'info'} dot>
                    {p.status}
                  </Badge>
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>
    </>
  );
}

// New Project form with side-panel live commission preview
function ProjectForm({ currency = 'USD' }) {
  const revenue = 12000;
  // Mock commission calc — External · Engineering: 24% pool split
  const pool = revenue * 0.24;
  const winnerShare = pool * 0.5;
  const commShare = pool * 0.3;
  const eligShare = pool * 0.2;

  return (
    <>
      <PageHeader
        title="New project · External"
        subtitle="Step 2 of 2 · Project details. Commission preview updates live based on Commission Rules v3.2."
        kicker="Projects → New"
        actions={<>
          <Button variant="ghost">Cancel</Button>
          <Button variant="secondary">Save as draft</Button>
          <Button iconRight={I.arrowR}>Create & assign</Button>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Form */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 14px', background: 'var(--fn-accent-soft)', borderRadius: 6 }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={I.briefcase} size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-accent-soft-fg)' }}>External · Direct client</div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', opacity: 0.85 }}>Engineering scope · Commission pool = 24% of revenue</div>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}>Change category</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormGroup label="Project name" hint="Internal label — shown on payslips and reports.">
              <Input defaultValue="Acme Web Refresh" />
            </FormGroup>

            <FormGroup label="Client">
              <Input defaultValue="Acme Inc." icon={I.building} />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormGroup label="Revenue (USD)" hint="Quoted contract value.">
                <Input defaultValue="12,000.00" suffix="USD" />
              </FormGroup>
              <FormGroup label="Start date">
                <Input defaultValue="08 May 2026" />
              </FormGroup>
            </div>

            <FormGroup label="Department scope">
              <Input defaultValue="Engineering" suffix="▾" />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormGroup label="Winner" hint="Person credited with closing the deal.">
                <PersonPicker name="Bilal Rauf" sub="Sr. Engineer · Engineering" />
              </FormGroup>
              <FormGroup label="Communicator" hint="Day-to-day client point of contact.">
                <PersonPicker name="Talha Mansoor" sub="BD Manager · BD" />
              </FormGroup>
            </div>

            <FormGroup label="Eligible team (will share residual)" hint="3 people · 20% of pool will be split equally.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 7, minHeight: 42 }}>
                {['Omar Sheikh', 'Faraz Iqbal', 'Rabia Nasir'].map(n => (
                  <span key={n} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 4px 3px 4px', background: 'var(--fn-bg-panel)',
                    border: '1px solid var(--fn-border)', borderRadius: 99, fontSize: 12,
                  }}>
                    <Avatar name={n} size={20} />
                    {n}
                    <Icon d={I.x} size={11} style={{ color: 'var(--fn-fg-faint)', marginLeft: 2, marginRight: 3 }} />
                  </span>
                ))}
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', fontSize: 12, color: 'var(--fn-fg-faint)', cursor: 'pointer' }}>
                  + Add person
                </span>
              </div>
            </FormGroup>

            <FormGroup label="Notes">
              <textarea rows={3} placeholder="Anything HR or finance should know…" style={{
                width: '100%', resize: 'vertical', padding: 10, fontSize: 13, fontFamily: 'inherit',
                color: 'var(--fn-fg)', background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 7, outline: 'none',
              }} />
            </FormGroup>
          </div>
        </Card>

        {/* Live commission preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card padded={false} style={{ position: 'sticky', top: 12 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, background: 'var(--fn-accent)', borderRadius: 99 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live commission preview</span>
              </div>
              <Badge tone="neutral" dot>Rule v3.2 · active</Badge>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>Revenue</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {currency === 'USD' ? fmtUSD(revenue) : fmtPKR(revenue * 278.5)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>×&nbsp;Pool rate <span style={{ color: 'var(--fn-fg-faint)' }}>(External · Eng)</span></span>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 13 }}>24%</span>
              </div>
              <div style={{ height: 1, background: 'var(--fn-divider)', margin: '8px 0' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Commission pool</span>
                <span style={{ fontFamily: 'var(--fn-font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-accent-soft-fg)' }}>
                  {currency === 'USD' ? fmtUSD(pool) : fmtPKR(pool * 278.5)}
                </span>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 10 }}>Pool split</div>
                <div style={{ height: 10, borderRadius: 99, display: 'flex', overflow: 'hidden', background: 'var(--fn-bg-inset)' }}>
                  <div style={{ width: '50%', background: 'var(--fn-accent)' }} />
                  <div style={{ width: '30%', background: 'oklch(0.62 0.11 200)' }} />
                  <div style={{ width: '20%', background: 'oklch(0.62 0.11 145)' }} />
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { who: 'Bilal Rauf', tag: 'Winner · 50%', amt: winnerShare, color: 'var(--fn-accent)' },
                    { who: 'Talha Mansoor', tag: 'Communicator · 30%', amt: commShare, color: 'oklch(0.62 0.11 200)' },
                    { who: '3 eligible team', tag: 'Residual · 20% (split equally)', amt: eligShare, color: 'oklch(0.62 0.11 145)' },
                  ].map(s => (
                    <div key={s.who} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color, marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.who}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{s.tag}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {currency === 'USD' ? fmtUSD(s.amt) : fmtPKR(s.amt * 278.5)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--fn-divider)', fontSize: 11.5, color: 'var(--fn-fg-muted)', background: 'var(--fn-bg-subtle)', borderRadius: '0 0 6px 6px' }}>
              Preview only — final amounts are computed at month-end using rules <em>active on the processing date</em>.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function FormGroup({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: 'var(--fn-fg)' }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function PersonPicker({ name, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 6px 8px',
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 7, height: 42,
    }}>
      <Avatar name={name} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fn-fg)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{sub}</div>
      </div>
      <Icon d={I.chev} size={14} style={{ color: 'var(--fn-fg-faint)' }} />
    </div>
  );
}

Object.assign(window, { ProjectsList, ProjectForm });
