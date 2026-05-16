// Brief 5 — Overtime Entries admin page

const OT_ENTRIES = [
  { date: '17 May 2026', emp: 'Bilal Rauf', empRole: 'Sr. Engineer', eid: 'EMP-0042', hue: 280, type: 'Weekend Work', typeHue: 175, rule: 'Engineering — Weekend OT', hrs: 6, channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Credited', tone: 'info', run: null },
  { date: '16 May 2026', emp: 'Omar Sheikh', empRole: 'Sr. Engineer', eid: 'EMP-0055', hue: 175, type: 'Project Emergency', typeHue: 65, rule: 'Eng — Project Emergency', hrs: 4, channel: 'usd_payoneer', amt: '$98.00', status: 'Credited', tone: 'info', run: null },
  { date: '15 May 2026', emp: 'Faraz Iqbal', empRole: 'Engineer', eid: 'EMP-0067', hue: 200, type: 'Night Shift', typeHue: 245, rule: 'Eng — Night Window', hrs: 4, channel: 'pkr_payroll', amt: 'PKR 7,955', status: 'Held', tone: 'warning', held: true, holdReason: 'Awaiting confirmation from project lead', run: null },
  { date: '11 May 2026', emp: 'Maira Khan', empRole: 'BD Associate', eid: 'EMP-0061', hue: 145, type: 'Weekend Work', typeHue: 175, rule: 'BD — Weekend Client Calls', hrs: 5, channel: 'comp_off_leave', amt: '7.5 hrs', status: 'Credited', tone: 'info', run: null },
  { date: '10 May 2026', emp: 'Bilal Rauf', empRole: 'Sr. Engineer', eid: 'EMP-0042', hue: 280, type: 'Weekend Work', typeHue: 175, rule: 'Engineering — Weekend OT', hrs: 5, channel: 'pkr_payroll', amt: 'PKR 8,523', status: 'Included in run', tone: 'accent', run: 'May 2026 Payroll' },
  { date: '02 May 2026', emp: 'Hassan Tariq', empRole: 'Engineer', eid: 'EMP-0073', hue: 22, type: 'Weekend Work', typeHue: 175, rule: 'Engineering — Weekend OT', hrs: 6, channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Included in run', tone: 'accent', run: 'May 2026 Payroll' },
  { date: '26 Apr 2026', emp: 'Bilal Rauf', empRole: 'Sr. Engineer', eid: 'EMP-0042', hue: 280, type: 'Weekend Work', typeHue: 175, rule: 'Engineering — Weekend OT', hrs: 6, channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Paid', tone: 'success', run: 'Apr 2026 Payroll' },
  { date: '20 Apr 2026', emp: 'Sana Lateef', empRole: 'BD Lead', eid: 'EMP-0019', hue: 245, type: 'Weekend Work', typeHue: 175, rule: 'BD — Weekend Client Calls', hrs: 4, channel: 'comp_off_leave', amt: '6 hrs', status: 'Comp-off consumed', tone: 'neutral', run: null },
  { date: '14 Apr 2026', emp: 'Omar Sheikh', empRole: 'Sr. Engineer', eid: 'EMP-0055', hue: 175, type: 'On-Call', typeHue: 145, rule: 'Eng — On-Call Standby', hrs: 1, channel: 'pkr_payroll', amt: 'PKR 8,000', status: 'Paid', tone: 'success', run: 'Apr 2026 Payroll' },
  { date: '10 Mar 2026', emp: 'Maira Khan', empRole: 'BD Associate', eid: 'EMP-0061', hue: 145, type: 'Weekend Work', typeHue: 175, rule: 'BD — Weekend Client Calls', hrs: 3, channel: 'comp_off_leave', amt: '4.5 hrs', status: 'Expired', tone: 'danger', expired: true, run: null },
];

function OvertimeEntriesAdmin({ withInspector = false, selected = 0 }) {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Overtime entries
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            Every approved OT entry across the company. Held entries are excluded from the next payroll or Payoneer run.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Export Excel</ToolbarPill>
          <ToolbarPill icon={I.download}>Export CSV</ToolbarPill>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.zap} label="Entries in view" value={OT_ENTRIES.length} sub={`${OT_ENTRIES.reduce((s, e) => s + e.hrs, 0)} hours total`} info={false} />
        <KPI icon={I.card} label="PKR-routed" value="6" sub="PKR 55,159 to disburse" deltaTone="success" info={false} />
        <KPI icon={I.globe} label="USD-routed" value="1" sub="$98 to disburse" deltaTone="success" info={false} />
        <KPI icon={I.clock} label="Comp-off credited" value="3" sub="18 hours total" info={false} />
      </div>

      {/* Filter bar */}
      <Card padded={false} style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Input icon={I.search} placeholder="Find by employee, EID, project…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
          <ToolbarPill iconRight={I.chev} small icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18">May 2026</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>OT type: All</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Channel: All</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
          <ToolbarPill iconRight={I.chev} small>Project: All</ToolbarPill>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{OT_ENTRIES.length} of 124 entries</span>
        </div>

        {/* Active filter chips */}
        <div style={{
          padding: '8px 14px 12px', borderTop: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Active:</span>
          <FilterChip label="May 2026" />
          <FilterChip label="Engineering + BD" />
          <FilterChip label="Channel: PKR + Comp-off" />
          <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>Clear all</span>

          {/* Channel mix indicator */}
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '4px 10px', borderRadius: 6, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--fn-fg-muted)', fontWeight: 600 }}>Channel mix</span>
            <div style={{ width: 140, display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: '60%', background: 'oklch(0.55 0.16 175)' }} title="PKR" />
              <div style={{ width: '10%', background: 'oklch(0.55 0.16 145)' }} title="USD" />
              <div style={{ width: '30%', background: 'oklch(0.55 0.16 280)' }} title="Comp-off" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main table */}
      <Card padded={false} style={{ position: 'relative' }}>
        <InsetTable
          padding={14}
          cols={[
            { label: '', width: 36 },
            { label: 'Date', width: 110 },
            { label: 'Employee', width: 220 },
            { label: 'OT type', width: 170 },
            { label: 'Rule applied' },
            { label: 'Hours', align: 'right', width: 70 },
            { label: 'Channel', width: 110 },
            { label: 'Amount', align: 'right', width: 110 },
            { label: 'Status', width: 150 },
            { label: 'Linked run', width: 140 },
            { label: '', width: 36 },
          ]}
        >
          <tbody>
            {OT_ENTRIES.map((e, i) => {
              const ch = CHANNEL_META[e.channel];
              const isSelected = i < selected;
              return (
                <InsetRow
                  key={i}
                  bordered={i < OT_ENTRIES.length - 1}
                  highlight={isSelected ? 'var(--fn-accent-soft)' : e.expired ? 'var(--fn-bg-subtle)' : undefined}
                >
                  <InsetCell first>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: '1.5px solid ' + (isSelected ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
                      background: isSelected ? 'var(--fn-accent)' : 'var(--fn-bg-panel)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}>
                      {isSelected && <Icon d={I.check} size={11} stroke={3} style={{ color: '#fff' }} />}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontSize: 12,
                      color: e.expired ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                      textDecoration: e.expired ? 'line-through' : 'none',
                    }}>
                      {e.date}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: e.expired ? 0.6 : 1 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: `oklch(0.92 0.07 ${e.hue})`,
                        color: `oklch(0.38 0.16 ${e.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {e.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{e.emp}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{e.empRole} · {e.eid}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.55 0.16 ${e.typeHue})`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: 'var(--fn-fg)' }}>{e.type}</span>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <span style={{
                      fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 500, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {e.rule}
                      <Icon d={I.arrowR} size={10} style={{ opacity: 0.6, transform: 'rotate(-45deg)' }} />
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {e.hrs}h
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 7px', borderRadius: 5,
                      background: `oklch(0.95 0.04 ${ch.hue})`,
                      color: `oklch(0.40 0.13 ${ch.hue})`,
                      border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${ch.hue}) 25%, transparent)`,
                      fontSize: 10.5, fontWeight: 600,
                    }}>
                      <Icon d={ch.icon} size={10} /> {ch.label.replace(' Leave', '').replace(' Payroll', '').replace(' Payoneer', '')}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                      color: e.expired ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                      textDecoration: e.expired ? 'line-through' : 'none',
                    }}>
                      {e.amt}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Badge tone={e.tone} dot>{e.status}</Badge>
                      {e.held && <Icon d={I.lock} size={11} style={{ color: 'var(--fn-warning-soft-fg)' }} />}
                    </span>
                    {e.held && (
                      <div style={{ fontSize: 10, color: 'var(--fn-warning-soft-fg)', marginTop: 2, fontStyle: 'italic' }}>
                        Held: {e.holdReason}
                      </div>
                    )}
                  </InsetCell>
                  <InsetCell>
                    {e.run ? (
                      <span style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 500, cursor: 'pointer' }}>{e.run} →</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>—</span>
                    )}
                  </InsetCell>
                  <InsetCell last align="right">
                    <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                  </InsetCell>
                </InsetRow>
              );
            })}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />

        {/* Pagination */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, color: 'var(--fn-fg-muted)',
        }}>
          <span>Showing <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>1–10</strong> of 124</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <ToolbarPill small icon={I.chevL}>Prev</ToolbarPill>
            {['1', '2', '3', '…', '13'].map((p, i) => (
              <span key={i} style={{
                width: 28, height: 28, fontSize: 12.5, fontWeight: p === '1' ? 600 : 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, cursor: 'pointer',
                background: p === '1' ? 'var(--fn-accent)' : 'transparent',
                color: p === '1' ? 'var(--fn-accent-fg)' : 'var(--fn-fg-muted)',
              }}>{p}</span>
            ))}
            <ToolbarPill small iconRight={I.chevR}>Next</ToolbarPill>
          </div>
        </div>
      </Card>

      {/* Bulk action bar (sticky bottom) */}
      {selected > 0 && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 10,
          padding: '10px 14px 10px 16px', borderRadius: 99,
          background: 'oklch(0.20 0.012 260)', color: 'oklch(0.95 0.005 250)',
          boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.30), 0 6px 12px -4px rgba(15, 17, 23, 0.18)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
            <strong style={{ fontWeight: 700 }}>{selected}</strong> selected
          </span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'oklch(0.85 0.10 65)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.lock} size={12} /> Hold for next run
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.download} size={12} /> Export selected
          </span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Clear</span>
        </div>
      )}

      {withInspector && <RuleSnapshotInspector />}
    </>
  );
}

function FilterChip({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 4px 3px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 500,
      background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)',
      border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
    }}>
      {label}
      <Icon d={I.x} size={11} style={{ opacity: 0.7, cursor: 'pointer', marginLeft: 2, marginRight: 2 }} />
    </span>
  );
}

function RuleSnapshotInspector() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 460, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.shield} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)' }}>Rule snapshot</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              Frozen at approval · this is what determined the entry
            </div>
          </div>
          <Icon d={I.x} size={15} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          <div style={{
            padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-accent-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          }}>
            <Icon d={I.shield} size={13} style={{ color: 'var(--fn-accent-soft-fg)' }} />
            <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', lineHeight: 1.5 }}>
              Showing the snapshot — not the current rule. The live rule is now <strong style={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>v4</strong>.
            </span>
          </div>

          <SnapField label="Rule name" value="Engineering — Weekend OT" />
          <SnapField label="Version snapshot" value="v3" mono />
          <SnapField label="OT type" value="Weekend Work" dot={175} />
          <SnapField label="Trigger" value="Weekend (Sat, Sun)" />
          <SnapField label="Rate mode" value="Percentage of hourly" />
          <SnapField label="Rate value" value="150 %" mono />
          <SnapField label="Rate basis" value="Monthly salary" />
          <SnapField label="Hours per month" value="176" mono />
          <SnapField label="Rounding" value="Nearest 15 min" />
          <SnapField label="Stacking" value="Highest rate" />
          <SnapField label="Channel" value="PKR Payroll" />
          <SnapField label="Effective from" value="01 Mar 2026" mono />

          <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
              Calculation
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', lineHeight: 1.7, fontFamily: 'var(--fn-font-mono)' }}>
              base_hourly = 200,000 ÷ 176 = 1,136.36<br />
              ot_hourly = 1,136.36 × 1.50 = 1,704.55<br />
              hours = 6.00 (no rounding needed)<br />
              <strong style={{ color: 'var(--fn-fg)', fontWeight: 700 }}>amount = 1,704.55 × 6 = 10,227.27</strong>
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 22px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
            Audit ID <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg-muted)' }}>ote_8a3f9c</span>
          </span>
          <Button variant="secondary" size="sm" icon={I.eye}>Open current rule</Button>
        </div>
      </div>
    </>
  );
}

function SnapField({ label, value, mono, dot }) {
  return (
    <div style={{
      padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px dashed var(--fn-divider)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{label}</span>
      <span style={{
        fontSize: 12.5, fontWeight: 500,
        fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
        color: 'var(--fn-fg)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${dot})` }} />}
        {value}
      </span>
    </div>
  );
}

Object.assign(window, { OvertimeEntriesAdmin });
