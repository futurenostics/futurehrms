// Employee profile — header w/ identity + meta strip; tabs; body grid.
// Compact redesign: prominent identity, quick-stat strip, clean timeline.

function EmployeeProfile({ currency = 'USD' }) {
  const emp = {
    name: 'Bilal Rauf', eid: 'EMP-0042',
    desig: 'Senior Software Engineer', dept: 'Engineering',
    status: 'Permanent', join: '12 Aug 2023', tenure: '2 yrs 9 mo',
    email: 'bilal.rauf@futurenostics.com', phone: '+92 321 4438219',
    manager: 'Talha Mansoor', location: 'Karachi · Hybrid',
    salaryPkr: 285000, contract: 'Full-time',
  };

  const fmtSalary = () =>
    currency === 'USD' ? `$${Math.round(emp.salaryPkr / 278.5).toLocaleString()}`
                       : `₨${emp.salaryPkr.toLocaleString('en-PK')}`;

  const stats = [
    { l: 'Tenure', v: '2y 9m', sub: 'since 12 Aug 2023' },
    { l: 'Salary / mo', v: fmtSalary(), sub: 'Eng band 3 · +9.6% Apr' },
    { l: 'Commissions YTD', v: currency === 'USD' ? '$9,360' : '₨2.6M', sub: 'across 9 projects' },
    { l: 'Performance', v: '4.6 / 5', sub: 'last review Feb 2026' },
    { l: 'Active projects', v: '3', sub: 'Acme, Polaris, Vector' },
  ];

  return (
    <>
      <ProfileHeader emp={emp} />

      {/* Quick-stat strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 0,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        borderRadius: 10, marginBottom: 20, overflow: 'hidden',
      }}>
        {stats.map((s, i) => (
          <div key={s.l} style={{
            padding: '16px 20px', borderRight: i < stats.length - 1 ? '1px solid var(--fn-divider)' : 'none',
          }}>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontWeight: 500 }}>{s.l}</div>
            <div style={{
              marginTop: 6, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', lineHeight: 1,
            }}>{s.v}</div>
            <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <Tabs
        active="Timeline"
        items={[
          { label: 'Overview' },
          { label: 'Job & comp' },
          { label: 'Salary history', count: 3 },
          { label: 'Timeline', count: 14 },
          { label: 'Documents', count: 4 },
          { label: 'Evaluations', count: 2 },
          { label: 'Commissions', count: 9 },
        ]}
        style={{ marginBottom: 20 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <ProfileTimeline />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <CompensationCard emp={emp} currency={currency} />
          <DocumentsCard />
        </div>
      </div>
    </>
  );
}

window.EmployeeProfile = EmployeeProfile;
