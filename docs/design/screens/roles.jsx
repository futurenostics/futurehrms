// Roles & Permissions — data-driven from module manifests
function RolesPermissions() {
  const roles = [
    { name: 'Super Admin', slug: 'super_admin', system: true, users: 2, color: 'oklch(0.58 0.16 25)' },
    { name: 'HR Admin', slug: 'hr_admin', system: true, users: 3, color: 'oklch(0.70 0.14 65)', active: true },
    { name: 'Finance Manager', slug: 'finance_manager', system: true, users: 2, color: 'oklch(0.62 0.11 145)' },
    { name: 'Department Manager', slug: 'department_manager', system: true, users: 8, color: 'oklch(0.60 0.12 280)' },
    { name: 'Team Lead', slug: 'team_lead', system: true, users: 14, color: 'oklch(0.62 0.11 200)' },
    { name: 'Employee', slug: 'employee', system: true, users: 55, color: 'oklch(0.62 0.018 75)' },
  ];

  const modules = [
    {
      key: 'commissions', label: 'Commissions',
      perms: [
        { key: 'view', desc: 'View commission runs', granted: true },
        { key: 'process', desc: 'Initiate monthly processing', granted: false },
        { key: 'approve', desc: 'Approve a monthly run', granted: false },
        { key: 'disburse', desc: 'Trigger disbursement & emails', granted: false },
        { key: 'override', desc: 'Override calculated amounts', granted: false },
        { key: 'hold_project', desc: 'Place a project on payment hold', granted: false },
      ],
    },
    {
      key: 'employees', label: 'Employees',
      perms: [
        { key: 'view', desc: 'View employee directory', granted: true },
        { key: 'create', desc: 'Create new employees', granted: true },
        { key: 'edit', desc: 'Edit profiles, salary, status', granted: true },
        { key: 'delete', desc: 'Soft-delete employees', granted: true },
        { key: 'import', desc: 'Bulk CSV import', granted: true },
        { key: 'export', desc: 'Export to CSV / Excel', granted: true },
      ],
    },
    {
      key: 'hr-rules', label: 'HR Rules & Reminders',
      perms: [
        { key: 'view', desc: 'View reminder rules', granted: true },
        { key: 'edit', desc: 'Create / edit / disable rules', granted: true },
        { key: 'send_manual', desc: 'Send manual reminders', granted: true },
        { key: 'scheduler', desc: 'Manage scheduler / dry-run', granted: true },
      ],
    },
    {
      key: 'evaluations', label: 'Evaluations',
      perms: [
        { key: 'view', desc: 'View evaluation results', granted: true },
        { key: 'template_edit', desc: 'Build / edit templates', granted: true },
        { key: 'send', desc: 'Send evaluations to managers', granted: true },
        { key: 'submit', desc: 'Submit evaluation responses', granted: false, scope: 'self' },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Permissions are registered by each module at boot. Roles attach them. System roles cannot be deleted but can be edited."
        kicker="Settings"
        actions={<>
          <Button variant="secondary" icon={I.download}>Export matrix</Button>
          <Button icon={I.plus}>New role</Button>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Roles sidebar */}
        <Card padded={false}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--fn-divider)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Roles</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>6 system · 0 custom</div>
          </div>
          {roles.map((r, i) => (
            <div key={r.slug} style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i > 0 ? '1px solid var(--fn-divider)' : 'none',
              background: r.active ? 'var(--fn-accent-soft)' : 'transparent',
              borderLeft: r.active ? '3px solid var(--fn-accent)' : '3px solid transparent',
              paddingLeft: r.active ? 13 : 16,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: r.active ? 600 : 500, color: r.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{r.slug}</div>
              </div>
              {r.system && <Badge tone="outline" style={{ fontSize: 10 }}>system</Badge>}
              <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>{r.users}</span>
            </div>
          ))}
        </Card>

        {/* Detail view of selected role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card padded={false}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--fn-divider)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, background: 'oklch(0.70 0.14 65)', borderRadius: 99 }} />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>HR Admin</h2>
                  <Badge tone="outline">system role</Badge>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
                  Full HR module access: employees, hr-rules, evaluations, timeline, salary-history, departments, designations.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" icon={I.users}>3 members</Button>
                <Button variant="secondary" size="sm" icon={I.edit}>Edit details</Button>
              </div>
            </div>

            {/* Counts */}
            <div style={{ padding: '14px 22px', display: 'flex', gap: 32, fontSize: 12.5, color: 'var(--fn-fg-muted)', borderBottom: '1px solid var(--fn-divider)' }}>
              <span><strong style={{ color: 'var(--fn-fg)' }}>23</strong> permissions granted</span>
              <span><strong style={{ color: 'var(--fn-fg)' }}>14</strong> permissions denied</span>
              <span><strong style={{ color: 'var(--fn-fg)' }}>1</strong> scoped permission</span>
              <span style={{ marginLeft: 'auto' }}>Scope: <strong style={{ color: 'var(--fn-fg)' }}>Global</strong></span>
            </div>

            {/* Permission groups */}
            {modules.map((m, mi) => {
              const grantedCount = m.perms.filter(p => p.granted).length;
              return (
                <div key={m.key} style={{ borderTop: mi > 0 ? '1px solid var(--fn-divider)' : 'none' }}>
                  <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fn-bg-subtle)' }}>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{m.key}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      {grantedCount} / {m.perms.length} granted
                    </span>
                  </div>
                  <div>
                    {m.perms.map((p, pi) => (
                      <div key={p.key} style={{
                        padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 14,
                        borderTop: pi > 0 ? '1px solid var(--fn-divider)' : 'none',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, padding: '1px 7px', background: 'var(--fn-bg-inset)', borderRadius: 4, color: 'var(--fn-fg-muted)' }}>
                              {m.key}:{p.key}
                            </span>
                            {p.scope && <Badge tone="info">scope: {p.scope}</Badge>}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 4 }}>{p.desc}</div>
                        </div>
                        <PermSwitch on={p.granted} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Manifest hint */}
          <div style={{
            padding: '12px 16px', background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
            borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--fn-fg-muted)',
          }}>
            <Icon d={I.shield} size={14} />
            Permissions are registered automatically by each module's manifest at boot. To add a new permission, edit the corresponding <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>module.manifest.ts</span> and re-deploy.
          </div>
        </div>
      </div>
    </>
  );
}

function PermSwitch({ on }) {
  return (
    <span style={{
      width: 38, height: 22, background: on ? 'var(--fn-success)' : 'var(--fn-bg-inset)',
      border: on ? 'none' : '1px solid var(--fn-border-strong)',
      borderRadius: 99, position: 'relative', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: on ? 2 : 1, left: on ? 18 : 1,
        width: on ? 18 : 18, height: on ? 18 : 18, background: '#fff',
        borderRadius: 99, boxShadow: '0 1px 2px rgba(0,0,0,.15)',
      }} />
    </span>
  );
}

window.RolesPermissions = RolesPermissions;
