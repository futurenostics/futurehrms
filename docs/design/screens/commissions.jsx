// Monthly Processing — 3-tab engine + approve/disburse confirmation
function MonthlyProcessing({ currency = 'USD' }) {
  const rows = [
    { who: 'Bilal Rauf', role: 'Winner', proj: 'Acme Web Refresh', cat: 'External', rev: 12000, base: 1440, leave: 0, hold: 0, final: 1440, days: '20/20' },
    { who: 'Talha Mansoor', role: 'Communicator', proj: 'Acme Web Refresh', cat: 'External', rev: 12000, base: 864, leave: 0, hold: 0, final: 864, days: '20/20' },
    { who: 'Omar Sheikh', role: 'Eligible', proj: 'Acme Web Refresh', cat: 'External', rev: 12000, base: 192, leave: -19.2, hold: 0, final: 172.8, days: '18/20', proRated: true },
    { who: 'Faraz Iqbal', role: 'Eligible', proj: 'Acme Web Refresh', cat: 'External', rev: 12000, base: 192, leave: 0, hold: 0, final: 192, days: '20/20' },
    { who: 'Rabia Nasir', role: 'Eligible', proj: 'Acme Web Refresh', cat: 'External', rev: 12000, base: 192, leave: 0, hold: 0, final: 192, days: '20/20' },
    { who: 'Bilal Rauf', role: 'Winner', proj: 'Polaris CRM migration', cat: 'External', rev: 18000, base: 2160, leave: 0, hold: 0, final: 2160, days: '20/20' },
    { who: 'Sana Lateef', role: 'Communicator', proj: 'Polaris CRM migration', cat: 'External', rev: 18000, base: 1296, leave: 0, hold: 0, final: 1296, days: '20/20' },
    { who: 'Maira Khan', role: 'Winner', proj: 'Vector Studio — brand site', cat: 'External', rev: 4500, base: 540, leave: 0, hold: 0, final: 540, days: '20/20' },
  ];

  const total = rows.reduce((s, r) => s + r.final, 0);

  return (
    <>
      <PageHeader
        title="May 2026 commission run"
        subtitle="Processing window: 01–31 May 2026 · Auto-loaded from active projects and Rules v3.2."
        kicker="Commissions → Monthly Processing"
        actions={<>
          <Button variant="secondary" icon={I.download}>Draft Payoneer CSV</Button>
          <Button variant="secondary" icon={I.eye}>Preview disbursement</Button>
          <Button icon={I.check}>Submit for approval</Button>
        </>}
      />

      {/* Status bar */}
      <div style={{
        marginBottom: 18, padding: '12px 16px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 6,
        display: 'flex', alignItems: 'center', gap: 18, fontSize: 13,
      }}>
        <Badge tone="warning" dot>Draft</Badge>
        <div style={{ height: 18, borderLeft: '1px solid var(--fn-divider)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fn-fg-muted)' }}>
          <Icon d={I.clock} size={14} /> Last recalculated <strong style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>4 minutes ago</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fn-fg-muted)' }}>
          <Icon d={I.scale} size={14} /> Rules pinned to <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>v3.2 · 01 May 2026</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fn-fg-muted)' }}>
          <Icon d={I.globe} size={14} /> FX <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>1 USD = ₨278.50</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 500 }}>Recalculate</span>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI label="Total to disburse" value={currency === 'USD' ? fmtUSD(48214.5) : fmtPKR(48214.5 * 278.5)} sub="across 18 recipients" font="display" />
        <KPI label="Projects in run" value="23" delta="2 on hold" deltaTone="warning" sub="11 External · 8 Upwork · 4 B2B" />
        <KPI label="Leave-prorated" value="3" sub="Omar S. (90%), Hira A. (75%), Sana L. (95%)" />
        <KPI label="Carry-forward" value="1" sub="Pixel Co. — half-month deferred" />
      </div>

      <Tabs
        active="External"
        items={[
          { label: 'External', count: 11 },
          { label: 'Upwork', count: 8 },
          { label: 'B2B', count: 4 },
          { label: 'Consolidated draft', count: 23 },
        ]}
        style={{ marginBottom: 0 }}
      />

      <Card padded={false} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--fn-fg-muted)' }}>
            Group by
            <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>Project ▾</span>
          </div>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <Input icon={I.search} placeholder="Filter rows…" style={{ height: 30 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" variant="ghost" icon={I.hold}>Hold project</Button>
            <Button size="sm" variant="ghost" icon={I.edit}>Override</Button>
          </div>
        </div>

        <InsetTable
          padding={14}
          cols={[
            { label: 'Person / Role' },
            { label: 'Project' },
            { label: 'Revenue', align: 'right', width: 110 },
            { label: 'Base', align: 'right', width: 100 },
            { label: 'Days', align: 'right', width: 80 },
            { label: 'Leave adj.', align: 'right', width: 100 },
            { label: 'Hold/CF', align: 'right', width: 90 },
            { label: 'Final', align: 'right', width: 120 },
          ]}
        >
          <tbody>
            {rows.map((r, i) => {
              const sameProjAsPrev = i > 0 && rows[i - 1].proj === r.proj;
              const isLastInGroup = i === rows.length - 1 || rows[i + 1]?.proj !== r.proj;
              return (
                <InsetRow key={i} bordered={i < rows.length - 1}>
                  <InsetCell first>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.who} size={26} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.who}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{r.role}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <span style={{ color: sameProjAsPrev ? 'var(--fn-fg-faint)' : 'var(--fn-fg-muted)' }}>
                      {sameProjAsPrev ? <span style={{ opacity: 0.5 }}>↳</span> : r.proj}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: sameProjAsPrev ? 'var(--fn-fg-faint)' : 'var(--fn-fg-muted)' }}>
                      {sameProjAsPrev ? '' : (currency === 'USD' ? fmtUSD(r.rev) : fmtPKR(r.rev * 278.5))}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      {currency === 'USD' ? fmtUSD(r.base) : fmtPKR(r.base * 278.5)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: r.proRated ? 'var(--fn-warning-soft-fg)' : 'var(--fn-fg-muted)' }}>
                      {r.days}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: r.leave < 0 ? 'var(--fn-warning-soft-fg)' : 'var(--fn-fg-faint)' }}>
                      {r.leave === 0 ? '—' : (currency === 'USD' ? fmtUSD(r.leave) : fmtPKR(r.leave * 278.5))}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>
                  </InsetCell>
                  <InsetCell align="right" last>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13 }}>
                      {currency === 'USD' ? fmtUSD(r.final) : fmtPKR(r.final * 278.5)}
                    </span>
                  </InsetCell>
                </InsetRow>
              );
            })}
            {/* Held project row */}
            <InsetRow bordered={true} highlight="var(--fn-warning-soft)">
              <InsetCell first>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name="Maira Khan" size={26} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Maira Khan</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Winner</div>
                  </div>
                </div>
              </InsetCell>
              <InsetCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fn-warning-soft-fg)' }}>
                  <Icon d={I.hold} size={12} />
                  <span style={{ fontWeight: 600 }}>GreenLeaf — eCommerce</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fn-warning-soft-fg)', opacity: 0.85, marginTop: 2 }}>Reason: client late on invoice 2 weeks</div>
              </InsetCell>
              <InsetCell align="right">
                <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-warning-soft-fg)' }}>
                  {currency === 'USD' ? fmtUSD(6200) : fmtPKR(6200 * 278.5)}
                </span>
              </InsetCell>
              <InsetCell align="right" colSpan={4}>
                <span style={{ color: 'var(--fn-warning-soft-fg)', fontStyle: 'italic', fontSize: 11.5 }}>
                  Held — will carry forward to June run
                </span>
              </InsetCell>
              <InsetCell align="right" last>
                <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-warning-soft-fg)' }}>— held —</span>
              </InsetCell>
            </InsetRow>
            {/* Subtotal row */}
            <InsetRow bordered={false} highlight="var(--fn-bg-subtle)">
              <InsetCell first colSpan={7} style={{ paddingTop: 16, paddingBottom: 16, borderTop: '2px solid var(--fn-border-strong)' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>External tab subtotal · 8 lines</span>
              </InsetCell>
              <InsetCell align="right" last style={{ paddingTop: 16, paddingBottom: 16, borderTop: '2px solid var(--fn-border-strong)' }}>
                <span style={{ fontFamily: 'var(--fn-font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)' }}>
                  {currency === 'USD' ? fmtUSD(total) : fmtPKR(total * 278.5)}
                </span>
              </InsetCell>
            </InsetRow>
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>
    </>
  );
}

// Approval & Disbursement confirmation overlay
function ApproveDisburse({ currency = 'USD' }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, background: 'transparent',
    }}>
      {/* Backdrop showing data behind */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(40,30,20,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', inset: 0, padding: 24, opacity: 0.4, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>May 2026 commission run · Consolidated draft</div>
        <div style={{ marginTop: 12, height: 200, background: 'var(--fn-bg-panel)', borderRadius: 6 }} />
      </div>

      {/* Modal */}
      <Card style={{
        position: 'relative', width: 540, padding: 0, boxShadow: 'var(--fn-shadow-lg)',
      }} padded={false}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={I.lock} size={15} />
            </div>
            <Badge tone="warning" dot>Irreversible</Badge>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Approve & lock May 2026 run?</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>
            Approving will <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>permanently lock</strong> all 23 project entries. After this, corrections require a new compensating run. Disbursement emails and Payoneer export will be queued.
          </p>
        </div>

        <div style={{ padding: 20, background: 'var(--fn-bg-subtle)', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12.5 }}>
            <div>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>Total disbursement</div>
              <div style={{ marginTop: 4, fontFamily: 'var(--fn-font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>
                {currency === 'USD' ? fmtUSD(48214.5) : fmtPKR(48214.5 * 278.5)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>Recipients</div>
              <div style={{ marginTop: 4, fontFamily: 'var(--fn-font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>18 people</div>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--fn-border-strong)', fontSize: 12, color: 'var(--fn-fg-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span><Dot color="var(--fn-success)" /> Payslip PDFs generated for 18 employees</span>
              <span>queued</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span><Dot color="var(--fn-success)" /> Disbursement emails (React Email templates)</span>
              <span>queued</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span><Dot color="var(--fn-warning)" /> 1 held project (GreenLeaf — eCommerce) → carry-forward</span>
              <span>logged</span>
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>
            Type <span style={{ fontFamily: 'var(--fn-font-mono)', background: 'var(--fn-bg-inset)', padding: '1px 6px', borderRadius: 4, fontSize: 11.5 }}>APPROVE MAY 2026</span> to confirm
          </label>
          <div style={{ marginTop: 6 }}>
            <Input defaultValue="APPROVE MAY 20" suffix={<span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--fn-accent)', verticalAlign: 'middle', animation: 'blink 1s infinite' }} />} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Button variant="ghost" full>Cancel</Button>
            <Button full icon={I.lock}>Approve & lock</Button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fn-fg-faint)', textAlign: 'center' }}>
            This action is logged in the audit log as <span style={{ fontFamily: 'var(--fn-font-mono)' }}>commission.run.approved</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Commission Rules — versioned table
function CommissionRules() {
  const rules = [
    { dept: 'Engineering', cat: 'External', pool: '24%', split: 'W 50 · C 30 · E 20', ver: 'v3.2', from: '01 May 2026', active: true },
    { dept: 'Engineering', cat: 'Upwork', pool: '30%', split: 'W 60 · C 25 · E 15', ver: 'v3.2', from: '01 May 2026', active: true },
    { dept: 'Engineering', cat: 'B2B', pool: '20%', split: 'W 70 · C 30', ver: 'v3.1', from: '01 Mar 2026', active: true },
    { dept: 'Business Dev', cat: 'External', pool: '28%', split: 'BD Mgr 8% · Lead 12% · Assoc. 8%', ver: 'v3.2', from: '01 May 2026', active: true, fixed: true },
    { dept: 'Business Dev', cat: 'Upwork', pool: '32%', split: 'BD Mgr 10% · Lead 12% · Assoc. 10%', ver: 'v3.2', from: '01 May 2026', active: true, fixed: true },
    { dept: 'Business Dev', cat: 'B2B', pool: '—', split: 'Awaiting decision · escalated to leadership', ver: '—', from: '—', active: false, pending: true },
    { dept: 'Operations', cat: 'External', pool: '12%', split: 'Ops Lead 60 · Coord 40', ver: 'v2.4', from: '01 Jan 2026', active: true },
    { dept: 'Operations', cat: 'Upwork', pool: '15%', split: 'Ops Lead 70 · Coord 30', ver: 'v2.4', from: '01 Jan 2026', active: true },
  ];

  return (
    <>
      <PageHeader
        title="Commission rules"
        subtitle="Versioned per department × category. Editing creates a new version — historical runs always use the rule active on their processing date."
        actions={<>
          <Button variant="secondary" icon={I.download}>Export rule set</Button>
          <Button variant="secondary" icon={I.clock}>Version history</Button>
          <Button icon={I.plus}>New rule</Button>
        </>}
      />

      {/* Top callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--fn-success)' }} />
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>Active rules</span>
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--fn-font-display)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em' }}>11</div>
          <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>across 4 departments · 3 categories</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--fn-warning)' }} />
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>Pending decision</span>
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--fn-font-display)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em' }}>1</div>
          <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>BD · B2B structure not yet defined</div>
        </Card>
        <Card style={{ padding: 16, background: 'var(--fn-accent-soft)', border: '1px solid var(--fn-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={I.zap} size={14} style={{ color: 'var(--fn-accent-soft-fg)' }} />
            <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 500 }}>Effective next run</span>
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--fn-font-display)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fn-accent-soft-fg)' }}>v3.2</div>
          <div style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', marginTop: 2 }}>5 rules changed · published 28 Apr 2026</div>
        </Card>
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Department' },
            { label: 'Category', width: 130 },
            { label: 'Pool', width: 90 },
            { label: 'Split' },
            { label: 'Version', width: 100 },
            { label: 'Effective from', width: 130 },
            { label: 'Status', align: 'right', width: 120 },
          ]}
        >
          <tbody>
            {rules.map((r, i) => (
              <InsetRow key={i} bordered={i < rules.length - 1} highlight={r.pending ? 'var(--fn-warning-soft)' : undefined}>
                <InsetCell first>
                  <span style={{ fontWeight: 600 }}>{r.dept}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={r.cat === 'External' ? 'accent' : r.cat === 'Upwork' ? 'warning' : 'info'} dot>{r.cat}</Badge>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: r.pending ? 'var(--fn-warning-soft-fg)' : 'var(--fn-fg)' }}>
                    {r.pool}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)', fontSize: 12.5 }}>
                    {r.fixed && <Badge tone="outline" style={{ marginRight: 6 }}>fixed amounts</Badge>}
                    {r.split}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-muted)' }}>{r.ver}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)', fontSize: 12 }}>{r.from}</span>
                </InsetCell>
                <InsetCell align="right" last>
                  {r.pending
                    ? <Badge tone="warning" dot>Pending</Badge>
                    : r.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="neutral" dot>Archived</Badge>}
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--fn-fg-muted)', display: 'flex', gap: 8 }}>
        <Icon d={I.shield} size={14} />
        Rules are versioned: editing a row creates v3.3 with <span style={{ fontFamily: 'var(--fn-font-mono)' }}>effective_from</span> = today. Previous versions remain queryable forever.
      </div>
    </>
  );
}

Object.assign(window, { MonthlyProcessing, ApproveDisburse, CommissionRules });
