// Shared app chrome: Sidebar (two variants) and Topbar.
// Each artboard renders a full-bleed AppShell with these.

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: I.home, path: '/' },
    ],
  },
  {
    label: 'HR Core',
    items: [
      { key: 'employees', label: 'Employees', icon: I.users, path: '/employees', count: 84 },
      { key: 'org', label: 'Org Chart', icon: I.layers, path: '/employees/org' },
      { key: 'departments', label: 'Departments', icon: I.building, path: '/settings/departments' },
    ],
  },
  {
    label: 'Commission & Payroll',
    items: [
      { key: 'projects', label: 'Projects', icon: I.briefcase, path: '/projects', count: 23 },
      { key: 'processing', label: 'Monthly Processing', icon: I.calc, path: '/commissions/processing' },
      { key: 'approvals', label: 'Approvals', icon: I.check, path: '/commissions/approvals', badge: '2' },
      { key: 'rules', label: 'Commission Rules', icon: I.scale, path: '/commissions/rules' },
      { key: 'payroll', label: 'Payouts', icon: I.card, path: '/payroll' },
    ],
  },
  {
    label: 'Reminders & Reviews',
    items: [
      { key: 'hr-rules', label: 'Reminder Rules', icon: I.bell2, path: '/hr/rules' },
      { key: 'evaluations', label: 'Evaluations', icon: I.star, path: '/hr/evaluations', badge: '4' },
      { key: 'reports', label: 'Reports', icon: I.chart, path: '/reports' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: 'roles', label: 'Roles & Permissions', icon: I.shield, path: '/settings/roles' },
      { key: 'general', label: 'General', icon: I.cog, path: '/settings' },
    ],
  },
];

function Logo({ size = 18, variant = 'full' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: size + 6, height: size + 6, borderRadius: 6,
        background: 'var(--fn-fg)', color: 'var(--fn-fg-invert)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.62, fontWeight: 600, letterSpacing: '-0.05em',
        fontFamily: 'var(--fn-font-display)', position: 'relative',
      }}>
        <span style={{ transform: 'translateY(-0.5px)' }}>F</span>
        <span style={{
          position: 'absolute', right: 2, bottom: 2, width: 4, height: 4,
          background: 'var(--fn-accent)', borderRadius: 99,
        }} />
      </div>
      {variant === 'full' && (
        <span style={{
          fontSize: size, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)',
        }}>
          Futurenostics
        </span>
      )}
    </div>
  );
}

function SidebarItem({ item, active, variant = 'full' }) {
  const isActive = active === item.key;
  if (variant === 'rail') {
    return (
      <div title={item.label} style={{
        width: 36, height: 36, borderRadius: 6, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: isActive ? 'var(--fn-accent-soft)' : 'transparent',
        color: isActive ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
        position: 'relative',
      }}>
        <Icon d={item.icon} size={17} />
        {item.badge && (
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 7, height: 7,
            background: 'var(--fn-accent)', borderRadius: 99,
            border: '1.5px solid var(--fn-bg)',
          }} />
        )}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, height: 40,
      padding: '0 18px 0 22px', fontSize: 13.5,
      background: isActive ? 'var(--fn-accent-soft)' : 'transparent',
      color: isActive ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
      fontWeight: isActive ? 600 : 500, letterSpacing: '-0.005em',
      position: 'relative', cursor: 'pointer',
    }}>
      {isActive && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
          background: 'var(--fn-accent)', borderRadius: '0 3px 3px 0',
        }} />
      )}
      <Icon d={item.icon} size={17} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.85 }} />
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
      {item.count != null && (
        <span style={{
          fontSize: 11, color: 'var(--fn-fg-faint)', fontVariantNumeric: 'tabular-nums',
        }}>{item.count}</span>
      )}
      {item.badge && (
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
          background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
        }}>{item.badge}</span>
      )}
      {item.expandable && (
        <Icon d={I.chevR} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
      )}
    </div>
  );
}

function Sidebar({ active = 'dashboard', variant = 'full', user }) {
  const [collapsed, setCollapsed] = React.useState(variant === 'rail');
  const isRail = collapsed;

  return (
    <aside style={{
      width: isRail ? 64 : 240, background: 'var(--fn-bg-subtle)',
      borderRight: '1px solid var(--fn-border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'relative', transition: 'width .18s ease',
    }}>
      {/* Collapse toggle — sits on the right edge of the sidebar */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute', top: 22, right: -12, width: 24, height: 24,
          borderRadius: 99, background: 'var(--fn-bg-panel)',
          border: '1px solid var(--fn-border-strong)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-fg-muted)', cursor: 'pointer', zIndex: 2,
          boxShadow: 'var(--fn-shadow-sm)', padding: 0,
        }}
      >
        <Icon d={isRail ? I.chevR : I.chevL} size={13} />
      </button>

      <div style={{
        padding: isRail ? '18px 0 14px' : '18px 22px 14px',
        display: 'flex', alignItems: 'center',
        justifyContent: isRail ? 'center' : 'space-between',
      }}>
        <Logo size={18} variant={isRail ? 'mark' : 'full'} />
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0 8px' }}>
        {navGroups.flatMap(g => g.items).map(it => (
          isRail
            ? <SidebarRailItem key={it.key} item={it} active={active} />
            : <SidebarItem key={it.key} item={{ ...it, expandable: ['employees', 'projects', 'processing', 'hr-rules', 'reports', 'roles'].includes(it.key) }} active={active} />
        ))}
      </nav>

      <div style={{
        padding: isRail ? '14px 0' : '14px 22px',
        borderTop: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: isRail ? 'center' : 'flex-start',
      }}>
        <Avatar name={user?.name || 'Asma Ali'} size={32} />
        {!isRail && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Asma Ali'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{user?.role || 'HR Admin'}</div>
            </div>
            <Icon d={I.cog} size={14} style={{ color: 'var(--fn-fg-faint)' }} />
          </>
        )}
      </div>
    </aside>
  );
}

// Compact rail-mode row — icon centered in the 64px sidebar
function SidebarRailItem({ item, active }) {
  const isActive = active === item.key;
  return (
    <div title={item.label} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 40, position: 'relative', cursor: 'pointer',
      color: isActive ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
      background: isActive ? 'var(--fn-accent-soft)' : 'transparent',
    }}>
      {isActive && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
          background: 'var(--fn-accent)', borderRadius: '0 3px 3px 0',
        }} />
      )}
      <Icon d={item.icon} size={18} />
      {item.badge && (
        <span style={{
          position: 'absolute', top: 6, right: 12, width: 7, height: 7,
          background: 'var(--fn-accent)', borderRadius: 99,
          border: '1.5px solid var(--fn-bg-subtle)',
        }} />
      )}
    </div>
  );
}

// Topbar with breadcrumbs, currency toggle, notifications, user
function Topbar({ crumbs = [], actions, currency = 'USD', hideSearch }) {
  return (
    <header style={{
      height: 52, borderBottom: '1px solid var(--fn-border)',
      background: 'var(--fn-bg-panel)', padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === crumbs.length - 1 ? 'var(--fn-fg)' : 'var(--fn-fg-muted)', fontWeight: i === crumbs.length - 1 ? 500 : 400 }}>{c}</span>
            {i < crumbs.length - 1 && <Icon d={I.chevR} size={13} style={{ color: 'var(--fn-fg-faint)' }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      {!hideSearch && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          borderRadius: 7, fontSize: 12.5, color: 'var(--fn-fg-muted)', width: 240, height: 32,
        }}>
          <Icon d={I.search} size={13} />
          <span style={{ flex: 1 }}>Search</span>
          <Kbd>⌘K</Kbd>
        </div>
      )}
      {/* Currency toggle */}
      <div style={{
        display: 'flex', background: 'var(--fn-bg-subtle)',
        border: '1px solid var(--fn-border)', borderRadius: 7, padding: 2,
      }}>
        {['USD', 'PKR'].map(c => (
          <span key={c} style={{
            padding: '4px 10px', fontSize: 11.5, fontWeight: 600,
            fontFamily: 'var(--fn-font-mono)', letterSpacing: '0.02em', borderRadius: 5,
            background: c === currency ? 'var(--fn-bg-panel)' : 'transparent',
            color: c === currency ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
            boxShadow: c === currency ? 'var(--fn-shadow-xs)' : 'none',
          }}>{c}</span>
        ))}
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)', position: 'relative' }}>
        <Icon d={I.bell} size={16} />
        <span style={{
          position: 'absolute', top: 7, right: 8, width: 7, height: 7,
          background: 'var(--fn-accent)', borderRadius: 99, border: '1.5px solid var(--fn-bg-panel)',
        }} />
      </div>
      {actions}
    </header>
  );
}

// Full app shell that pages compose
function AppShell({ children, active, sidebarVariant = 'full', topbar, user }) {
  return (
    <div style={{ display: 'flex', minHeight: '100%', width: '100%', background: 'var(--fn-bg)' }}>
      <Sidebar active={active} variant={sidebarVariant} user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {topbar}
        <main style={{ flex: 1, padding: 28, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, AppShell, Logo, navGroups });
