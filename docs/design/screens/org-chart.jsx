// Org chart — interactive reporting structure
// Built with the classic CSS pseudo-element pattern for connectors:
//   ::before draws the vertical line above each child
//   ::after draws the half horizontal line connecting siblings
// This gives pixel-perfect connectors that scale with the tree.

const ORG_DATA = {
  id: 'u1', name: 'Faisal Anwar', role: 'Chief Executive Officer', dept: 'Leadership', eid: 'EMP-0001', hue: 280, since: '2020',
  children: [
    {
      id: 'u2', name: 'Asma Ali', role: 'Head of People', dept: 'HR & People', eid: 'EMP-0028', hue: 22, since: '2022',
      children: [
        { id: 'u3', name: 'Ayesha Imran', role: 'HR Coordinator', dept: 'HR & People', eid: 'EMP-0049', hue: 22, since: '2026', status: 'Probation' },
        { id: 'u4', name: 'Imran Aziz', role: 'HR Generalist', dept: 'HR & People', eid: 'EMP-0090', hue: 22, since: '2024' },
      ],
    },
    {
      id: 'u5', name: 'Talha Mansoor', role: 'Head of Engineering', dept: 'Engineering', eid: 'EMP-0033', hue: 280, since: '2021',
      children: [
        {
          id: 'u6', name: 'Bilal Rauf', role: 'Senior Engineer', dept: 'Engineering', eid: 'EMP-0042', hue: 280, since: '2023',
          children: [
            { id: 'u7', name: 'Hassan Tariq', role: 'Engineer', dept: 'Engineering', eid: 'EMP-0073', hue: 280, since: '2026', status: 'Probation' },
            { id: 'u8', name: 'Faraz Iqbal', role: 'Engineer', dept: 'Engineering', eid: 'EMP-0067', hue: 280, since: '2023' },
            { id: 'u17', name: 'Rabia Nasir', role: 'Engineer', dept: 'Engineering', eid: 'EMP-0078', hue: 280, since: '2026', status: 'Contractor' },
          ],
        },
        {
          id: 'u9', name: 'Omar Sheikh', role: 'Senior Engineer', dept: 'Engineering', eid: 'EMP-0055', hue: 280, since: '2023',
          children: [
            { id: 'u10', name: 'Hira Aslam', role: 'Engineer', dept: 'Engineering', eid: 'EMP-0095', hue: 280, since: '2025' },
            { id: 'u11', name: 'Komal Rashid', role: 'Engineer', dept: 'Engineering', eid: 'EMP-0099', hue: 280, since: '2025' },
          ],
        },
      ],
    },
    {
      id: 'u12', name: 'Sana Lateef', role: 'Head of Business Dev', dept: 'Business Dev', eid: 'EMP-0019', hue: 175, since: '2022',
      children: [
        {
          id: 'u13', name: 'Maira Khan', role: 'BD Lead', dept: 'Business Dev', eid: 'EMP-0061', hue: 175, since: '2024',
          children: [
            { id: 'u14', name: 'Yousef Khan', role: 'BD Associate', dept: 'Business Dev', eid: 'EMP-0094', hue: 175, since: '2024' },
            { id: 'u15', name: 'Awais Mahmood', role: 'BD Associate', dept: 'Business Dev', eid: 'EMP-0098', hue: 175, since: '2026' },
          ],
        },
      ],
    },
    {
      id: 'u16', name: 'Daniyal Ahmed', role: 'Head of Operations', dept: 'Operations', eid: 'EMP-0014', hue: 145, since: '2022',
      children: [
        { id: 'u18', name: 'Zoya Pervez', role: 'Ops Intern', dept: 'Operations', eid: 'EMP-0082', hue: 145, since: '2026', status: 'Intern' },
      ],
    },
  ],
};

// Count descendants recursively (for "X reports" displayed on each manager node)
function countDescendants(node) {
  if (!node.children) return 0;
  let n = node.children.length;
  node.children.forEach(c => { n += countDescendants(c); });
  return n;
}

// Find a node + path-to-root by id
function findPath(node, id, path = []) {
  if (node.id === id) return [...path, node];
  if (!node.children) return null;
  for (const c of node.children) {
    const r = findPath(c, id, [...path, node]);
    if (r) return r;
  }
  return null;
}

const ORG_STYLES = `
.org-tree { display: inline-flex; flex-direction: column; align-items: center; vertical-align: top; padding: 0 6px; }
.org-tree-children {
  display: flex; align-items: flex-start; justify-content: center;
  gap: 0; padding-top: 0; margin-top: 0; position: relative;
}
.org-tree-children::before {
  content: ''; position: absolute;
  top: -28px; left: 50%; transform: translateX(-50%);
  width: 2px; height: 28px;
  background: var(--fn-border-strong); border-radius: 99px;
}
.org-tree-child {
  position: relative;
  padding-top: 28px;
}
/* Vertical drop line above each child card */
.org-tree-child::before {
  content: ''; position: absolute;
  top: 0; left: calc(50% - 1px);
  width: 2px; height: 28px;
  background: var(--fn-border-strong); border-radius: 99px;
}
/* Horizontal sibling connector — drawn via ::after, half-spans for first/last */
.org-tree-child.has-sibs::after {
  content: ''; position: absolute;
  top: 0; height: 2px;
  background: var(--fn-border-strong); border-radius: 99px;
}
.org-tree-child.first::after { left: 50%; right: 0; }
.org-tree-child.last::after  { left: 0; right: 50%; }
.org-tree-child.middle::after { left: 0; right: 0; }
/* Children block has spacing between cards via gap; the actual horizontal
   line is anchored to the row's wrapping parent through child ::after */
.org-tree-children-row { display: flex; align-items: flex-start; }
`;

function OrgChart() {
  const [selectedId, setSelectedId] = React.useState('u6');
  const [collapsed, setCollapsed] = React.useState(new Set());
  const [search, setSearch] = React.useState('');
  const [dept, setDept] = React.useState('All');
  const [compact, setCompact] = React.useState(false);

  const isCollapsed = id => collapsed.has(id);
  const toggle = id => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsed(next);
  };

  // Selection details
  const path = findPath(ORG_DATA, selectedId) || findPath(ORG_DATA, 'u6');
  const selected = path[path.length - 1];
  const manager = path[path.length - 2];
  const reports = selected.children || [];
  const totalReports = countDescendants(selected);

  const departments = [
    { name: 'Engineering', count: 42, hue: 280 },
    { name: 'Business Dev', count: 21, hue: 175 },
    { name: 'Operations', count: 12, hue: 145 },
    { name: 'HR & People', count: 9, hue: 22 },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ORG_STYLES }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Employees</span>
            <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
            <span>Org chart</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Reporting structure
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)' }}>
            84 people · 5 levels deep · click any card to see its branch, use −/+ to collapse a sub-tree.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export PNG</ToolbarPill>
          <ToolbarPill icon={I.layers} iconRight={I.chev}>Tree view</ToolbarPill>
          <Button icon={I.user}>Add report line</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.users} label="Total headcount" value="84" delta="+6 QTD" deltaTrend="up" />
        <KPI icon={I.layers} label="Org depth" value="5" sub="levels of reporting" info={false} />
        <KPI icon={I.briefcase} label="Span of control" value="4.2" sub="avg reports / manager" info={false} />
        <KPI icon={I.user} label="Open roles" value="3" delta="2 Eng · 1 BD" deltaTone="warning" deltaTrend="up" />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        {/* Canvas card */}
        <Card padded={false}>
          <SectionHeader
            icon={I.layers}
            title="Org chart"
            badge={<Badge tone="neutral">18 visible</Badge>}
            padding="16px 18px 14px"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 220 }}>
                  <Input
                    icon={I.search}
                    placeholder="Find person…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ height: 32 }}
                  />
                </div>
                <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
                  <button onClick={() => setCompact(false)} style={viewToggleBtn(!compact)}>Full</button>
                  <button onClick={() => setCompact(true)} style={viewToggleBtn(compact)}>Compact</button>
                </div>
              </div>
            }
          />

          {/* Filter chips row */}
          <div style={{
            padding: '0 18px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            borderBottom: '1px solid var(--fn-divider)',
          }}>
            <DeptChip name="All" count={84} active={dept === 'All'} onClick={() => setDept('All')} />
            {departments.map(d => (
              <DeptChip key={d.name} name={d.name} count={d.count} hue={d.hue} active={dept === d.name} onClick={() => setDept(d.name)} />
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
              Click <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, border: '1px solid var(--fn-border-strong)', borderRadius: 99, fontSize: 10, fontWeight: 600, color: 'var(--fn-fg-muted)', verticalAlign: 'middle' }}>−</span> to collapse a branch
            </span>
          </div>

          {/* Tree canvas */}
          <div style={{
            position: 'relative',
            padding: '36px 24px 36px',
            backgroundColor: 'var(--fn-bg-subtle)',
            backgroundImage: 'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fn-fg-faint) 35%, transparent) 1px, transparent 0)',
            backgroundSize: '20px 20px',
            overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'min-content' }}>
              <OrgTree
                node={ORG_DATA}
                isRoot
                selectedId={selectedId}
                onSelect={setSelectedId}
                isCollapsed={isCollapsed}
                onToggle={toggle}
                search={search.toLowerCase()}
                deptFilter={dept}
                compact={compact}
              />
            </div>
          </div>

          {/* Legend */}
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--fn-divider)',
            display: 'flex', alignItems: 'center', gap: 18, fontSize: 11.5, color: 'var(--fn-fg-muted)',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>Departments:</span>
            {departments.map(d => (
              <span key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 4, borderRadius: 99, background: `oklch(0.55 0.16 ${d.hue})` }} />
                {d.name}
              </span>
            ))}
            <div style={{ flex: 1 }} />
            <span>Scroll horizontally if tree exceeds canvas</span>
          </div>
        </Card>

        {/* Right detail panel */}
        <div style={{ position: 'sticky', top: 12, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card padded={false}>
            <SectionHeader icon={I.user} title="Selected person" padding="18px 22px 14px" />

            <div style={{ padding: '0 22px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                  background: `oklch(0.92 0.07 ${selected.hue})`, color: `oklch(0.38 0.16 ${selected.hue})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em',
                }}>
                  {selected.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fn-fg)' }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
                    {selected.role} · {selected.dept}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge tone={selected.status === 'Probation' ? 'warning' : selected.status === 'Intern' ? 'info' : selected.status === 'Contractor' ? 'accent' : 'success'} dot>
                  {selected.status || 'Permanent'}
                </Badge>
                <Badge tone="outline">{selected.eid}</Badge>
                <Badge tone="neutral">Since {selected.since}</Badge>
              </div>
            </div>

            {/* Reporting line */}
            <div style={{ padding: '0 22px 18px' }}>
              <div style={{
                padding: 12, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 10 }}>
                  Reporting line
                </div>
                {manager ? (
                  <LineLink hue={manager.hue} name={manager.name} role={manager.role} />
                ) : (
                  <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                    Top of the org — no manager
                  </div>
                )}
                <Connector />
                <LineLink hue={selected.hue} name={selected.name} role="self" current />
                {reports.length > 0 && (
                  <>
                    <Connector />
                    <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginLeft: 36, marginBottom: 4 }}>
                      {reports.length} direct {reports.length === 1 ? 'report' : 'reports'}{totalReports > reports.length ? ` · ${totalReports} total` : ''}
                    </div>
                    {reports.map(r => (
                      <LineLink key={r.id} hue={r.hue} name={r.name} role={r.role} indent
                        onClick={() => setSelectedId(r.id)}
                        status={r.status} />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: '0 22px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { l: 'Direct reports', v: reports.length, sub: `${totalReports} total` },
                  { l: 'Depth from CEO', v: `L${path.length - 1}`, sub: `${path.length} levels` },
                  { l: 'Tenure', v: `${2026 - parseInt(selected.since)}y`, sub: `since ${selected.since}` },
                  { l: 'Span of control', v: reports.length > 0 ? (totalReports / reports.length).toFixed(1) : '—', sub: 'reports / lvl' },
                ].map(s => (
                  <div key={s.l} style={{
                    padding: 10, borderRadius: 8,
                    background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)', fontWeight: 500 }}>{s.l}</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)' }}>
                      {s.v}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button full icon={I.user}>Open profile</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" full icon={I.edit} size="sm">Change manager</Button>
                <Button variant="secondary" full icon={I.mail} size="sm">Message</Button>
              </div>
            </div>
          </Card>

          {/* Breadcrumb / path card */}
          <Card padded={false}>
            <SectionHeader icon={I.scale} title="Path from CEO" padding="16px 22px 14px" />
            <div style={{ padding: '0 22px 18px' }}>
              {path.map((n, i) => (
                <div key={n.id} onClick={() => setSelectedId(n.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  background: n.id === selectedId ? 'var(--fn-accent-soft)' : 'transparent',
                  marginLeft: i * 16,
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `oklch(0.92 0.07 ${n.hue})`, color: `oklch(0.38 0.16 ${n.hue})`,
                    fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.02em',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {n.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.id === selectedId ? 600 : 500, color: n.id === selectedId ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>
                      {n.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{n.role}</div>
                  </div>
                  {i < path.length - 1 && <Icon d={I.chevR} size={12} style={{ color: 'var(--fn-fg-faint)' }} />}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// Recursive tree renderer
function OrgTree({ node, isRoot, selectedId, onSelect, isCollapsed, onToggle, search, deptFilter, compact }) {
  const hasChildren = node.children && node.children.length > 0;
  const collapsed = hasChildren && isCollapsed(node.id);
  const visibleChildren = hasChildren && !collapsed ? node.children : [];

  return (
    <div className="org-tree">
      <OrgNode
        node={node}
        isCEO={isRoot}
        selected={node.id === selectedId}
        collapsed={collapsed}
        hasChildren={hasChildren}
        onClick={() => onSelect(node.id)}
        onToggle={(e) => { e.stopPropagation(); onToggle(node.id); }}
        search={search}
        deptFilter={deptFilter}
        compact={compact}
        reportCount={countDescendants(node)}
      />

      {visibleChildren.length > 0 && (
        <div className="org-tree-children">
          {visibleChildren.map((child, i) => {
            const cls = ['org-tree-child'];
            if (visibleChildren.length > 1) {
              cls.push('has-sibs');
              if (i === 0) cls.push('first');
              else if (i === visibleChildren.length - 1) cls.push('last');
              else cls.push('middle');
            }
            return (
              <div key={child.id} className={cls.join(' ')}>
                <OrgTree
                  node={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  isCollapsed={isCollapsed}
                  onToggle={onToggle}
                  search={search}
                  deptFilter={deptFilter}
                  compact={compact}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrgNode({ node, isCEO, selected, collapsed, hasChildren, onClick, onToggle, search, deptFilter, compact, reportCount }) {
  const initials = node.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const matchesSearch = !search || node.name.toLowerCase().includes(search) || node.role.toLowerCase().includes(search) || node.eid.toLowerCase().includes(search);
  const matchesDept = deptFilter === 'All' || node.dept === deptFilter || isCEO;
  const dim = !matchesSearch || !matchesDept;
  const width = compact ? 152 : (isCEO ? 220 : 188);

  return (
    <div
      onClick={onClick}
      style={{
        width, padding: compact ? '10px 12px' : '14px 14px',
        background: selected ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
        border: '1px solid ' + (selected ? 'color-mix(in oklch, var(--fn-accent) 40%, transparent)' : 'var(--fn-border)'),
        borderTop: `3px solid oklch(0.55 0.16 ${node.hue})`,
        borderRadius: 8,
        boxShadow: selected
          ? '0 6px 14px color-mix(in oklch, var(--fn-accent) 18%, transparent)'
          : 'var(--fn-shadow-sm)',
        position: 'relative', cursor: 'pointer',
        opacity: dim ? 0.35 : 1,
        transition: 'opacity .15s, box-shadow .12s, transform .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: compact ? 30 : (isCEO ? 40 : 36),
          height: compact ? 30 : (isCEO ? 40 : 36),
          borderRadius: compact ? 6 : 8,
          background: `oklch(0.92 0.07 ${node.hue})`,
          color: `oklch(0.38 0.16 ${node.hue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 10.5 : (isCEO ? 13 : 12), fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0,
        }}>
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: compact ? 12 : (isCEO ? 14 : 13),
            fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {node.name}
          </div>
          <div style={{
            fontSize: compact ? 10.5 : 11.5,
            color: 'var(--fn-fg-muted)', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {node.role}
          </div>
        </div>
      </div>

      {!compact && (
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--fn-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--fn-fg-muted)',
        }}>
          <span style={{ fontFamily: 'var(--fn-font-mono)' }}>{node.eid}</span>
          {node.status ? (
            <Badge tone={node.status === 'Probation' ? 'warning' : node.status === 'Intern' ? 'info' : 'accent'}>
              {node.status}
            </Badge>
          ) : hasChildren ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--fn-fg-muted)' }}>
              <Icon d={I.users} size={11} /> {reportCount}
            </span>
          ) : (
            <span style={{ color: 'var(--fn-fg-faint)' }}>{node.since}</span>
          )}
        </div>
      )}

      {/* Collapse handle */}
      {hasChildren && (
        <span
          onClick={onToggle}
          style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            width: 22, height: 22, borderRadius: 99,
            background: 'var(--fn-bg-panel)', border: '1.5px solid var(--fn-border-strong)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fn-fg-muted)', cursor: 'pointer',
            boxShadow: 'var(--fn-shadow-xs)', zIndex: 3,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', lineHeight: 1, paddingBottom: 1,
          }}
        >
          {collapsed ? '+' : '−'}
        </span>
      )}
    </div>
  );
}

function DeptChip({ name, count, hue, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 11px', borderRadius: 99, fontSize: 12, fontWeight: 500,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
      color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
      border: '1px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border)'),
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {hue != null && <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${hue})` }} />}
      {name}
      <span style={{ color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', fontSize: 11 }}>{count}</span>
    </button>
  );
}

function viewToggleBtn(active) {
  return {
    padding: '5px 11px', fontSize: 12, fontWeight: 600, borderRadius: 4,
    background: active ? 'var(--fn-bg-panel)' : 'transparent',
    color: active ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
    boxShadow: active ? 'var(--fn-shadow-xs)' : 'none',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };
}

function LineLink({ hue = 280, name, role, current, indent, status, onClick }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
        paddingLeft: indent ? 36 : 8, borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        background: current ? 'var(--fn-bg-panel)' : 'transparent',
        border: current ? '1px solid color-mix(in oklch, var(--fn-accent) 30%, transparent)' : '1px solid transparent',
      }}
    >
      <span style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: current ? 'var(--fn-accent)' : `oklch(0.92 0.07 ${hue})`,
        color: current ? 'var(--fn-accent-fg)' : `oklch(0.38 0.16 ${hue})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.02em',
      }}>
        {initials}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: current ? 600 : 500,
          color: current ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{role}</div>
      </div>
      {status && <Badge tone={status === 'Probation' ? 'warning' : status === 'Intern' ? 'info' : 'accent'}>{status}</Badge>}
    </div>
  );
}

function Connector() {
  return (
    <div style={{
      height: 14, marginLeft: 21, borderLeft: '2px dashed var(--fn-border-strong)',
    }} />
  );
}

window.OrgChart = OrgChart;
