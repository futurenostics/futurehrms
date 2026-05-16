// Brief 15 — Employee profile · Documents tab

const EMP_DOCS = [
  { id: 'd1', type: 'gen', title: 'Payslip · May 2026', cat: 'Payslip', catHue: 175, source: 'Generated', issued: '02 Jun 2026', expiry: null, ack: null, sig: null, viewable: true },
  { id: 'd2', type: 'gen', title: 'Salary certificate · for HBL home loan', cat: 'Salary certificate', catHue: 175, source: 'Generated', issued: '12 May 2026', expiry: null, ack: null, sig: 'sig_required', sigStatus: 'signed' },
  { id: 'd3', type: 'gen', title: 'Increment letter · Apr 2026', cat: 'Increment letter', catHue: 65, source: 'Generated', issued: '01 Apr 2026', expiry: null, ack: 'required', ackStatus: 'acknowledged', ackDate: '02 Apr', sig: null },
  { id: 'd4', type: 'upload', title: 'Updated CNIC scan', cat: 'CNIC', catHue: 22, source: 'Uploaded', issued: '14 Feb 2024', expiry: '14 Feb 2034', expDays: 2826, sig: null, ack: null },
  { id: 'd5', type: 'gen', title: 'Probation confirmation letter', cat: 'Probation confirmation', catHue: 175, source: 'Generated', issued: '15 Feb 2026', expiry: null, ack: 'required', ackStatus: 'pending', ackSent: '5 days ago', sig: null, pending: true },
  { id: 'd6', type: 'upload', title: 'Employment contract · signed', cat: 'Employment contract', catHue: 280, source: 'Uploaded', issued: '12 Aug 2023', expiry: null, ack: 'required', ackStatus: 'acknowledged', ackDate: '12 Aug 23', sig: 'sig_required', sigStatus: 'signed' },
  { id: 'd7', type: 'gen', title: 'Offer letter', cat: 'Offer letter', catHue: 280, source: 'Generated', issued: '28 Jul 2023', expiry: null, ack: null, sig: 'sig_required', sigStatus: 'signed' },
  { id: 'd8', type: 'upload', title: 'NOC for travel to Dubai', cat: 'NOC', catHue: 200, source: 'Uploaded', issued: '20 Mar 2026', expiry: '20 Jun 2026', expDays: 36, expSoon: true, ack: null, sig: null },
  { id: 'd9', type: 'upload', title: 'AWS Certified Developer', cat: 'Training certificate', catHue: 280, source: 'Uploaded', issued: '12 Nov 2024', expiry: '12 Nov 2027', expDays: 547, sig: null, ack: null },
  { id: 'd10', type: 'gen', title: 'Salary certificate · for rental', cat: 'Salary certificate', catHue: 175, source: 'Generated', issued: '15 Jan 2026', expiry: '15 Jan 2025', expired: true, ack: null, sig: null },
];

function EmpDocsTab({ view = 'table', generateOpen = false, role = 'hr' }) {
  return (
    <>
      <ProfileHeader emp={{
        name: 'Bilal Rauf', eid: 'EMP-0042',
        desig: 'Senior Software Engineer', dept: 'Engineering',
        status: 'Permanent', email: 'bilal.rauf@futurenostics.com', phone: '+92 321 4438219',
        manager: 'Talha Mansoor', location: 'Karachi · Hybrid',
        salaryPkr: 285000, contract: 'Full-time',
      }} />

      <Tabs
        active="Documents"
        items={[
          { label: 'Overview' },
          { label: 'Job & comp' },
          { label: 'Salary history', count: 3 },
          { label: 'Timeline', count: 14 },
          { label: 'Documents', count: 23 },
          { label: 'Evaluations', count: 2 },
          { label: 'Bank', count: 1 },
        ]}
        style={{ marginBottom: 18 }}
      />

      {/* Mini KPI inline strip */}
      <div style={{
        marginBottom: 16, padding: '12px 16px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
      }}>
        <MiniStat label="Total" value="23" sub="documents" />
        <MiniStat label="Expiring within 60 days" value="2" tone="warning" linkable />
        <MiniStat label="Pending acknowledgment" value="1" tone="warning" linkable />
        <MiniStat label="Last activity" value="3 days ago" sub="3 views by HR" linkable />
        <div style={{ flex: 1 }} />
        <ToolbarPill icon={I.upload}>Upload</ToolbarPill>
        <Button icon={I.zap} iconRight={I.chev}>Generate document</Button>
        {generateOpen && <GenerateDropdown />}
      </div>

      {/* Filter bar */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Input icon={I.search} placeholder="Find by title…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Category: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Status: Active</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Expiry: All</ToolbarPill>
        <div style={{ flex: 1 }} />
        {role === 'manager' && (
          <Badge tone="info">
            <Icon d={I.eye} size={10} /> Manager visibility
          </Badge>
        )}
        <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: view === 'table' ? 'var(--fn-bg-panel)' : 'transparent',
            color: view === 'table' ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
            boxShadow: view === 'table' ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center',
          }}>
            <Icon d={I.list} size={13} />
          </span>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: view === 'grid' ? 'var(--fn-bg-panel)' : 'transparent',
            color: view === 'grid' ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
            boxShadow: view === 'grid' ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center',
          }}>
            <Icon d={I.layers} size={13} />
          </span>
        </div>
      </div>

      {view === 'grid' ? <DocsGrid /> : <DocsTable />}

      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.55,
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
        Every view, download, and replace is logged. Click any document to see its access log + lineage.
      </div>
    </>
  );
}

function DocsTable() {
  return (
    <Card padded={false}>
      <InsetTable
        padding={14}
        cols={[
          { label: '', width: 36 },
          { label: 'Title' },
          { label: 'Category', width: 170 },
          { label: 'Source', width: 100 },
          { label: 'Issued', width: 100 },
          { label: 'Expiry', width: 150 },
          { label: 'Ack', width: 110 },
          { label: 'Sig', width: 60 },
          { label: '', width: 36 },
        ]}
      >
        <tbody>
          {EMP_DOCS.map((d, i) => (
            <InsetRow key={d.id} bordered={i < EMP_DOCS.length - 1} highlight={d.pending ? 'color-mix(in oklch, var(--fn-warning-soft) 50%, transparent)' : undefined}>
              <InsetCell first>
                <span style={{
                  width: 24, height: 28, borderRadius: 4, flexShrink: 0,
                  background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--fn-border)',
                }}>
                  <Icon d={d.type === 'gen' ? I.doc : 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'} size={12} />
                </span>
              </InsetCell>
              <InsetCell>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{d.title}</div>
              </InsetCell>
              <InsetCell>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: `oklch(0.94 0.04 ${d.catHue})`,
                  color: `oklch(0.40 0.13 ${d.catHue})`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: `oklch(0.55 0.16 ${d.catHue})` }} />
                  {d.cat}
                </span>
              </InsetCell>
              <InsetCell>
                {d.source === 'Generated' ? (
                  <Badge tone="info">Generated</Badge>
                ) : (
                  <Badge tone="neutral">Uploaded</Badge>
                )}
              </InsetCell>
              <InsetCell>
                <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{d.issued}</span>
              </InsetCell>
              <InsetCell>
                <ExpiryCell d={d} />
              </InsetCell>
              <InsetCell>
                <AckCell d={d} />
              </InsetCell>
              <InsetCell>
                {d.sig === 'sig_required' ? (
                  <span style={{
                    width: 22, height: 22, borderRadius: 99,
                    background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }} title="Signed">
                    <Icon d={I.check} size={11} stroke={2.5} />
                  </span>
                ) : (
                  <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>
                )}
              </InsetCell>
              <InsetCell last>
                <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
              </InsetCell>
            </InsetRow>
          ))}
        </tbody>
      </InsetTable>
      <div style={{ height: 14 }} />
    </Card>
  );
}

function ExpiryCell({ d }) {
  if (d.expired) return <Badge tone="danger" dot>Expired</Badge>;
  if (d.expSoon) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
        <Badge tone="warning" dot>Expiring · {d.expDays}d</Badge>
        <span style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', marginTop: 2 }}>{d.expiry}</span>
      </span>
    );
  }
  if (d.expiry) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
        <Badge tone="success" dot>Valid</Badge>
        <span style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', marginTop: 2 }}>until {d.expiry}</span>
      </span>
    );
  }
  return <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Indefinite</span>;
}

function AckCell({ d }) {
  if (!d.ack) return <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>;
  if (d.ackStatus === 'acknowledged') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        color: 'var(--fn-success-soft-fg)', fontSize: 11, fontWeight: 600,
      }}>
        <span style={{
          width: 14, height: 14, borderRadius: 99,
          background: 'var(--fn-success)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={I.check} size={9} stroke={3} />
        </span>
        {d.ackDate}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
      background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)',
      border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
      cursor: 'pointer',
    }}>
      <Icon d={I.clock} size={9} /> Pending · {d.ackSent}
    </span>
  );
}

function DocsGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {EMP_DOCS.map(d => (
        <div key={d.id} style={{
          padding: 14, background: 'var(--fn-bg-panel)',
          border: '1px solid ' + (d.pending ? 'color-mix(in oklch, var(--fn-warning) 30%, var(--fn-border))' : 'var(--fn-border)'),
          borderRadius: 8,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{
              width: 32, height: 36, borderRadius: 5,
              background: `oklch(0.94 0.04 ${d.catHue})`,
              color: `oklch(0.40 0.13 ${d.catHue})`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${d.catHue}) 25%, transparent)`,
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--fn-font-mono)',
            }}>PDF</span>
            {d.expired && <Badge tone="danger" dot>Expired</Badge>}
            {d.expSoon && <Badge tone="warning" dot>{d.expDays}d</Badge>}
            {d.pending && <Badge tone="warning" dot>Pending ack</Badge>}
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)', lineHeight: 1.35 }}>{d.title}</div>
            <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>
              <span style={{ color: `oklch(0.40 0.13 ${d.catHue})`, fontWeight: 600 }}>{d.cat}</span>
              <span> · {d.issued}</span>
            </div>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 'auto', paddingTop: 8, borderTop: '1px dashed var(--fn-border)',
            color: 'var(--fn-fg-muted)',
          }}>
            <Icon d={I.download} size={12} style={{ cursor: 'pointer' }} />
            <Icon d={I.upload} size={12} style={{ cursor: 'pointer' }} />
            <Icon d={I.more} size={12} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, sub, tone, linkable }) {
  const toneColor = {
    warning: 'var(--fn-warning-soft-fg)',
  }[tone] || 'var(--fn-fg)';
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, cursor: linkable ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)' }}>
        {label}
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
      }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: toneColor, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{sub}</span>}
        {linkable && <Icon d={I.arrowR} size={10} style={{ color: 'var(--fn-fg-faint)', opacity: 0.7 }} />}
      </span>
    </div>
  );
}

function GenerateDropdown() {
  const groups = [
    { name: 'Official letters', items: [
      { label: 'Salary certificate', sub: 'for bank · v3', icon: I.shield, hue: 175 },
      { label: 'Experience letter', sub: 'standard · v4', icon: I.flag, hue: 145 },
      { label: 'Employment verification', sub: 'standard · v2', icon: I.check, hue: 175 },
    ]},
    { name: 'Compensation', items: [
      { label: 'Increment letter', sub: 'Apr 2026 increment applied', icon: I.arrowU, hue: 65 },
      { label: 'Bonus letter', sub: 'manual amount · v1', icon: I.zap, hue: 65 },
    ]},
    { name: 'Status', items: [
      { label: 'Probation confirmation', sub: 'completed 15 Feb 2026', icon: I.check, hue: 175, used: true },
      { label: 'Promotion letter', sub: 'manual fields · v3', icon: I.arrowU, hue: 280 },
    ]},
  ];
  return (
    <div style={{
      position: 'absolute', top: 140, right: 32, zIndex: 30, width: 340,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.20), 0 6px 12px -4px rgba(15, 17, 23, 0.10)',
      maxHeight: 460, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--fn-divider)' }}>
        <Input icon={I.search} placeholder="Search templates…" style={{ height: 32 }} />
      </div>
      <div style={{ overflow: 'auto', padding: '8px 6px' }}>
        {groups.map(g => (
          <div key={g.name} style={{ marginBottom: 10 }}>
            <div style={{
              padding: '4px 10px', fontSize: 10.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)',
            }}>
              {g.name}
            </div>
            {g.items.map(it => (
              <div key={it.label} style={{
                padding: '8px 10px', borderRadius: 5,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                opacity: it.used ? 0.55 : 1,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: `oklch(0.92 0.07 ${it.hue})`,
                  color: `oklch(0.38 0.16 ${it.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={it.icon} size={13} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{it.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{it.sub}</div>
                </div>
                {it.used ? <Badge tone="neutral">Used</Badge> : <Icon d={I.arrowR} size={11} style={{ color: 'var(--fn-accent-soft-fg)' }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { EmpDocsTab });
