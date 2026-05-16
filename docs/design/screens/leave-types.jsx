// Brief 9 — Leave Types editor (extended)
// Right sheet with collapsible sections covering quota, eligibility, lifecycle,
// documentation, timing, pay, probation behavior.

const LEAVE_TYPES = [
  { id: 'annual', name: 'Annual leave', slug: 'annual', hue: 280, quota: 14, isPaid: true, active: true, employees: 84 },
  { id: 'casual', name: 'Casual leave', slug: 'casual', hue: 175, quota: 6, isPaid: true, active: true, employees: 84 },
  { id: 'sick', name: 'Sick leave', slug: 'sick', hue: 65, quota: 10, isPaid: true, active: true, employees: 84 },
  { id: 'maternity', name: 'Maternity leave', slug: 'maternity', hue: 22, quota: 90, isPaid: true, active: true, employees: 31, selected: true },
  { id: 'paternity', name: 'Paternity leave', slug: 'paternity', hue: 245, quota: 7, isPaid: true, active: true, employees: 53 },
  { id: 'marriage', name: 'Marriage leave', slug: 'marriage', hue: 145, quota: 5, isPaid: true, active: true, employees: 84 },
  { id: 'bereavement', name: 'Bereavement', slug: 'bereavement', hue: 200, quota: 3, isPaid: true, active: true, employees: 84 },
  { id: 'hajj', name: 'Hajj leave', slug: 'hajj', hue: 145, quota: 30, isPaid: false, active: true, employees: 84 },
  { id: 'comp_off', name: 'Comp-off', slug: 'comp_off', hue: 280, quota: null, isPaid: true, active: true, employees: 84, special: 'ot-managed' },
  { id: 'unpaid', name: 'Unpaid leave', slug: 'unpaid', hue: 22, quota: null, isPaid: false, active: true, employees: 84 },
];

function LeaveTypesEditor({ editing = 'maternity', sheetOpen = false }) {
  const selected = LEAVE_TYPES.find(t => t.id === editing) || LEAVE_TYPES[0];
  return (
    <>
      <SettingsBreadcrumb section="Time & Attendance" active="Leave Types" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Leave types
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 620 }}>
            Configure every leave category — quota, eligibility, life-event linkage, documentation, probation behavior, partial pay.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
          <Button icon={I.plus}>Add leave type</Button>
        </div>
      </div>

      {/* Types list */}
      <Card padded={false}>
        <SectionHeader
          icon={I.scale}
          title="All leave types"
          badge={<Badge tone="neutral">{LEAVE_TYPES.length}</Badge>}
          padding="18px 22px 14px"
        />
        <InsetTable
          padding={14}
          cols={[
            { label: '', width: 40 },
            { label: 'Name' },
            { label: 'Slug', width: 160 },
            { label: 'Quota / year', width: 130 },
            { label: 'Pay', width: 90 },
            { label: 'Employees', align: 'right', width: 110 },
            { label: 'Status', width: 110 },
            { label: '', width: 40 },
          ]}
        >
          <tbody>
            {LEAVE_TYPES.map((t, i) => (
              <InsetRow key={t.id} bordered={i < LEAVE_TYPES.length - 1} highlight={t.id === editing ? 'var(--fn-accent-soft)' : undefined}>
                <InsetCell first>
                  <span style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: `oklch(0.55 0.16 ${t.hue})`,
                  }} />
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{t.name}</span>
                    {t.special === 'ot-managed' && (
                      <Badge tone="accent">OT-managed</Badge>
                    )}
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, padding: '2px 7px', borderRadius: 4, background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{t.slug}</span>
                </InsetCell>
                <InsetCell>
                  {t.quota === null ? (
                    <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                      {t.special === 'ot-managed' ? 'accrued from OT' : 'unlimited'}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {t.quota} days
                    </span>
                  )}
                </InsetCell>
                <InsetCell>
                  {t.isPaid ? <Badge tone="success" dot>Paid</Badge> : <Badge tone="neutral" dot>Unpaid</Badge>}
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-muted)' }}>{t.employees}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={t.active ? 'success' : 'neutral'} dot>{t.active ? 'Active' : 'Inactive'}</Badge>
                </InsetCell>
                <InsetCell last>
                  <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {sheetOpen && <LeaveTypeSheet type={selected} />}
    </>
  );
}

function LeaveTypeSheet({ type }) {
  const isCompOff = type.special === 'ot-managed';

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 720, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: `oklch(0.92 0.07 ${type.hue})`,
            color: `oklch(0.38 0.16 ${type.hue})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.scale} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.015em' }}>
              Edit · {type.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              {isCompOff
                ? 'Special type — most fields are managed by the Overtime module'
                : 'Changes apply to new requests · existing approved leaves are unaffected'}
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 24px 24px' }}>
          {isCompOff && (
            <div style={{
              margin: '16px 0 8px', padding: '12px 14px', borderRadius: 8,
              background: 'var(--fn-accent-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Icon d={I.zap} size={14} style={{ color: 'var(--fn-accent-soft-fg)', marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', lineHeight: 1.55 }}>
                <strong style={{ fontWeight: 700 }}>Comp-off is credited automatically</strong> from approved Overtime entries with the <span style={{ fontFamily: 'var(--fn-font-mono)' }}>comp_off_leave</span> channel. Quota and accrual fields are disabled — manage rates and expiry on the OT Rules page.
              </div>
            </div>
          )}

          {/* Basics */}
          <LtSection title="Basics" icon={I.layers}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <SheetField label="Display name">
                <Input defaultValue={type.name} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Slug" hint="Cannot change after entries exist">
                <Input defaultValue={type.slug} style={{ height: 38, fontFamily: 'var(--fn-font-mono)' }} suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>locked</span>} />
              </SheetField>
            </div>
            <div style={{ height: 12 }} />
            <SheetField label="Description">
              <textarea
                rows={2}
                defaultValue={
                  type.id === 'maternity'
                    ? '90 days of paid leave for childbirth. PK Maternity Benefit Ordinance 2018 entitles 180 days for first child — confirm with HR before adjusting.'
                    : 'Standard leave for personal time off.'
                }
                style={{
                  width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                  fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                  background: 'var(--fn-bg-panel)',
                  border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                }}
              />
            </SheetField>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Color">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[22, 65, 145, 175, 200, 245, 280, 320].map(h => {
                    const active = h === type.hue;
                    return (
                      <button key={h} style={{
                        width: 28, height: 28, padding: 0,
                        background: `oklch(0.55 0.16 ${h})`,
                        border: '2px solid ' + (active ? 'var(--fn-fg)' : 'var(--fn-bg-panel)'),
                        outline: active ? '1px solid var(--fn-accent)' : 'none', outlineOffset: 2,
                        borderRadius: 6, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <Icon d={I.check} size={12} stroke={3} style={{ color: '#fff' }} />}
                      </button>
                    );
                  })}
                </div>
              </SheetField>
              <SheetField label="Paid?" hint="If off, leave days don't pay">
                <ToggleRow label="Paid leave" hint="" on={type.isPaid} />
              </SheetField>
            </div>
          </LtSection>

          {/* Quota & Accrual */}
          <LtSection title="Quota & accrual" icon={I.calc} disabled={isCompOff}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Annual quota">
                <Input defaultValue={type.quota || ''} placeholder="Days per year" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days/yr</span>} style={{ height: 38 }} disabled={isCompOff} />
              </SheetField>
              <SheetField label="Accrual mode">
                <DropdownChip value="Upfront on Jan 1" />
              </SheetField>
            </div>
            <div style={{ height: 12 }} />
            <ToggleRow label="Carry-forward allowed" hint="Unused days roll over to next year" on={false} />
            <div style={{ height: 8 }} />
            <ToggleRow label="Encashment on resignation" hint="Pay out unused days when employee leaves" on={false} />
          </LtSection>

          {/* Eligibility */}
          <LtSection title="Eligibility" icon={I.shield}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Eligible genders" hint="Locked for maternity">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { l: 'All', active: false },
                    { l: 'Female only', active: type.id === 'maternity' },
                    { l: 'Male only', active: type.id === 'paternity' },
                  ].map(o => (
                    <button key={o.l} style={{
                      flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 600,
                      background: o.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                      color: o.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
                      border: '1px solid ' + (o.active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
                      borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{o.l}</button>
                  ))}
                </div>
              </SheetField>
              <SheetField label="Minimum tenure" hint="Months at company before eligible">
                <Input defaultValue="6" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>months</span>} style={{ height: 38 }} />
              </SheetField>
            </div>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <SheetField label="Min notice days">
                <Input defaultValue="30" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Max backdated days">
                <Input defaultValue="0" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Min gap between requests">
                <Input defaultValue="—" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
            </div>
          </LtSection>

          {/* Lifecycle */}
          <LtSection title="Lifecycle" icon={I.flag}>
            <div style={{
              padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-bg-subtle)', border: '1px dashed var(--fn-border-strong)',
              fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5, marginBottom: 12,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={13} style={{ color: 'var(--fn-fg-faint)', marginTop: 2 }} />
              <span>
                Use these for leaves like <strong style={{ fontWeight: 600 }}>Marriage</strong> (one-time-lifetime) or <strong style={{ fontWeight: 600 }}>Hajj</strong> (one-time-per-employment).
              </span>
            </div>
            <ToggleRow label="One-time lifetime" hint="Can only be claimed once ever, across all jobs (e.g. Marriage)" />
            <div style={{ height: 8 }} />
            <ToggleRow label="One-time per employment" hint="Can be claimed once per employment relationship (e.g. Hajj)" />
            <div style={{ height: 8 }} />
            <ToggleRow label="Requires a life event" hint="Employee must register and HR must verify the event" on />
            <div style={{ marginTop: 12 }}>
              <SheetField label="Life event kind">
                <DropdownChip value="Child birth" icon={I.flag} hue={22} />
              </SheetField>
            </div>
          </LtSection>

          {/* Documentation */}
          <LtSection title="Documentation" icon={I.doc}>
            <ToggleRow label="Requires attachment" hint="Employee must upload a supporting document" on />
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <SheetField label="Attachment required if leave >" hint="Otherwise attachment optional">
                <Input defaultValue="—" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="What to upload">
                <Input defaultValue="Birth certificate or hospital discharge slip" style={{ height: 38 }} />
              </SheetField>
            </div>
          </LtSection>

          {/* Unit & Timing */}
          <LtSection title="Unit & timing" icon={I.clock}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <SheetField label="Min block">
                <Input defaultValue={type.id === 'maternity' ? '7' : '0.5'} suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Max block">
                <Input defaultValue={type.id === 'maternity' ? '90' : '—'} suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>days</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Allows half-day">
                <Toggle on={type.id !== 'maternity'} />
              </SheetField>
            </div>
            <div style={{ height: 8 }} />
            <ToggleRow label="Counts against attendance" hint="Shows in monthly attendance summary" on />
          </LtSection>

          {/* Pay */}
          <LtSection title="Pay" icon={I.card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <SheetField label="Partial pay">
                <Input defaultValue="100" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>%</span>} style={{ height: 38, fontWeight: 600 }} />
              </SheetField>
              <div style={{
                padding: '8px 12px', height: 56, borderRadius: 6,
                background: 'var(--fn-success-soft)',
                border: '1px solid color-mix(in oklch, var(--fn-success) 22%, transparent)',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
              }}>
                <Icon d={I.check} size={13} style={{ color: 'var(--fn-success-soft-fg)' }} stroke={2.5} />
                <span style={{ color: 'var(--fn-success-soft-fg)' }}>
                  100% means full pay · 70% for partial maternity · 0% for unpaid leave.
                </span>
              </div>
            </div>
          </LtSection>

          {/* Probation behavior */}
          <LtSection title="Probation behavior" icon={I.users}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <ProbCard label="Not allowed" sub="Probationers can't apply" />
              <ProbCard label="Allowed" sub="No restrictions" />
              <ProbCard label="Allowed with approval" sub="HR Admin must approve every request" active />
              <ProbCard label="Prorated" sub="Quota scales with tenure" />
            </div>
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              fontSize: 11.5, color: 'var(--fn-fg-muted)', display: 'flex', gap: 8,
            }}>
              <Icon d={I.shield} size={12} style={{ color: 'var(--fn-fg-faint)' }} />
              For maternity, regulatory minimums override this — even probationers are entitled by law.
            </div>
          </LtSection>
        </div>

        {/* Preview chip strip + footer */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-subtle)', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
            color: 'var(--fn-fg-faint)', marginBottom: 6,
          }}>
            Portal preview
          </div>
          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
            display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${type.hue})` }} />
            <strong style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>{type.name}</strong>
            <span style={{ color: 'var(--fn-fg-muted)' }}>· {type.quota || 0} days · requires birth certificate · 30 days notice</span>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-panel)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle on={type.active} />
            <span style={{ fontSize: 12.5, color: 'var(--fn-fg)' }}>Active on save</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm" icon={I.check}>Save changes</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function LtSection({ title, icon, children, disabled }) {
  return (
    <div style={{
      marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--fn-divider)',
      opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={icon} size={13} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)' }}>{title}</span>
        {disabled && <Badge tone="neutral">Managed by OT module</Badge>}
      </div>
      {children}
    </div>
  );
}

function DropdownChip({ value, icon, hue }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', height: 38,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 6, cursor: 'pointer',
    }}>
      {icon && hue != null && (
        <span style={{
          width: 22, height: 22, borderRadius: 5,
          background: `oklch(0.92 0.07 ${hue})`, color: `oklch(0.38 0.16 ${hue})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={icon} size={11} />
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
      <div style={{ flex: 1 }} />
      <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
    </div>
  );
}

function ProbCard({ label, sub, active }) {
  return (
    <button style={{
      textAlign: 'left', padding: 12,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 99, flexShrink: 0, marginTop: 2,
        border: '2px solid ' + (active ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
        background: active ? 'var(--fn-accent)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 3px var(--fn-bg-panel)' : 'none',
      }} />
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  );
}

Object.assign(window, { LeaveTypesEditor });
