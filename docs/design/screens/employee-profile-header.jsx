// Employee profile — header & subcomponents

function ProfileHeader({ emp }) {
  return (
    <div style={{
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)', borderRadius: 10,
      padding: 24, marginBottom: 14, position: 'relative',
    }}>
      {/* Top row — actions */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
        <Button variant="secondary" icon={I.mail} size="sm">Message</Button>
        <Button variant="secondary" icon={I.briefcase} size="sm">Assign project</Button>
        <Button icon={I.edit} size="sm">Edit profile</Button>
        <Button variant="secondary" size="sm" style={{ paddingInline: 9 }}><Icon d={I.more} size={14} /></Button>
      </div>

      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
        {/* Avatar with status ring */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 84, height: 84, borderRadius: 10, padding: 3,
            background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.70 0.14 175) 100%)',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: 10,
              background: 'oklch(0.94 0.06 280)', color: 'oklch(0.35 0.16 280)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em',
            }}>
              {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
          </div>
          <span style={{
            position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 99,
            background: 'var(--fn-success)', border: '3px solid var(--fn-bg-panel)',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0, fontSize: 26, fontWeight: 600,
              letterSpacing: '-0.03em', color: 'var(--fn-fg)', whiteSpace: 'nowrap',
            }}>{emp.name}</h1>
            <Badge tone="success" dot>{emp.status}</Badge>
            <Badge tone="neutral">{emp.contract}</Badge>
            <span style={{
              fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, color: 'var(--fn-fg-faint)',
              padding: '2px 7px', borderRadius: 4, background: 'var(--fn-bg-inset)',
            }}>{emp.eid}</span>
          </div>
          <div style={{ marginTop: 6, color: 'var(--fn-fg-muted)', fontSize: 14.5, fontWeight: 500 }}>
            {emp.desig} · {emp.dept}
          </div>

          <div style={{ display: 'flex', gap: 22, marginTop: 16, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
            <ProfileMeta icon={I.mail} value={emp.email} mono />
            <ProfileMeta icon="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
              value={emp.phone} mono />
            <ProfileMeta icon={I.user} value={`Reports to ${emp.manager}`} />
            <ProfileMeta icon="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
              value={emp.location} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileMeta({ icon, value, mono }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <Icon d={icon} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
      <span style={{
        color: 'var(--fn-fg)', fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
        fontSize: mono ? 12.5 : 13, fontWeight: mono ? 500 : 500,
      }}>{value}</span>
    </span>
  );
}

Object.assign(window, { ProfileHeader, ProfileMeta });
