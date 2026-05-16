// Brief 16 — Global Documents browser (HR cross-entity view)

const GLOBAL_DOCS = [
  { id: 'g1', type: 'gen', title: 'Payslip · May 2026', entity: 'Bilal Rauf', entityType: 'employee', entitySub: 'EMP-0042', entityHue: 280, cat: 'Payslip', catHue: 175, source: 'Generated', issued: '02 Jun 2026', expiry: null, status: 'Active', createdBy: 'System', tags: ['monthly'] },
  { id: 'g2', type: 'gen', title: 'Increment letter · Apr 2026', entity: 'Sana Lateef', entityType: 'employee', entitySub: 'EMP-0019', entityHue: 175, cat: 'Increment letter', catHue: 65, source: 'Generated', issued: '01 Apr 2026', expiry: null, status: 'Active', createdBy: 'Asma Ali', tags: [] },
  { id: 'g3', type: 'upload', title: 'Northwind MOU · signed', entity: 'Project Northwind', entityType: 'project', entitySub: 'PRJ-1037', entityHue: 245, cat: 'MOU', catHue: 280, source: 'Uploaded', issued: '15 Apr 2026', expiry: null, status: 'Active', createdBy: 'Talha Mansoor', tags: ['legal'] },
  { id: 'g4', type: 'upload', title: 'CNIC · updated scan', entity: 'Hassan Tariq', entityType: 'employee', entitySub: 'EMP-0073', entityHue: 22, cat: 'CNIC', catHue: 22, source: 'Uploaded', issued: '14 Feb 2024', expiry: '14 Feb 2026', status: 'Expired', expired: true, createdBy: 'Hassan Tariq', tags: [], restricted: false },
  { id: 'g5', type: 'gen', title: 'Salary certificate · for HBL home loan', entity: 'Bilal Rauf', entityType: 'employee', entitySub: 'EMP-0042', entityHue: 280, cat: 'Salary certificate', catHue: 175, source: 'Generated', issued: '12 May 2026', expiry: null, status: 'Active', createdBy: 'Asma Ali', tags: ['bank', 'loan'] },
  { id: 'g6', type: 'upload', title: 'Medical certificate · annual checkup', entity: 'Maira Khan', entityType: 'employee', entitySub: 'EMP-0061', entityHue: 145, cat: 'Medical', catHue: 22, source: 'Uploaded', issued: '08 May 2026', expiry: '08 May 2027', status: 'Active', createdBy: 'Asma Ali', tags: [], restricted: true },
  { id: 'g7', type: 'upload', title: 'Acme Web Refresh · SOW v2', entity: 'Project Acme', entityType: 'project', entitySub: 'PRJ-1042', entityHue: 280, cat: 'Statement of work', catHue: 175, source: 'Uploaded', issued: '08 May 2026', expiry: null, status: 'Active', createdBy: 'Talha Mansoor', tags: ['legal', 'q2'] },
  { id: 'g8', type: 'gen', title: 'Employee handbook · v3.2', entity: 'Futurenostics', entityType: 'organization', entitySub: 'Org-wide', entityHue: 280, cat: 'Handbook', catHue: 245, source: 'Generated', issued: '01 May 2026', expiry: null, status: 'Active', createdBy: 'Asma Ali', tags: ['policy'] },
  { id: 'g9', type: 'gen', title: 'Offer letter', entity: 'Awais Mahmood', entityType: 'employee', entitySub: 'EMP-0098', entityHue: 65, cat: 'Offer letter', catHue: 280, source: 'Generated', issued: '01 Mar 2026', expiry: null, status: 'Active', createdBy: 'Asma Ali', tags: [] },
  { id: 'g10', type: 'upload', title: 'NDA · Sterling Holdings', entity: 'Project Sterling', entityType: 'project', entitySub: 'PRJ-1039', entityHue: 175, cat: 'Client NDA', catHue: 22, source: 'Uploaded', issued: '21 Apr 2026', expiry: '21 Apr 2029', status: 'Active', expSoon: false, createdBy: 'Talha Mansoor', tags: ['legal'] },
  { id: 'g11', type: 'upload', title: 'CNIC · expiring soon', entity: 'Faraz Iqbal', entityType: 'employee', entitySub: 'EMP-0067', entityHue: 200, cat: 'CNIC', catHue: 22, source: 'Uploaded', issued: '20 Jun 2016', expiry: '20 Jun 2026', expDays: 36, expSoon: true, status: 'Active', createdBy: 'Faraz Iqbal', tags: [] },
];

function GlobalDocsBrowser({ mode = 'browse', bulkSelected = 0, savedView = false, calendar = false }) {
  const isMissing = mode === 'missing';

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Documents
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            All documents across the organization. Filter by entity, category, or status. Save views for repeat queries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.upload}>Upload</ToolbarPill>
          <ToolbarPill icon={I.layers}>Bulk generate</ToolbarPill>
          <Button icon={I.zap} iconRight={I.chev}>Generate</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.doc} label="Total documents" value="5,264" sub="4,231 active · 142 expired · 891 archived" info={false} />
        <KPI icon={I.clock} label="Expiring soon" value="38" sub="within 60 days" deltaTone="warning" delta="14 overdue" deltaTrend="up" />
        <KPI icon={I.bell2} label="Pending acknowledgments" value="12" sub="across 7 employees" deltaTone="warning" deltaTrend="up" delta="3 overdue" />
        <KPI icon={I.zap} label="Generated · last 7 days" value="142" sub="payslips · letters · certs" info={false} />
      </div>

      {/* Saved views row */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginRight: 4 }}>
          Saved views:
        </span>
        {[
          { l: 'CNICs expiring Q2', active: savedView, n: 14 },
          { l: 'Pending policy acks', active: false, n: 12 },
          { l: 'Engineering offer letters', active: false, n: 42 },
        ].map(v => (
          <button key={v.l} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            background: v.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
            color: v.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
            border: '1px solid ' + (v.active ? 'color-mix(in oklch, var(--fn-accent) 28%, transparent)' : 'var(--fn-border)'),
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Icon d={I.star} size={11} style={{ color: v.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)' }} />
            {v.l}
            <span style={{ color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', fontSize: 11 }}>{v.n}</span>
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>+ Save current as view</span>
        <div style={{ flex: 1 }} />
        <ToolbarPill small icon={I.layers}>Manage tags</ToolbarPill>
      </div>

      {/* Filter bar + active chips */}
      <Card padded={false} style={{ marginBottom: 14 }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Input icon={I.search} placeholder="Find by title or content…" style={{ height: 32, flex: 1, maxWidth: 300 }} />
          <ToolbarPill icon={I.filter} small>Filters</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Entity: All</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Category: All</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Status: Active</ToolbarPill>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{isMissing ? '6 employees missing CNIC' : `Showing 1–${GLOBAL_DOCS.length} of 5,264`}</span>
          <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
            <span title="Table" style={{ padding: '4px 8px', borderRadius: 4, background: !calendar ? 'var(--fn-bg-panel)' : 'transparent', color: !calendar ? 'var(--fn-fg)' : 'var(--fn-fg-faint)', boxShadow: !calendar ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <Icon d={I.list} size={13} />
            </span>
            <span title="Calendar" style={{ padding: '4px 8px', borderRadius: 4, background: calendar ? 'var(--fn-bg-panel)' : 'transparent', color: calendar ? 'var(--fn-fg)' : 'var(--fn-fg-faint)', boxShadow: calendar ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={13} />
            </span>
          </div>
        </div>

        {/* Active filters row */}
        {(savedView || isMissing) && (
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--fn-divider)',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>
              {isMissing ? 'Special query:' : 'Active:'}
            </span>
            {isMissing ? (
              <>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 600,
                  background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
                  border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)',
                }}>
                  Show entities WITHOUT category: CNIC
                  <Icon d={I.x} size={10} style={{ opacity: 0.7, cursor: 'pointer', marginLeft: 4 }} />
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>
                  → Lists employees missing the document, not documents
                </span>
              </>
            ) : (
              <>
                <FilterChip2 label="Category: CNIC" />
                <FilterChip2 label="Expiry: within 90 days" />
                <FilterChip2 label="Department: Engineering" />
                <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Clear all</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                  Modify · <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Save as new</span>
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      {isMissing ? (
        <MissingEntitiesTable />
      ) : calendar ? (
        <ExpiryCalendar />
      ) : (
        <DocsBrowserTable selected={bulkSelected} />
      )}

      {/* Bulk action bar */}
      {bulkSelected > 0 && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 10,
          padding: '10px 14px 10px 16px', borderRadius: 99,
          background: 'oklch(0.20 0.012 260)', color: 'oklch(0.95 0.005 250)',
          boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.30), 0 6px 12px -4px rgba(15, 17, 23, 0.18)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 12.5 }}>
            <strong style={{ fontWeight: 700 }}>{bulkSelected}</strong> documents selected
          </span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.download} size={12} /> Bulk download
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.flag} size={12} /> Bulk archive
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.doc} size={12} /> Export metadata
          </span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Clear</span>
        </div>
      )}

      {bulkSelected === 0 && !isMissing && !calendar && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11.5, color: 'var(--fn-fg-muted)',
        }}>
          <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
          Bulk downloads over 20 documents are queued — you'll receive an email with the download link when ready.
        </div>
      )}
    </>
  );
}

function DocsBrowserTable({ selected }) {
  return (
    <Card padded={false}>
      <InsetTable
        padding={14}
        cols={[
          { label: '', width: 36 },
          { label: '', width: 30 },
          { label: 'Title' },
          { label: 'Entity', width: 200 },
          { label: 'Category', width: 160 },
          { label: 'Source', width: 100 },
          { label: 'Expiry', width: 140 },
          { label: 'Created by', width: 150 },
          { label: 'Status', width: 100 },
          { label: '', width: 36 },
        ]}
      >
        <tbody>
          {GLOBAL_DOCS.map((d, i) => {
            const sel = i < selected;
            return (
              <InsetRow key={d.id} bordered={i < GLOBAL_DOCS.length - 1} highlight={sel ? 'var(--fn-accent-soft)' : undefined}>
                <InsetCell first>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: '1.5px solid ' + (sel ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
                    background: sel ? 'var(--fn-accent)' : 'var(--fn-bg-panel)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <Icon d={I.check} size={11} stroke={3} style={{ color: '#fff' }} />}
                  </span>
                </InsetCell>
                <InsetCell>
                  <Icon d={d.type === 'gen' ? I.doc : 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66'} size={13} style={{ color: 'var(--fn-fg-muted)' }} />
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{d.title}</span>
                    {d.restricted && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
                      }}>
                        <Icon d={I.lock} size={9} /> Restricted
                      </span>
                    )}
                    {d.tags && d.tags.length > 0 && d.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', fontWeight: 500,
                      }}>{t}</span>
                    ))}
                  </div>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                      background: `oklch(0.92 0.07 ${d.entityHue})`,
                      color: `oklch(0.38 0.16 ${d.entityHue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9.5, fontWeight: 700,
                    }}>
                      {d.entityType === 'employee'
                        ? d.entity.split(' ').map(w => w[0]).slice(0, 2).join('')
                        : <Icon d={d.entityType === 'project' ? I.briefcase : I.building} size={11} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>{d.entity}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{d.entitySub}</div>
                    </div>
                  </div>
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
                  <Badge tone={d.source === 'Generated' ? 'info' : 'neutral'}>{d.source}</Badge>
                </InsetCell>
                <InsetCell>
                  {d.expired
                    ? <Badge tone="danger" dot>Expired {d.expiry}</Badge>
                    : d.expSoon
                      ? <Badge tone="warning" dot>{d.expDays}d · {d.expiry}</Badge>
                      : d.expiry
                        ? <span style={{ fontSize: 11, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>until {d.expiry}</span>
                        : <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Indefinite</span>}
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>{d.createdBy}</span>
                  <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{d.issued}</div>
                </InsetCell>
                <InsetCell>
                  <Badge tone={d.status === 'Active' ? 'success' : d.status === 'Expired' ? 'danger' : 'neutral'} dot>{d.status}</Badge>
                </InsetCell>
                <InsetCell last>
                  <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                </InsetCell>
              </InsetRow>
            );
          })}
        </tbody>
      </InsetTable>
      <div style={{ height: 14 }} />
    </Card>
  );
}

function MissingEntitiesTable() {
  const missing = [
    { name: 'Daniyal Ahmed', role: 'Ops Lead', dept: 'Operations', hue: 280, eid: 'EMP-0014', tenure: '4 years' },
    { name: 'Zoya Pervez', role: 'Ops Intern', dept: 'Operations', hue: 320, eid: 'EMP-0082', tenure: '2 months' },
    { name: 'Rabia Nasir', role: 'Engineer', dept: 'Engineering', hue: 175, eid: 'EMP-0078', tenure: '4 months' },
    { name: 'Komal Rashid', role: 'Engineer', dept: 'Engineering', hue: 145, eid: 'EMP-0099', tenure: '11 months' },
    { name: 'Hira Aslam', role: 'Engineer', dept: 'Engineering', hue: 22, eid: 'EMP-0095', tenure: '14 months' },
    { name: 'Yousef Khan', role: 'BD Associate', dept: 'Business Dev', hue: 200, eid: 'EMP-0094', tenure: '16 months' },
  ];

  return (
    <>
      <div style={{
        marginBottom: 14, padding: '12px 14px', borderRadius: 8,
        background: 'var(--fn-danger-soft)',
        border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} stroke={2} style={{ color: 'var(--fn-danger-soft-fg)' }} />
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-danger-soft-fg)' }}>
          <strong style={{ fontWeight: 700 }}>Compliance gap:</strong> 6 employees don't have a CNIC document on file. This blocks payroll inclusion.
        </div>
        <Button size="sm" variant="secondary" icon={I.send} style={{ height: 26 }}>Send reminder to all</Button>
      </div>

      <Card padded={false}>
        <SectionHeader
          icon={I.users}
          title="Employees missing CNIC documents"
          badge={<Badge tone="danger">{missing.length}</Badge>}
          padding="18px 22px 14px"
          right={<ToolbarPill icon={I.download} small>Export list</ToolbarPill>}
        />
        <InsetTable
          padding={14}
          cols={[
            { label: '', width: 36 },
            { label: 'Employee' },
            { label: 'Department', width: 170 },
            { label: 'EID', width: 110 },
            { label: 'Tenure', width: 110 },
            { label: '', width: 220 },
          ]}
        >
          <tbody>
            {missing.map((m, i) => (
              <InsetRow key={m.eid} bordered={i < missing.length - 1}>
                <InsetCell first>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: '1.5px solid var(--fn-border-strong)', background: 'var(--fn-bg-panel)',
                  }} />
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: `oklch(0.92 0.07 ${m.hue})`,
                      color: `oklch(0.38 0.16 ${m.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {m.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{m.role}</div>
                    </div>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{m.dept}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{m.eid}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{m.tenure}</span>
                </InsetCell>
                <InsetCell last align="right">
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <Button size="sm" variant="secondary" icon={I.send} style={{ height: 26 }}>Remind</Button>
                    <Button size="sm" icon={I.upload} style={{ height: 26 }}>Upload</Button>
                  </span>
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

function ExpiryCalendar() {
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const items = [
    { m: 0, dot: 'warning', n: 14 }, { m: 1, dot: 'danger', n: 4 },
    { m: 2, dot: 'warning', n: 9 }, { m: 4, dot: 'neutral', n: 21 },
    { m: 5, dot: 'neutral', n: 8 },
  ];

  return (
    <Card padded={false}>
      <SectionHeader
        icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
        title="Expiry calendar"
        badge={<Badge tone="neutral">Next 6 months</Badge>}
        padding="18px 22px 14px"
        right={<ToolbarPill iconRight={I.chev} small>Group: Category</ToolbarPill>}
      />

      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {months.map((m, i) => {
            const item = items.find(x => x.m === i);
            return (
              <div key={m} style={{
                padding: 14, borderRadius: 8,
                background: 'var(--fn-bg-subtle)',
                border: '1px solid ' + (item && item.dot === 'danger' ? 'color-mix(in oklch, var(--fn-danger) 25%, transparent)' : 'var(--fn-border)'),
                minHeight: 120,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)' }}>
                  {m} 2026
                </div>
                {item ? (
                  <>
                    <div style={{
                      marginTop: 8, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em',
                      color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                    }}>{item.n}</div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)', marginTop: 4 }}>
                      docs expiring
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge tone={item.dot}>
                        {item.dot === 'danger' ? 'Past due' : item.dot === 'warning' ? 'Action needed' : 'Plan ahead'}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                    Clear month — no expiries
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--fn-fg-faint)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon d={I.shield} size={12} />
          Click a month to drill into the documents · Switch to "Group: Department" or "Group: Employee" from the top right
        </div>
      </div>
    </Card>
  );
}

function FilterChip2({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 4px 3px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 500,
      background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)',
      border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
    }}>
      {label}
      <Icon d={I.x} size={11} style={{ opacity: 0.7, cursor: 'pointer', marginLeft: 2, marginRight: 2 }} />
    </span>
  );
}

Object.assign(window, { GlobalDocsBrowser });
