// Brief 2 — Overtime Rules editor
// Two surfaces:
//   - List view: rules grouped by Overtime Type
//   - Editor sheet: full rule configuration with live overlap warning + compensation preview

const OT_RULES = [
  {
    id: 'r-eng-wknd', name: 'Engineering — Weekend OT',
    typeId: 'ot-weekend', typeName: 'Weekend Work', typeHue: 175,
    scope: ['Engineering', 'Senior+', 'All projects'],
    trigger: 'Weekend work',
    rate: '150% of hourly · PKR',
    channel: 'pkr_payroll', status: 'Active', updated: '3 days ago', priority: 100, v: 3,
  },
  {
    id: 'r-eng-night', name: 'Engineering — Night Window',
    typeId: 'ot-night', typeName: 'Night Shift', typeHue: 245,
    scope: ['Engineering', 'All designations'],
    trigger: '22:00 → 06:00',
    rate: '175% of hourly · PKR',
    channel: 'pkr_payroll', status: 'Active', updated: '2 weeks ago', priority: 100, v: 1,
  },
  {
    id: 'r-eng-emerg', name: 'Engineering — Project Emergency',
    typeId: 'ot-emergency', typeName: 'Project Emergency', typeHue: 65,
    scope: ['Engineering', 'All', 'Acme · Polaris · Sterling'],
    trigger: 'Manual only',
    rate: 'PKR 2,500 / hour',
    channel: 'usd_payoneer', status: 'Active', updated: 'last week', priority: 200, v: 2,
  },
  {
    id: 'r-bd-wknd', name: 'BD — Weekend Client Calls',
    typeId: 'ot-weekend', typeName: 'Weekend Work', typeHue: 175,
    scope: ['Business Dev', 'BD Lead+'],
    trigger: 'Weekend work',
    rate: '125% of hourly · PKR',
    channel: 'comp_off_leave', status: 'Active', updated: '1 month ago', priority: 100, v: 1,
  },
  {
    id: 'r-ops-holiday', name: 'Ops — Public Holiday',
    typeId: 'ot-holiday', typeName: 'Public Holiday Work', typeHue: 22,
    scope: ['Operations', 'All'],
    trigger: 'Public holiday',
    rate: '200% of hourly · PKR',
    channel: 'pkr_payroll', status: 'Scheduled', updated: '1 day ago', priority: 100, v: 1,
  },
  {
    id: 'r-eng-oncall', name: 'Engineering — On-Call Standby',
    typeId: 'ot-oncall', typeName: 'On-Call', typeHue: 145,
    scope: ['Engineering', 'Senior+'],
    trigger: 'On-call',
    rate: 'PKR 8,000 / occurrence',
    channel: 'pkr_payroll', status: 'Inactive', updated: '2 months ago', priority: 100, v: 4,
  },
];

const CHANNEL_META = {
  pkr_payroll: { label: 'PKR Payroll', hue: 175, icon: I.card },
  usd_payoneer: { label: 'USD Payoneer', hue: 145, icon: I.globe },
  comp_off_leave: { label: 'Comp-Off Leave', hue: 280, icon: I.clock },
};

function OvertimeRules({ openEditor = false }) {
  // Group rules by type
  const groups = {};
  OT_RULES.forEach(r => {
    if (!groups[r.typeId]) groups[r.typeId] = { id: r.typeId, name: r.typeName, hue: r.typeHue, rules: [] };
    groups[r.typeId].rules.push(r);
  });

  return (
    <>
      <SettingsBreadcrumb section="Time & Attendance" active="Overtime Rules" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Overtime Rules
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            Define what counts as overtime and how it's paid. Rules are versioned — editing one creates a new version, historical entries keep their snapshot.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
          <ToolbarPill icon={I.clock}>Version history</ToolbarPill>
          <Button icon={I.plus}>Add rule</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.scale} label="Active rules" value={OT_RULES.filter(r => r.status === 'Active').length} sub="across 5 OT types" info={false} />
        <KPI icon={I.card} label="PKR-routed" value="3" sub="paid in PKR payroll run" info={false} />
        <KPI icon={I.globe} label="USD-routed" value="1" sub="added to Payoneer run" info={false} />
        <KPI icon={I.clock} label="Comp-off routed" value="1" sub="credited to leave ledger" info={false} />
      </div>

      {/* Filters */}
      <div style={{
        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
      }}>
        <Input icon={I.search} placeholder="Find rule by name, scope, type…" style={{ height: 32, flex: 1, maxWidth: 320 }} />
        <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Channel: All</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{OT_RULES.length} rules · {Object.keys(groups).length} types</span>
      </div>

      {/* Grouped rule list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.values(groups).map(g => (
          <Card key={g.id} padded={false}>
            <div style={{
              padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid var(--fn-divider)',
            }}>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)', transform: 'rotate(180deg)' }} />
              <span style={{
                width: 12, height: 12, borderRadius: 3,
                background: `oklch(0.55 0.16 ${g.hue})`,
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.01em' }}>{g.name}</span>
              <Badge tone="neutral">{g.rules.length}</Badge>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>+ Add rule to this type</span>
            </div>

            {g.rules.map((r, i) => {
              const ch = CHANNEL_META[r.channel];
              return (
                <div key={r.id} style={{
                  padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 16,
                  borderBottom: i < g.rules.length - 1 ? '1px solid var(--fn-divider)' : 'none',
                  background: r.id === 'r-eng-wknd' && openEditor ? 'var(--fn-accent-soft)' : 'transparent',
                }}>
                  <div style={{ minWidth: 0, width: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{r.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>v{r.v}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {r.scope.map(s => (
                        <span key={s} style={{
                          fontSize: 10.5, padding: '1px 7px', borderRadius: 4,
                          background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', fontWeight: 500,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--fn-fg)' }}>{r.trigger}</div>
                    <div style={{ marginTop: 2, fontFamily: 'var(--fn-font-mono)', fontSize: 12 }}>{r.rate}</div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    background: `oklch(0.95 0.04 ${ch.hue})`,
                    color: `oklch(0.40 0.13 ${ch.hue})`,
                    border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${ch.hue}) 30%, transparent)`,
                    fontSize: 11.5, fontWeight: 600,
                  }}>
                    <Icon d={ch.icon} size={11} /> {ch.label}
                  </span>
                  <Badge tone={r.status === 'Active' ? 'success' : r.status === 'Scheduled' ? 'info' : 'neutral'} dot>
                    {r.status}
                  </Badge>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', width: 80, textAlign: 'right' }}>{r.updated}</span>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--fn-fg-faint)',
                  }}>
                    <Icon d={I.more} size={15} />
                  </span>
                </div>
              );
            })}
          </Card>
        ))}
      </div>

      {openEditor && <RuleEditorSheet />}
    </>
  );
}

// ─── The big editor sheet ───
function RuleEditorSheet() {
  return (
    <>
      {/* Backdrop within artboard */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50,
      }} />
      {/* Sheet on the right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 700, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Sticky header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.edit} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input defaultValue="Engineering — Weekend OT" style={{ height: 38, fontWeight: 600, fontSize: 14 }} />
            <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
              Editing version 3 · changes will create v4 on save · effective today
            </div>
          </div>
          <span style={{
            width: 32, height: 32, borderRadius: 6, cursor: 'pointer', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fn-fg-muted)',
          }}>
            <Icon d={I.x} size={16} />
          </span>
        </div>

        {/* Overlap warning */}
        <div style={{
          margin: '14px 24px 0', padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-warning-soft)',
          border: '1px solid color-mix(in oklch, var(--fn-warning) 30%, transparent)',
          display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0,
        }}>
          <Icon
            d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            size={15} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2, flexShrink: 0 }}
          />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 700 }}>Overlap with 1 existing rule.</strong> This scope + trigger overlaps with{' '}
            <span style={{ color: 'var(--fn-fg)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Engineering — Night Window</span>.
            Under <strong style={{ fontWeight: 700 }}>Highest rate</strong> stacking, a Saturday 23:00 hour would apply <strong style={{ fontWeight: 700 }}>this rule</strong> (150%) over Night Window (175%).
          </div>
        </div>

        {/* Scrolling body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 24px 24px' }}>
          <Section title="Basics" icon={I.layers}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <SheetField label="Overtime type">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.16 175)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Weekend Work</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>
              <SheetField label="Priority" hint="Higher wins on overlap">
                <Input defaultValue="100" style={{ height: 38 }} />
              </SheetField>
            </div>
          </Section>

          <Section title="Scope — who this applies to" icon={I.users}>
            <ScopeMulti label="Departments" values={['Engineering']} placeholder="All" />
            <ScopeMulti label="Designations" values={['Senior Engineer', 'Engineer']} placeholder="All" />
            <ScopeMulti label="Contract types" values={['Full-time']} placeholder="All" />
            <ScopeMulti label="Projects" values={[]} placeholder="All" />
            <ScopeMulti label="Specific employees" values={[]} placeholder="None — scope by attributes above" />

            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-accent-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon d={I.users} size={14} style={{ color: 'var(--fn-accent-soft-fg)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--fn-accent-soft-fg)' }}>
                This rule applies to <strong style={{ fontWeight: 700 }}>~28 employees</strong>.
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>View list →</span>
            </div>
          </Section>

          <Section title="Trigger — what counts as overtime" icon={I.zap}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
              {[
                { l: 'Beyond daily', v: 'beyond_daily_hours' },
                { l: 'Beyond weekly', v: 'beyond_weekly_hours' },
                { l: 'Weekend', v: 'weekend', active: true },
                { l: 'Public holiday', v: 'public_holiday' },
                { l: 'Company holiday', v: 'company_holiday' },
                { l: 'Night window', v: 'night_window' },
                { l: 'On-call', v: 'on_call' },
                { l: 'Manual only', v: 'manual_only' },
              ].map(t => (
                <button key={t.v} style={{
                  padding: '8px 10px', fontSize: 12, fontWeight: 500,
                  background: t.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                  color: t.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
                  border: '1px solid ' + (t.active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
                  borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: t.active ? 600 : 500,
                }}>{t.l}</button>
              ))}
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 6,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            }}>
              <SheetField label="Which weekdays count as weekend?">
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                    const isWknd = i === 0 || i === 6;
                    return (
                      <span key={d} style={{
                        flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                        background: isWknd ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                        color: isWknd ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
                        border: '1px solid ' + (isWknd ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border)'),
                        borderRadius: 6, cursor: 'pointer',
                      }}>{d}</span>
                    );
                  })}
                </div>
              </SheetField>
            </div>
          </Section>

          <Section title="Rate — how much per OT unit" icon={I.scale}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
              <SheetField label="Rate mode">
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '8px 12px',
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Percentage of hourly</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>
              <SheetField label="Rate value">
                <Input defaultValue="150" suffix={<span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>%</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Currency">
                <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2, height: 38 }}>
                  <span style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 600, borderRadius: 4,
                    background: 'var(--fn-bg-panel)', color: 'var(--fn-fg)', boxShadow: 'var(--fn-shadow-xs)',
                  }}>PKR</span>
                  <span style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 500,
                    color: 'var(--fn-fg-faint)',
                  }}>USD</span>
                </div>
              </SheetField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <SheetField label="Rate basis">
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '8px 12px', height: 38,
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Monthly salary</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>
              <SheetField label="Hours per month" hint="For salary → hourly conversion">
                <Input defaultValue="176" style={{ height: 38 }} />
              </SheetField>
            </div>
            {/* Live example */}
            <div style={{
              marginTop: 14, padding: '14px 16px', borderRadius: 8,
              background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
              border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                background: 'rgba(255,255,255,0.7)', color: 'var(--fn-accent-soft-fg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.eye} size={15} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Live example
                </div>
                <div style={{ marginTop: 4, fontSize: 13.5, color: 'var(--fn-fg)' }}>
                  An employee earning <strong style={{ fontWeight: 700 }}>PKR 200,000</strong>/month working{' '}
                  <strong style={{ fontWeight: 700 }}>1 hour</strong> of this OT earns{' '}
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 700, color: 'var(--fn-accent-soft-fg)' }}>PKR 1,704.55</span>.
                </div>
              </div>
            </div>
          </Section>

          <Section title="Channel — where the money goes" icon={I.send}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <ChannelCard kind="pkr_payroll" active />
              <ChannelCard kind="usd_payoneer" />
              <ChannelCard kind="comp_off_leave" />
            </div>
          </Section>

          {/* Advanced toggle */}
          <div style={{
            marginTop: 22, padding: '12px 16px', borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px dashed var(--fn-border-strong)',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          }}>
            <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Advanced settings</span>
            <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>· Caps, pre-conditions, stacking, schedule</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>4 sections collapsed</span>
          </div>

          {/* Caps & rounding (visible since advanced expanded for demo) */}
          <Section title="Caps & rounding" icon={I.scale} sub="Optional · leave blank to skip">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <SheetField label="Min block (minutes)">
                <Input defaultValue="60" style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Rounding mode">
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '8px 12px', height: 38,
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Nearest 15 min</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>
              <SheetField label="Max per day (hours)">
                <Input defaultValue="8" style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Max per month (hours)">
                <Input defaultValue="40" style={{ height: 38 }} />
              </SheetField>
            </div>
          </Section>

          <Section title="Pre-conditions" icon={I.shield}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ToggleRow label="Pre-approval required" hint="Employee must submit before working the OT." on />
              <ToggleRow label="Blocked during probation" hint="Probationary employees can't claim this OT." on />
              <ToggleRow label="Requires project link" hint="Forces the request to attach a project." />
              <ToggleRow label="Requires attachment" hint="Photo, doc, or note — useful for emergency claims." />
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Min tenure (months)">
                <Input defaultValue="3" style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Eligible contract types">
                <div style={{
                  padding: '8px 12px', height: 38, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
                }}>
                  <span style={{ fontSize: 12, padding: '2px 7px', background: 'var(--fn-bg-inset)', borderRadius: 4, fontWeight: 500 }}>Full-time</span>
                  <span style={{ fontSize: 12, padding: '2px 7px', background: 'var(--fn-bg-inset)', borderRadius: 4, fontWeight: 500 }}>Contractor</span>
                </div>
              </SheetField>
            </div>
          </Section>

          <Section title="Stacking — when multiple rules match" icon={I.layers}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <StackCard title="Highest rate" body="Pick the rule producing the largest amount." active />
              <StackCard title="Sum" body="Add the matching rules together — one entry per rule." />
              <StackCard title="Priority only" body="Highest-priority rule wins, ties by effective date." />
            </div>
          </Section>

          <Section title="Schedule" icon={I.clock}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Effective from">
                <Input defaultValue="15 May 2026" icon={I.clock} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Effective to" hint="Leave empty for indefinite">
                <Input placeholder="—" style={{ height: 38 }} />
              </SheetField>
            </div>
          </Section>
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle on />
            <span style={{ fontSize: 12.5, color: 'var(--fn-fg)' }}>Active on save</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button variant="secondary" size="sm">Save as draft</Button>
            <Button size="sm" icon={I.check}>Save & publish v4</Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───
function Section({ title, sub, icon, children }) {
  return (
    <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--fn-divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon d={icon} size={13} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.005em' }}>{title}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>· {sub}</span>}
      </div>
      {children}
    </div>
  );
}

function SheetField({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--fn-fg-faint)' }}>{hint}</div>}
    </div>
  );
}

function ScopeMulti({ label, values, placeholder }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fn-fg)', marginBottom: 4 }}>{label}</label>
      <div style={{
        padding: '8px 10px', minHeight: 38,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      }}>
        {values.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--fn-fg-faint)' }}>{placeholder}</span>
        ) : values.map(v => (
          <span key={v} style={{
            fontSize: 11.5, padding: '2px 4px 2px 8px', borderRadius: 4,
            background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)',
            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500,
          }}>
            {v}
            <Icon d={I.x} size={10} style={{ opacity: 0.7, cursor: 'pointer' }} />
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <Icon d={I.chev} size={12} style={{ color: 'var(--fn-fg-faint)' }} />
      </div>
    </div>
  );
}

function ChannelCard({ kind, active }) {
  const ch = CHANNEL_META[kind];
  const descs = {
    pkr_payroll: 'Added to next month\'s PKR salary disbursement.',
    usd_payoneer: 'Added to the next Payoneer USD payout, as its own line item.',
    comp_off_leave: 'Credited as comp-off leave hours in the leave ledger.',
  };
  return (
    <button style={{
      textAlign: 'left', padding: 14,
      background: active ? `oklch(0.95 0.04 ${ch.hue})` : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? `oklch(0.55 0.16 ${ch.hue})` : 'var(--fn-border-strong)'),
      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
    }}>
      {active && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          width: 16, height: 16, borderRadius: 99,
          background: `oklch(0.55 0.16 ${ch.hue})`, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={I.check} size={10} stroke={3} />
        </span>
      )}
      <span style={{
        width: 28, height: 28, borderRadius: 7,
        background: `oklch(0.55 0.16 ${ch.hue})`, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d={ch.icon} size={13} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{ch.label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>{descs[kind]}</span>
    </button>
  );
}

function StackCard({ title, body, active }) {
  return (
    <button style={{
      textAlign: 'left', padding: 12,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontSize: 12.5, fontWeight: 600,
        color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
      }}>{title}</span>
      <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.45 }}>{body}</span>
    </button>
  );
}

function ToggleRow({ label, hint, on }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 6,
      background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 1 }}>{hint}</div>
      </div>
      <Toggle on={on} />
    </div>
  );
}

Object.assign(window, { OvertimeRules });
