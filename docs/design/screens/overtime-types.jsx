// Settings → Time & Attendance → Overtime Types
// Brief 1: list view + edit dialog + empty state

const OT_TYPES = [
  {
    id: 'ot-weekday', name: 'Weekday Extra Hours', slug: 'weekday_extra', hue: 280,
    description: 'Extra hours worked on a regular weekday beyond standard daily hours.',
    rules: 3, isActive: true, updatedAt: '2 days ago',
  },
  {
    id: 'ot-weekend', name: 'Weekend Work', slug: 'weekend_work', hue: 175,
    description: 'Any work on Saturdays or Sundays. Most common case for commission engineers.',
    rules: 4, isActive: true, updatedAt: '12 hrs ago',
  },
  {
    id: 'ot-holiday', name: 'Public Holiday Work', slug: 'public_holiday_work', hue: 22,
    description: 'Work on declared public holidays — driven by the Holidays module.',
    rules: 2, isActive: true, updatedAt: '5 days ago',
  },
  {
    id: 'ot-night', name: 'Night Shift', slug: 'night_shift', hue: 245,
    description: 'Hours worked between 22:00 and 06:00 Asia/Karachi.',
    rules: 1, isActive: true, updatedAt: 'last week',
  },
  {
    id: 'ot-oncall', name: 'On-Call', slug: 'on_call', hue: 145,
    description: 'Standby compensation for engineers carrying the pager.',
    rules: 1, isActive: true, updatedAt: '3 weeks ago',
  },
  {
    id: 'ot-emergency', name: 'Project Emergency', slug: 'project_emergency', hue: 65,
    description: 'Manual-only — picked by employees during an active client incident.',
    rules: 0, isActive: false, updatedAt: '2 months ago',
  },
];

function OvertimeTypes({ openEdit = false, emptyState = false }) {
  const list = emptyState ? [] : OT_TYPES;

  return (
    <>
      {/* Settings sub-nav strip (mirrors the existing settings pattern) */}
      <SettingsBreadcrumb section="Time & Attendance" active="Overtime Types" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Overtime Types
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 620 }}>
            Categories of overtime work. Each type has one or more rules defining rate and compensation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
          <Button icon={I.plus}>Add overtime type</Button>
        </div>
      </div>

      {emptyState ? (
        <Card padded={false}>
          <div style={{ padding: '60px 28px' }}>
            <EmptyState
              icon={I.zap}
              title="No overtime types yet"
              body="Define how your team's overtime is grouped — by trigger, by department, by anything. Rules will hang off these types."
              primary={{ label: 'Add your first type', icon: I.plus }}
              secondary={{ label: 'See an example', icon: I.eye }}
            />
          </div>
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <SectionHeader
              icon={I.zap}
              title="All overtime types"
              badge={<Badge tone="neutral">{list.length}</Badge>}
              padding="18px 22px 14px"
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <ToolbarPill icon={I.filter} small>Status</ToolbarPill>
                  <ToolbarPill iconRight={I.chev} small>Sort: name</ToolbarPill>
                </div>
              }
            />

            <InsetTable
              padding={14}
              cols={[
                { label: '', width: 40 },
                { label: 'Name' },
                { label: 'Slug', width: 180 },
                { label: 'Active rules', width: 140 },
                { label: 'Status', width: 110 },
                { label: 'Updated', width: 130 },
                { label: '', width: 48 },
              ]}
            >
              <tbody>
                {list.map((t, i) => (
                  <InsetRow key={t.id} bordered={i < list.length - 1}>
                    <InsetCell first>
                      <span style={{
                        width: 14, height: 14, borderRadius: 4,
                        background: `oklch(0.55 0.16 ${t.hue})`,
                        display: 'inline-block',
                      }} />
                    </InsetCell>
                    <InsetCell>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fn-fg)' }}>{t.name}</div>
                      <div style={{
                        fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380,
                      }}>
                        {t.description}
                      </div>
                    </InsetCell>
                    <InsetCell>
                      <span style={{
                        fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-muted)',
                        padding: '2px 7px', background: 'var(--fn-bg-inset)', borderRadius: 4,
                      }}>{t.slug}</span>
                    </InsetCell>
                    <InsetCell>
                      {t.rules > 0 ? (
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}>
                          {t.rules} {t.rules === 1 ? 'rule' : 'rules'}
                          <Icon d={I.arrowR} size={11} />
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>No rules yet</span>
                      )}
                    </InsetCell>
                    <InsetCell>
                      <Badge tone={t.isActive ? 'success' : 'neutral'} dot>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </InsetCell>
                    <InsetCell>
                      <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{t.updatedAt}</span>
                    </InsetCell>
                    <InsetCell last>
                      <span style={{
                        display: 'inline-flex', width: 28, height: 28, borderRadius: 6,
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--fn-fg-faint)', cursor: 'pointer',
                      }}>
                        <Icon d={I.more} size={15} />
                      </span>
                    </InsetCell>
                  </InsetRow>
                ))}
              </tbody>
            </InsetTable>
            <div style={{ height: 14 }} />
          </Card>

          <div style={{
            marginTop: 14, fontSize: 12, color: 'var(--fn-fg-muted)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            Disabling a type pauses its rules — existing entries are unaffected. Types with logged entries can't be deleted, only disabled.
          </div>
        </>
      )}

      {/* Edit dialog overlay */}
      {openEdit && <EditOvertimeTypeDialog type={OT_TYPES[1]} />}
    </>
  );
}

function SettingsBreadcrumb({ section, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
      fontSize: 12.5, color: 'var(--fn-fg-muted)',
    }}>
      <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Settings</span>
      <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
      <span>{section}</span>
      <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
      <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>{active}</span>
    </div>
  );
}

function EditOvertimeTypeDialog({ type }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(20, 16, 38, 0.45)',
    }}>
      {/* Centered dialog */}
      <div style={{
        width: 520, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4), 0 12px 24px -8px rgba(15, 17, 23, 0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--fn-divider)',
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={I.edit} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fn-fg)' }}>
              Edit overtime type
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 2 }}>
              Update how this category appears across the app.
            </div>
          </div>
          <span style={{
            width: 28, height: 28, borderRadius: 6, cursor: 'pointer', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fn-fg-muted)',
          }}>
            <Icon d={I.x} size={15} />
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DialogField label="Name" hint="Shown on rule listings, OT requests, payslips.">
            <Input defaultValue={type.name} style={{ height: 38 }} />
          </DialogField>

          <DialogField
            label="Slug"
            hint={
              <span>
                Used in URLs and CSV exports. Auto-generated from name —
                <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 500, marginLeft: 4 }}>only override if you know what you're doing.</span>
              </span>
            }
          >
            <Input
              defaultValue={type.slug}
              style={{ height: 38, fontFamily: 'var(--fn-font-mono)', fontSize: 12.5 }}
              suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>auto</span>}
            />
            <div style={{
              marginTop: 6, fontSize: 11.5, color: 'var(--fn-success-soft-fg)',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Icon d={I.check} size={11} stroke={2.5} /> Available
            </div>
          </DialogField>

          <DialogField label="Description" hint="Helps reviewers understand when this type should be used.">
            <textarea
              rows={3}
              defaultValue={type.description}
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </DialogField>

          <DialogField label="Color" hint="Used everywhere this type appears — rule rows, OT cards, charts.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { name: 'Violet', hue: 280 },
                { name: 'Indigo', hue: 255 },
                { name: 'Blue', hue: 230 },
                { name: 'Sky', hue: 200 },
                { name: 'Teal', hue: 175 },
                { name: 'Mint', hue: 145 },
                { name: 'Amber', hue: 65 },
                { name: 'Coral', hue: 22 },
              ].map(s => {
                const isActive = s.hue === type.hue;
                return (
                  <button key={s.hue} title={s.name} style={{
                    width: 30, height: 30, padding: 0,
                    background: `oklch(0.55 0.16 ${s.hue})`,
                    border: '2px solid ' + (isActive ? 'var(--fn-fg)' : 'var(--fn-bg-panel)'),
                    outline: isActive ? '1px solid var(--fn-accent)' : 'none', outlineOffset: 2,
                    borderRadius: 7, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isActive && <Icon d={I.check} size={13} stroke={3} style={{ color: '#fff' }} />}
                  </button>
                );
              })}
            </div>
          </DialogField>

          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Active</div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                New OT requests can pick this type. Existing rules and entries are unaffected when toggled off.
              </div>
            </div>
            <Toggle on={type.isActive} />
          </div>

          {/* Inline warning when disabling */}
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'var(--fn-warning-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-warning) 30%, transparent)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Icon
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              size={14} stroke={2}
              style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2, flexShrink: 0 }}
            />
            <div style={{ flex: 1, fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
              This type has <strong style={{ fontWeight: 700 }}>{type.rules} active rules</strong> attached to it.
              Disabling will pause those rules — existing OT entries are unaffected.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', background: 'var(--fn-bg-subtle)',
          borderTop: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
            <Icon d={I.shield} size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Changes are audited and reversible.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm" icon={I.check}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DialogField({ label, hint, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 12.5, fontWeight: 600,
        color: 'var(--fn-fg)', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fn-fg-faint)', lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { OvertimeTypes, EditOvertimeTypeDialog });
