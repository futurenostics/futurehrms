// Project Categories — manage the taxonomy used across Projects
function ProjectCategories({ currency = 'USD' }) {
  const [selectedId, setSelectedId] = React.useState('cat-upw');

  const categories = [
    {
      id: 'cat-ext', name: 'External', slug: 'external', hue: 280,
      parent: null, archived: false,
      description: 'Direct client engagements signed outside of any marketplace.',
      defaultRule: 'Eng · External · v3.2',
      pool: '24%',
      projects: 11, revenue: 96400, comm: 23136,
      lastUsed: '08 May 2026',
    },
    {
      id: 'cat-upw', name: 'Upwork', slug: 'upwork', hue: 175,
      parent: null, archived: false,
      description: 'Projects sourced through Upwork profiles — sub-categorized by profile.',
      defaultRule: 'Eng · Upwork · v3.2',
      pool: '30%',
      projects: 8, revenue: 41200, comm: 10080,
      lastUsed: '03 May 2026',
    },
    {
      id: 'cat-upw-j', name: 'Johnny', slug: 'upwork-johnny', hue: 175,
      parent: 'cat-upw', archived: false,
      description: 'Projects landed via Johnny\'s Upwork profile.',
      defaultRule: 'Eng · Upwork · v3.2',
      pool: '30%',
      projects: 3, revenue: 14200, comm: 4260,
      lastUsed: '21 Apr 2026',
    },
    {
      id: 'cat-upw-m', name: 'Michele', slug: 'upwork-michele', hue: 175,
      parent: 'cat-upw', archived: false,
      description: 'Projects landed via Michele\'s Upwork profile.',
      defaultRule: 'Eng · Upwork · v3.2',
      pool: '30%',
      projects: 4, revenue: 18400, comm: 5520,
      lastUsed: '15 Apr 2026',
    },
    {
      id: 'cat-b2b', name: 'B2B', slug: 'b2b', hue: 245,
      parent: null, archived: false,
      description: 'Long-term partnerships, retainers and reseller deals.',
      defaultRule: 'Eng · B2B · v3.1',
      pool: '20%',
      projects: 4, revenue: 58000, comm: 9830,
      lastUsed: '01 May 2026',
    },
    {
      id: 'cat-internal', name: 'Internal R&D', slug: 'internal-rnd', hue: 65,
      parent: null, archived: true,
      description: 'Internal product builds — no client revenue, archived in Q1 2026.',
      defaultRule: '—',
      pool: '—',
      projects: 0, revenue: 0, comm: 0,
      lastUsed: '12 Jan 2026',
    },
  ];

  const selected = categories.find(c => c.id === selectedId) || categories[0];
  const subs = categories.filter(c => c.parent === selected.id);
  const parent = categories.find(c => c.id === selected.parent);
  const active = categories.filter(c => !c.archived);

  // Palette for color swatch picker
  const swatches = [
    { name: 'Violet', hue: 280 },
    { name: 'Indigo', hue: 255 },
    { name: 'Blue', hue: 230 },
    { name: 'Sky', hue: 200 },
    { name: 'Teal', hue: 175 },
    { name: 'Mint', hue: 145 },
    { name: 'Amber', hue: 65 },
    { name: 'Coral', hue: 22 },
  ];

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Projects</span>
            <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
            <span>Categories</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Project categories
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)', maxWidth: 600 }}>
            Organize how projects roll up to commissions, reports, and approvals. Categories can be nested — every Upwork project picks a profile sub-category.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
          <Button icon={I.plus}>New category</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.layers} label="Active categories" value={active.length} delta={`${active.filter(c => c.parent).length} sub`} deltaTone="success" info={false} />
        <KPI icon={I.briefcase} label="Projects using" value="23" sub="across all categories" info={false} />
        <KPI icon={I.card} label="Combined commission" value="$48k" sub="May 2026 run" info={false} />
        <KPI icon={I.flag} label="Archived" value={categories.filter(c => c.archived).length} sub="hidden from new projects" info={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* LEFT — categories list */}
        <Card padded={false}>
          <SectionHeader
            icon={I.layers}
            title="All categories"
            padding="18px 22px 14px"
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                <ToolbarPill icon={I.filter} small>Filter</ToolbarPill>
                <ToolbarPill iconRight={I.chev} small>Sort</ToolbarPill>
              </div>
            }
          />

          <InsetTable
            padding={14}
            cols={[
              { label: 'Category' },
              { label: 'Pool', width: 80 },
              { label: 'Projects', align: 'right', width: 90 },
              { label: 'May commission', align: 'right', width: 150 },
              { label: 'Status', width: 110 },
            ]}
          >
            <tbody>
              {categories.map((c, i) => {
                const isSub = c.parent != null;
                const isSelected = c.id === selectedId;
                return (
                  <InsetRow
                    key={c.id}
                    bordered={i < categories.length - 1}
                    highlight={isSelected ? 'var(--fn-accent-soft)' : undefined}
                    style={{ cursor: 'pointer' }}
                  >
                    <InsetCell first>
                      <div
                        onClick={() => setSelectedId(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: isSub ? 24 : 0 }}
                      >
                        {isSub && (
                          <span style={{ color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', fontSize: 11 }}>↳</span>
                        )}
                        <span style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: `oklch(0.92 0.07 ${c.hue})`,
                          color: `oklch(0.38 0.16 ${c.hue})`,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon d={c.parent ? I.briefcase : I.layers} size={15} />
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>{c.name}</span>
                            {isSub && (
                              <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>
                                upwork · {c.slug.split('-').pop()}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2,
                            maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {c.description}
                          </div>
                        </div>
                      </div>
                    </InsetCell>
                    <InsetCell>
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600, color: c.archived ? 'var(--fn-fg-faint)' : 'var(--fn-fg)' }}>
                        {c.pool}
                      </span>
                    </InsetCell>
                    <InsetCell align="right">
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: c.archived ? 'var(--fn-fg-faint)' : 'var(--fn-fg)' }}>
                        {c.projects}
                      </span>
                    </InsetCell>
                    <InsetCell align="right">
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: c.archived ? 'var(--fn-fg-faint)' : 'var(--fn-fg)' }}>
                        {c.archived ? '—' : (currency === 'USD' ? `$${c.comm.toLocaleString()}` : `₨${(c.comm * 278.5).toLocaleString('en-PK')}`)}
                      </span>
                    </InsetCell>
                    <InsetCell last>
                      <Badge tone={c.archived ? 'neutral' : 'success'} dot>
                        {c.archived ? 'Archived' : 'Active'}
                      </Badge>
                    </InsetCell>
                  </InsetRow>
                );
              })}
            </tbody>
          </InsetTable>

          {/* Add row */}
          <div style={{ padding: '12px 18px 18px' }}>
            <button style={{
              padding: '12px 16px', width: '100%', background: 'transparent',
              border: '1px dashed var(--fn-border-strong)', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, color: 'var(--fn-fg-muted)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon d={I.plus} size={14} /> Add another category
            </button>
          </div>
        </Card>

        {/* RIGHT — inline editor / detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 12, height: 'fit-content' }}>
          <Card padded={false}>
            <SectionHeader
              icon={I.edit}
              title="Edit category"
              padding="18px 22px 14px"
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <ToolbarPill small>Duplicate</ToolbarPill>
                  <ToolbarPill small icon={I.trash}>Archive</ToolbarPill>
                </div>
              }
            />

            <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Identity */}
              <div style={{
                padding: 14, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `oklch(0.92 0.07 ${selected.hue})`,
                  color: `oklch(0.38 0.16 ${selected.hue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon d={selected.parent ? I.briefcase : I.layers} size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.015em' }}>{selected.name}</span>
                    {parent && <Badge tone="neutral">Sub-category of {parent.name}</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>
                    {selected.slug}
                  </div>
                </div>
              </div>

              <CatField label="Display name" hint="Shown on project cards, payslips, and reports.">
                <Input defaultValue={selected.name} style={{ height: 40 }} />
              </CatField>

              <CatField label="Description" hint="Helps managers pick the right category when creating projects.">
                <textarea rows={2} defaultValue={selected.description} style={{
                  width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                  fontFamily: 'inherit', color: 'var(--fn-fg)',
                  background: 'var(--fn-bg-panel)',
                  border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                }} />
              </CatField>

              <CatField label="Color" hint="Used everywhere the category appears — badges, charts, filters.">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {swatches.map(s => (
                    <button key={s.hue} title={s.name} style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `oklch(0.55 0.16 ${s.hue})`,
                      border: '2px solid ' + (selected.hue === s.hue ? 'var(--fn-fg)' : 'var(--fn-bg-panel)'),
                      outline: selected.hue === s.hue ? '1px solid var(--fn-accent)' : 'none', outlineOffset: 2,
                      cursor: 'pointer', position: 'relative',
                    }}>
                      {selected.hue === s.hue && (
                        <Icon d={I.check} size={14} stroke={3} style={{ color: '#fff' }} />
                      )}
                    </button>
                  ))}
                </div>
              </CatField>

              <CatField label="Parent category" hint="Make this a sub-category of another (e.g. Johnny / Michele under Upwork).">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  <ParentChip label="(top-level)" active={!selected.parent} />
                  {categories.filter(c => !c.parent && c.id !== selected.id).slice(0, 3).map(p => (
                    <ParentChip key={p.id} label={p.name} hue={p.hue} active={selected.parent === p.id} />
                  ))}
                </div>
              </CatField>

              <CatField label="Default commission rule" hint="Applied automatically when this category is picked on a new project. Can be overridden per project.">
                <div style={{
                  padding: '10px 12px', borderRadius: 6,
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: 'var(--fn-accent-soft)',
                    color: 'var(--fn-accent-soft-fg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d={I.scale} size={13} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fn-fg)' }}>{selected.defaultRule}</div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Pool {selected.pool} · published 01 May 2026</div>
                  </div>
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </CatField>

              <CatField label="Slug / API key" hint="Used in URLs, exports, and the Payoneer CSV. Auto-generated — only override if you know what you're doing.">
                <Input defaultValue={selected.slug} suffix={
                  <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>auto</span>
                } style={{ height: 40 }} />
              </CatField>

              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Active</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                    New projects can pick this category. Existing ones are unaffected when toggled off.
                  </div>
                </div>
                <Toggle on={!selected.archived} />
              </div>
            </div>

            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--fn-divider)',
              background: 'var(--fn-bg-subtle)', borderRadius: '0 0 10px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
                Last used <span style={{ color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{selected.lastUsed}</span>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button size="sm" icon={I.check}>Save changes</Button>
              </div>
            </div>
          </Card>

          {/* Where it's used */}
          {subs.length > 0 && (
            <Card padded={false}>
              <SectionHeader icon={I.layers} title={`Sub-categories (${subs.length})`} padding="16px 22px 12px" />
              <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subs.map(s => (
                  <div key={s.id} onClick={() => setSelectedId(s.id)} style={{
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                    borderRadius: 8, cursor: 'pointer',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: `oklch(0.92 0.07 ${s.hue})`,
                      color: `oklch(0.38 0.16 ${s.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon d={I.briefcase} size={13} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{s.projects} projects · last used {s.lastUsed}</div>
                    </div>
                    <Icon d={I.chevR} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                  </div>
                ))}
                <button style={{
                  marginTop: 4, padding: '8px 12px', width: '100%',
                  background: 'transparent', border: '1px dashed var(--fn-border-strong)',
                  borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg-muted)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Icon d={I.plus} size={12} /> Add sub-category to {selected.name}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function CatField({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fn-fg-faint)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function ParentChip({ label, hue, active }) {
  return (
    <button style={{
      padding: '10px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
      border: '1px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    }}>
      {hue != null && <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${hue})` }} />}
      {label}
    </button>
  );
}

function Toggle({ on }) {
  return (
    <span style={{
      width: 38, height: 22,
      background: on ? 'var(--fn-success)' : 'var(--fn-bg-inset)',
      border: on ? 'none' : '1px solid var(--fn-border-strong)',
      borderRadius: 99, position: 'relative', flexShrink: 0, cursor: 'pointer',
      display: 'inline-block',
    }}>
      <span style={{
        position: 'absolute', top: on ? 2 : 1, left: on ? 18 : 1,
        width: 18, height: 18, background: '#fff', borderRadius: 99,
        boxShadow: '0 1px 2px rgba(0,0,0,.15)',
      }} />
    </span>
  );
}

window.ProjectCategories = ProjectCategories;
