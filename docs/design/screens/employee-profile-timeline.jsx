// Employee profile — Activity timeline (redesigned)

function ProfileTimeline() {
  const timeline = [
    {
      date: '14 May 2026', mod: 'Commissions', icon: I.card, tone: 'success',
      title: 'April commission disbursed',
      detail: '3 projects · paid to Payoneer',
      amount: '+$1,840', actor: 'System', latest: true,
    },
    {
      date: '02 May 2026', mod: 'HR', icon: I.star, tone: 'accent',
      title: 'Annual review scheduled',
      detail: 'Reviewer Talha Mansoor · self-assessment sent',
      tag: 'Due 21 May', tagTone: 'warning', actor: 'Asma Ali',
    },
    {
      date: '18 Apr 2026', mod: 'Projects', icon: I.briefcase, tone: 'info',
      title: 'Assigned to Acme Web Refresh',
      detail: 'Project Communicator · External',
      meta: 'est. $4,800 commission', actor: 'Talha Mansoor',
    },
    {
      date: '01 Apr 2026', mod: 'HR', icon: I.arrowU, tone: 'success',
      title: 'Salary increment applied',
      detail: '₨260,000 → ₨285,000',
      amount: '+9.6%', actor: 'Asma Ali',
    },
    {
      date: '15 Feb 2026', mod: 'HR', icon: I.check, tone: 'success',
      title: 'Probation → Permanent',
      detail: 'Probation review passed unanimously',
      actor: 'Asma Ali',
    },
    {
      date: '12 Aug 2023', mod: 'HR', icon: I.flag, tone: 'neutral',
      title: 'Joined Futurenostics',
      detail: 'Engineering · Engineer · 6mo probation',
      actor: 'System',
    },
  ];

  // Group entries by month label for subtle dividers
  const groups = [];
  let lastMonth = null;
  timeline.forEach((t, i) => {
    const month = t.date.split(' ').slice(1).join(' '); // "May 2026"
    if (month !== lastMonth) {
      groups.push({ type: 'header', label: month });
      lastMonth = month;
    }
    groups.push({ type: 'item', item: t, idx: i });
  });

  return (
    <Card padded={false}>
      <SectionHeader
        icon={I.clock}
        title="Activity timeline"
        badge={<Badge tone="neutral">14</Badge>}
        right={
          <div style={{ display: 'flex', gap: 2, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
            {['All', 'HR', 'Commissions', 'Projects'].map((t, i) => (
              <span key={t} style={{
                padding: '5px 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 4,
                color: i === 0 ? 'var(--fn-fg)' : 'var(--fn-fg-muted)',
                background: i === 0 ? 'var(--fn-bg-panel)' : 'transparent',
                boxShadow: i === 0 ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer',
              }}>{t}</span>
            ))}
          </div>
        }
      />

      <div style={{ padding: '0 22px 22px', position: 'relative' }}>
        {/* Continuous left rail */}
        <div style={{
          position: 'absolute', top: 4, bottom: 22, left: 39, width: 2,
          background: 'var(--fn-border)', borderRadius: 99,
        }} />

        {groups.map((g, gi) => {
          if (g.type === 'header') {
            return (
              <div key={`h-${gi}`} style={{
                paddingLeft: 60, paddingTop: gi === 0 ? 6 : 18, paddingBottom: 10,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.10em', color: 'var(--fn-fg-faint)',
                position: 'relative',
              }}>
                {g.label}
              </div>
            );
          }
          const t = g.item;
          return (
            <div key={`i-${g.idx}`} style={{
              display: 'flex', gap: 16, alignItems: 'stretch',
              padding: '2px 0 14px', position: 'relative',
            }}>
              {/* Icon bubble */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `var(--fn-${t.tone === 'accent' ? 'accent' : t.tone}-soft)`,
                color: `var(--fn-${t.tone === 'accent' ? 'accent' : t.tone}-soft-fg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--fn-bg-panel)',
                outline: '1px solid var(--fn-border)', outlineOffset: -3,
                position: 'relative', zIndex: 1,
                marginTop: 4, marginLeft: 7,
              }}>
                <Icon d={t.icon} size={14} />
              </div>

              {/* Body card */}
              <div style={{
                flex: 1, minWidth: 0,
                padding: '12px 14px', borderRadius: 8,
                background: t.latest ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
                border: '1px solid ' + (t.latest ? 'color-mix(in oklch, var(--fn-accent) 25%, transparent)' : 'var(--fn-border)'),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.005em' }}>
                        {t.title}
                      </span>
                      <Badge tone={t.mod === 'Commissions' ? 'success' : t.mod === 'Projects' ? 'info' : t.mod === 'HR' ? 'accent' : 'neutral'}>
                        {t.mod}
                      </Badge>
                      {t.latest && <Badge tone="accent" dot>Latest</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 4 }}>
                      {t.detail}
                      {t.meta && <span style={{ color: 'var(--fn-fg-faint)' }}> · {t.meta}</span>}
                    </div>
                  </div>
                  {(t.amount || t.tag) && (
                    <div style={{ flexShrink: 0 }}>
                      {t.amount && (
                        <span style={{
                          fontFamily: 'var(--fn-font-mono)', fontSize: 14, fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                          color: 'var(--fn-success-soft-fg)',
                          padding: '4px 10px', borderRadius: 6,
                          background: 'var(--fn-success-soft)',
                          border: '1px solid color-mix(in oklch, var(--fn-success) 25%, transparent)',
                          display: 'inline-block',
                        }}>
                          {t.amount}
                        </span>
                      )}
                      {t.tag && <Badge tone={t.tagTone || 'warning'}>{t.tag}</Badge>}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
                  paddingTop: 10, borderTop: '1px dashed var(--fn-border)',
                  fontSize: 11.5, color: 'var(--fn-fg-faint)',
                }}>
                  <Icon d={I.clock} size={11} />
                  <span style={{ fontFamily: 'var(--fn-font-mono)' }}>{t.date}</span>
                  <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--fn-fg-faint)' }} />
                  <span>by <strong style={{ color: 'var(--fn-fg-muted)', fontWeight: 600 }}>{t.actor}</strong></span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Load more */}
        <div style={{ paddingLeft: 60, marginTop: 4 }}>
          <button style={{
            padding: '8px 14px', fontSize: 12.5, fontWeight: 500,
            color: 'var(--fn-fg-muted)', background: 'transparent',
            border: '1px solid var(--fn-border-strong)', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon d={I.arrowD} size={12} />
            Show 8 earlier events
          </button>
        </div>
      </div>
    </Card>
  );
}

window.ProfileTimeline = ProfileTimeline;
