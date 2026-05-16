// Empty states + loading skeletons — reusable patterns for the whole app

const SKELETON_STYLES = `
@keyframes fnShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.fn-skel {
  background: linear-gradient(90deg,
    color-mix(in oklch, var(--fn-bg-inset) 100%, transparent) 0%,
    color-mix(in oklch, var(--fn-bg-inset) 60%, transparent) 50%,
    color-mix(in oklch, var(--fn-bg-inset) 100%, transparent) 100%);
  background-size: 200% 100%;
  animation: fnShimmer 1.8s infinite linear;
  border-radius: 6px;
  display: block;
}
`;

function Skel({ w, h = 12, r = 6, style }) {
  return (
    <span className="fn-skel" style={{
      width: w, height: h, borderRadius: r, display: 'inline-block',
      ...style
    }} />);

}

// Reusable empty state — compact, refined
function EmptyState({ icon, illustration, title, body, primary, secondary, helpers, style }) {
  return (
    <div style={{
      padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', minHeight: 220, justifyContent: 'center', ...style
    }}>
      {illustration ? illustration :
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--fn-icon-tile)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fn-icon-tile-fg)', marginBottom: 12
      }}>
          <Icon d={icon} size={16} stroke={1.6} />
        </div>
      }
      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)',
        letterSpacing: '-0.005em', lineHeight: 1.35,
      }}>
        {title}
      </div>
      <div style={{
        marginTop: 6, fontSize: 12.5, color: 'var(--fn-fg-muted)',
        maxWidth: 300, lineHeight: 1.6, fontWeight: 400,
      }}>
        {body}
      </div>
      {(primary || secondary) &&
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {primary && <Button size="sm" icon={primary.icon}>{primary.label}</Button>}
          {secondary && <Button variant="secondary" size="sm" icon={secondary.icon}>{secondary.label}</Button>}
        </div>
      }
      {helpers &&
      <div style={{
        marginTop: 14, padding: '8px 12px', borderRadius: 6,
        background: 'var(--fn-bg-subtle)', border: '1px dashed var(--fn-border-strong)',
        fontSize: 11.5, color: 'var(--fn-fg-muted)', maxWidth: 320, lineHeight: 1.5,
      }}>
          {helpers}
        </div>
      }
    </div>);

}

// ───── Skeletons ─────
function SkelKPI() {
  return (
    <Card style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skel w={28} h={28} r={7} />
        <Skel w={110} h={14} />
        <Skel w={14} h={14} r={99} style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <Skel w={120} h={32} r={6} />
        <Skel w={52} h={22} r={6} />
      </div>
      <Skel w={180} h={11} style={{ marginTop: 14 }} />
    </Card>);

}

function SkelChartCard() {
  return (
    <Card padded={false}>
      <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skel w={36} h={36} r={8} />
          <Skel w={160} h={15} />
        </div>
        <Skel w={90} h={28} r={6} />
      </div>
      <div style={{ padding: '20px 22px 22px' }}>
        <Skel w={220} h={36} r={6} />
        <Skel w={140} h={14} style={{ marginTop: 12 }} />
        {/* Bar chart skeleton */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 180, marginTop: 28, paddingBottom: 4 }}>
          {[0.45, 0.65, 0.85, 0.50, 0.75, 0.95, 0.40].map((h, i) =>
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <Skel w="100%" h={`${h * 170}px`} r={8} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {[1, 2, 3].map((i) =>
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Skel w={10} h={10} r={3} />
              <Skel w={60} h={11} />
            </span>
          )}
        </div>
      </div>
    </Card>);

}

function SkelTableRow({ cols, last }) {
  return (
    <tr>
      {cols.map((c, i) => {
        const first = i === 0;
        const lastCol = i === cols.length - 1;
        const padding = first ? '14px 0 14px 18px' : lastCol ? '14px 18px 14px 12px' : '14px 12px';
        return (
          <td key={i} style={{
            padding, textAlign: c.align || 'left',
            borderBottom: !last ? '1px solid var(--fn-divider)' : 'none',
            verticalAlign: 'middle'
          }}>
            {c.kind === 'avatar' ?
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skel w={32} h={32} r={8} />
                <div>
                  <Skel w={120} h={12} />
                  <Skel w={160} h={10} style={{ marginTop: 6 }} />
                </div>
              </div> :
            c.kind === 'badge' ?
            <Skel w={c.w || 72} h={20} r={6} /> :

            <Skel w={c.w || '70%'} h={12} style={{ marginLeft: c.align === 'right' ? 'auto' : 0 }} />
            }
          </td>);

      })}
    </tr>);

}

function SkelTableCard({ title, cols, rows = 5 }) {
  return (
    <Card padded={false}>
      <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skel w={36} h={36} r={8} />
          <Skel w={140} h={15} />
        </div>
        <Skel w={80} h={28} r={6} />
      </div>
      <div style={{ padding: '0 14px' }}>
        <div style={{ background: 'var(--fn-bg-subtle)', borderRadius: 8, padding: '8px 0', marginTop: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              {cols.map((c, i) => <col key={i} style={c.width ? { width: c.width } : {}} />)}
            </colgroup>
            <tbody>
              <tr>
                {cols.map((c, i) => {
                  const first = i === 0;
                  const lastCol = i === cols.length - 1;
                  const padding = first ? '4px 0 4px 18px' : lastCol ? '4px 18px 4px 12px' : '4px 12px';
                  return (
                    <td key={i} style={{ padding }}>
                      <Skel w={c.headerW || 80} h={10} />
                    </td>);

                })}
              </tr>
            </tbody>
          </table>
        </div>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
          <colgroup>
            {cols.map((c, i) => <col key={i} style={c.width ? { width: c.width } : {}} />)}
          </colgroup>
          <tbody>
            {Array.from({ length: rows }).map((_, i) =>
            <SkelTableRow key={i} cols={cols} last={i === rows - 1} />
            )}
          </tbody>
        </table>
        <div style={{ height: 14 }} />
      </div>
    </Card>);

}

function SkelTimelineRow() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Skel w={32} h={32} r={8} />
        <div style={{ width: 2, height: 40, background: 'var(--fn-divider)', marginLeft: 15, marginTop: 4 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skel w={180} h={13} />
          <Skel w={60} h={20} r={6} />
        </div>
        <Skel w="80%" h={11} style={{ marginTop: 8 }} />
        <Skel w="40%" h={10} style={{ marginTop: 10 }} />
      </div>
    </div>);

}

function SkelProfileHeader() {
  return (
    <Card padded={false}>
      <div style={{ padding: 24, display: 'flex', gap: 22, alignItems: 'center' }}>
        <Skel w={84} h={84} r={18} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skel w={220} h={26} />
            <Skel w={80} h={22} r={6} />
            <Skel w={70} h={22} r={6} />
          </div>
          <Skel w={300} h={14} style={{ marginTop: 10 }} />
          <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
            <Skel w={180} h={12} />
            <Skel w={140} h={12} />
            <Skel w={140} h={12} />
          </div>
        </div>
      </div>
    </Card>);

}

// ───── States showcase screen ─────
function StatesShowcase() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SKELETON_STYLES }} />

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>Design system · States</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Empty states & loading skeletons
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
          Reusable patterns used across the app. Every list, table, dashboard widget, and detail surface has a matching skeleton + empty state so the UI never shows a bare spinner.
        </p>
      </div>

      <SectionBand label="Empty states" hint="When there's truly nothing to show — yet. Always pair a short helpful message with a primary action." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {/* Employees: no people yet (fresh tenant) */}
        <Card padded={false}>
          <CardLabel title="Employees · no people yet" />
          <EmptyState
            icon={I.users}
            title="Add your first employee"
            body="Once people are in the system, you can run commissions, send reminders, and let them log into the portal."
            primary={{ label: 'New employee', icon: I.plus }}
            secondary={{ label: 'Import CSV', icon: I.upload }}
            helpers={<span>Tip: importing a CSV is the fastest way to add 5+ people at once.</span>} />
          
        </Card>

        {/* Filter returned nothing */}
        <Card padded={false}>
          <CardLabel title="Filter · no matches" />
          <EmptyState
            icon={I.search}
            title="No employees match these filters"
            body="Try widening the search or clearing one of the active filters."
            primary={{ label: 'Clear filters', icon: I.x }}
            secondary={{ label: 'Open all employees', icon: I.users }} />
          
        </Card>

        {/* Projects: no projects this month */}
        <Card padded={false}>
          <CardLabel title="Projects · empty period" />
          <EmptyState
            icon={I.briefcase}
            title="No projects for May yet"
            body="Add a project to start tracking revenue and queueing commissions for the May 2026 run."
            primary={{ label: 'New project', icon: I.plus }}
            secondary={{ label: 'See last month', icon: I.clock }} />
          
        </Card>

        {/* Commissions: nothing to approve */}
        <Card padded={false}>
          <CardLabel title="Commissions · all caught up" />
          <EmptyState
            illustration={
            <div style={{
              width: 36, height: 36, borderRadius: 8, marginBottom: 12,
              background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icon d={I.check} size={16} stroke={2.2} />
              </div>
            }
            title="You're all caught up"
            body="No commission runs are awaiting your approval. The next monthly run locks in 16 days."
            secondary={{ label: 'View past runs', icon: I.clock }} />
          
        </Card>

        {/* Timeline: brand new employee */}
        <Card padded={false}>
          <CardLabel title="Profile timeline · new joiner" />
          <EmptyState
            icon={I.clock}
            title="Nothing has happened yet"
            body="Hassan joined this week. Commission runs, evaluations, and salary changes will appear here as they happen."
            primary={{ label: 'Log custom event', icon: I.plus }} />
          
        </Card>

        {/* Documents */}
        <Card padded={false}>
          <CardLabel title="Documents · none uploaded" />
          <EmptyState
            icon={I.doc}
            title="No documents on file"
            body="Drop in the signed offer letter, contract, CNIC, and bank details."
            primary={{ label: 'Upload', icon: I.upload }}
            helpers={<span>Drag a file anywhere on this page to upload. PDF, JPG, PNG, max 10 MB.</span>} />
          
        </Card>

        {/* Permission denied */}
        <Card padded={false}>
          <CardLabel title="Access · permission denied" tone="warning" />
          <EmptyState
            illustration={
            <div style={{
              width: 36, height: 36, borderRadius: 8, marginBottom: 12,
              background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icon d={I.lock} size={15} stroke={1.8} />
              </div>
            }
            title="You don't have access to this"
            body="Salary history requires the HR Admin role. Ask Asma Ali to grant you the commissions:override permission."
            primary={{ label: 'Request access', icon: I.send }}
            secondary={{ label: 'Back to profile', icon: I.chevL }} />
          
        </Card>

        {/* Error / network failure */}
        <Card padded={false}>
          <CardLabel title="Error · couldn't load" tone="danger" />
          <EmptyState
            illustration={
            <div style={{
              width: 36, height: 36, borderRadius: 8, marginBottom: 12,
              background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={15} stroke={1.9} />
              </div>
            }
            title="Couldn't load the dashboard"
            body="Network request timed out. Check your connection — if this keeps happening, let IT know."
            primary={{ label: 'Retry', icon: I.arrowR }}
            secondary={{ label: 'Status page', icon: I.globe }}
            helpers={<span style={{ fontFamily: 'var(--fn-font-mono)' }}>err_id · fnt_8a3f9c · 14:42:18 PKT</span>} />
          
        </Card>
      </div>

      <SectionBand label="Loading skeletons" hint="What every async surface shows on first paint — match the final shape so the UI doesn't shift." />

      {/* KPI strip skeleton */}
      <div style={{ marginBottom: 16 }}>
        <SubLabel>KPI strip · loading</SubLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <SkelKPI /><SkelKPI /><SkelKPI /><SkelKPI />
        </div>
      </div>

      {/* Chart + sidebar */}
      <div style={{ marginBottom: 16 }}>
        <SubLabel>Dashboard widget · loading</SubLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <SkelChartCard />
          <Card padded={false}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skel w={36} h={36} r={8} />
              <Skel w={140} h={15} />
            </div>
            <div style={{ padding: '0 22px 18px' }}>
              {Array.from({ length: 4 }).map((_, i) =>
              <div key={i} style={{
                padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 3 ? '1px solid var(--fn-divider)' : 'none'
              }}>
                  <Skel w={32} h={32} r={8} />
                  <div style={{ flex: 1 }}>
                    <Skel w={140} h={12} />
                    <Skel w={180} h={10} style={{ marginTop: 6 }} />
                  </div>
                  <Skel w={64} h={12} />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Table skeleton */}
      <div style={{ marginBottom: 16 }}>
        <SubLabel>Data table · loading</SubLabel>
        <SkelTableCard
          cols={[
          { kind: 'avatar', headerW: 80 },
          { kind: 'text', headerW: 80, w: 110 },
          { kind: 'text', headerW: 80, w: 100 },
          { kind: 'badge', headerW: 60, w: 80 },
          { kind: 'text', headerW: 80, align: 'right', w: 110, width: 130 }]
          }
          rows={5} />
        
      </div>

      {/* Profile + timeline */}
      <div style={{ marginBottom: 16 }}>
        <SubLabel>Profile page · loading</SubLabel>
        <SkelProfileHeader />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 16 }}>
          <Card padded={false}>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skel w={36} h={36} r={8} />
              <Skel w={140} h={15} />
            </div>
            <div style={{ padding: '0 22px 18px' }}>
              <SkelTimelineRow />
              <SkelTimelineRow />
              <SkelTimelineRow />
              <SkelTimelineRow />
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card padded={false}>
              <div style={{ padding: '18px 22px 14px' }}>
                <Skel w={140} h={14} />
                <Skel w={180} h={28} style={{ marginTop: 14 }} />
                <Skel w={120} h={11} style={{ marginTop: 10 }} />
              </div>
              <div style={{ padding: '0 22px 18px' }}>
                {Array.from({ length: 3 }).map((_, i) =>
                <div key={i} style={{
                  padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12,
                  borderTop: i > 0 ? '1px solid var(--fn-divider)' : 'none'
                }}>
                    <Skel w={50} h={20} r={6} />
                    <div style={{ flex: 1 }}>
                      <Skel w="80%" h={12} />
                      <Skel w="60%" h={10} style={{ marginTop: 6 }} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div style={{
        padding: 14, borderRadius: 8, marginTop: 8,
        background: 'var(--fn-bg-subtle)', border: '1px dashed var(--fn-border-strong)',
        fontSize: 12, color: 'var(--fn-fg-muted)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <Icon d={I.shield} size={14} style={{ color: 'var(--fn-fg-faint)' }} />
        Skeletons shimmer at <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>1.8s linear infinite</span> — never block interaction. If a request takes &gt; 6s, swap to the matching empty state with a Retry action.
      </div>
    </>);

}

function SectionBand({ label, hint }) {
  return (
    <div style={{ marginTop: 6, marginBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--fn-divider)', paddingBottom: 10 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)' }}>Section</div>
        <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fn-fg)' }}>{label}</h2>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fn-fg-muted)', maxWidth: 480, textAlign: 'right' }}>{hint}</p>
    </div>);

}

function SubLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
      color: 'var(--fn-fg-faint)', marginBottom: 10
    }}>
      {children}
    </div>);

}

function CardLabel({ title, tone }) {
  const colors = {
    warning: 'var(--fn-warning-soft-fg)',
    danger: 'var(--fn-danger-soft-fg)'
  };
  return (
    <div style={{
      padding: '10px 16px', borderBottom: '1px solid var(--fn-divider)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--fn-bg-subtle)',
      borderRadius: '10px 10px 0 0'
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
        color: tone ? colors[tone] : 'var(--fn-fg-faint)'
      }}>
        {title}
      </span>
      <Icon d={I.more} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
    </div>);

}

window.StatesShowcase = StatesShowcase;