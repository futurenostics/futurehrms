// Brief 4 — My Overtime page (employee portal)
// Requests + Entries tabs with summary cards

function MyOvertimePortal({ emptyState = false }) {
  const requests = [
    { date: 'Sat, 17 May', type: 'Weekend Work', hue: 175, hrs: 6, mode: 'Pre-approval', channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Pending', tone: 'warning' },
    { date: 'Thu, 15 May', type: 'Project Emergency', hue: 65, hrs: 3, mode: 'Post-hoc', channel: 'usd_payoneer', amt: '$74.00', status: 'Pending', tone: 'warning' },
    { date: 'Sat, 10 May', type: 'Weekend Work', hue: 175, hrs: 5, mode: 'Pre-approval', channel: 'pkr_payroll', amt: 'PKR 8,523', status: 'Approved', tone: 'success', entry: true },
    { date: 'Sun, 04 May', type: 'Weekend Work', hue: 175, hrs: 4, mode: 'Pre-approval', channel: 'comp_off_leave', amt: '6 hrs', status: 'Approved', tone: 'success', entry: true },
    { date: 'Sat, 26 Apr', type: 'Weekend Work', hue: 175, hrs: 6, mode: 'Pre-approval', channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Approved', tone: 'success', entry: true },
    { date: 'Wed, 16 Apr', type: 'Night Shift', hue: 245, hrs: 4, mode: 'Post-hoc', channel: 'pkr_payroll', amt: 'PKR 7,955', status: 'Rejected', tone: 'danger', reason: 'No emergency context provided.' },
    { date: 'Sat, 12 Apr', type: 'Weekend Work', hue: 175, hrs: 8, mode: 'Pre-approval', channel: 'pkr_payroll', amt: 'PKR 13,636', status: 'Cancelled', tone: 'neutral' },
    { date: 'Sat, 05 Apr', type: 'Weekend Work', hue: 175, hrs: 6, mode: 'Pre-approval', channel: 'pkr_payroll', amt: 'PKR 10,227', status: 'Approved', tone: 'success', entry: true },
  ];

  if (emptyState) {
    return <MyOvertimeEmpty />;
  }

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
            My space
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            My overtime
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 580 }}>
            Track your overtime requests and resulting payments. Comp-off balance shows hours banked and not yet taken.
          </p>
        </div>
        <Button icon={I.plus}>Log overtime</Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {/* This month */}
        <Card padded={false}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fn-fg-muted)' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.zap} size={14} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fn-fg)' }}>This month</span>
            </div>
            <div style={{
              marginTop: 14, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em',
              color: 'var(--fn-fg)', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ fontFamily: 'var(--fn-font-mono)' }}>22</span>
              <span style={{ fontSize: 16, color: 'var(--fn-fg-faint)', fontWeight: 500, marginLeft: 8 }}>hours logged</span>
            </div>
            {/* Channel stacked bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: '55%', background: 'oklch(0.55 0.16 175)' }} />
                <div style={{ width: '18%', background: 'oklch(0.55 0.16 145)' }} />
                <div style={{ width: '27%', background: 'oklch(0.55 0.16 280)' }} />
              </div>
              <div style={{
                marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap',
                fontSize: 11.5, color: 'var(--fn-fg-muted)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'oklch(0.55 0.16 175)' }} /> PKR 12h
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'oklch(0.55 0.16 145)' }} /> USD 4h
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'oklch(0.55 0.16 280)' }} /> Comp-off 6h
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Pending approval */}
        <Card padded={false}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fn-fg-muted)' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.clock} size={14} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fn-fg)' }}>Pending approval</span>
            </div>
            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10,
            }}>
              <span style={{
                fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em',
                color: 'var(--fn-fg)', lineHeight: 1, fontFamily: 'var(--fn-font-mono)',
              }}>2</span>
              <Badge tone="warning">requests</Badge>
            </div>
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 7,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Avatar name="Talha Mansoor" size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>
                  Awaiting <strong style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>Talha Mansoor</strong>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 1 }}>oldest pending 2 days</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Comp-off balance */}
        <Card padded={false} style={{
          border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, var(--fn-border))',
        }}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fn-fg-muted)' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'oklch(0.95 0.04 280)', color: 'oklch(0.40 0.16 280)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.clock} size={14} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fn-fg)' }}>Comp-off balance</span>
            </div>
            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10,
            }}>
              <span style={{
                fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em',
                color: 'var(--fn-fg)', lineHeight: 1, fontFamily: 'var(--fn-font-mono)',
              }}>13</span>
              <span style={{ fontSize: 14, color: 'var(--fn-fg-faint)', fontWeight: 500 }}>hours available</span>
            </div>
            <div style={{
              marginTop: 14, padding: '8px 11px', borderRadius: 6,
              background: 'var(--fn-warning-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon d={I.clock} size={12} style={{ color: 'var(--fn-warning-soft-fg)' }} />
              <span style={{ fontSize: 11.5, color: 'var(--fn-warning-soft-fg)', flex: 1 }}>
                <strong style={{ fontWeight: 700 }}>3 hours</strong> expire 15 Jun · take leave to use them
              </span>
              <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-warning-soft-fg)', cursor: 'pointer' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs + table */}
      <Card padded={false}>
        <div style={{
          padding: '14px 22px 0', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            <TabPill label="Requests" count={8} active />
            <TabPill label="Entries" count={4} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
            <ToolbarPill icon={I.filter} small>Filters</ToolbarPill>
            <ToolbarPill iconRight={I.chev} small>This year</ToolbarPill>
          </div>
        </div>

        <InsetTable
          padding={14}
          cols={[
            { label: 'Date', width: 130 },
            { label: 'Overtime type' },
            { label: 'Hours', align: 'right', width: 80 },
            { label: 'Mode', width: 110 },
            { label: 'Channel', width: 140 },
            { label: 'Estimated', align: 'right', width: 130 },
            { label: 'Status', width: 120 },
            { label: '', width: 90 },
          ]}
        >
          <tbody>
            {requests.map((r, i) => {
              const ch = CHANNEL_META[r.channel];
              return (
                <InsetRow key={i} bordered={i < requests.length - 1}>
                  <InsetCell first>
                    <span style={{ fontSize: 12.5, color: 'var(--fn-fg)', fontWeight: 500, fontFamily: 'var(--fn-font-mono)' }}>
                      {r.date}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.55 0.16 ${r.hue})`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fn-fg)' }}>{r.type}</span>
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{r.hrs}h</span>
                  </InsetCell>
                  <InsetCell>
                    <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{r.mode}</span>
                  </InsetCell>
                  <InsetCell>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 8px', borderRadius: 5,
                      background: `oklch(0.95 0.04 ${ch.hue})`,
                      color: `oklch(0.40 0.13 ${ch.hue})`,
                      border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${ch.hue}) 25%, transparent)`,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      <Icon d={ch.icon} size={10} /> {ch.label.replace(' Leave', '').replace(' Payroll', '').replace(' Payoneer', '')}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: r.status === 'Cancelled' || r.status === 'Rejected' ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                      textDecoration: r.status === 'Cancelled' ? 'line-through' : 'none',
                    }}>
                      {r.amt}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <Badge tone={r.tone} dot>{r.status}</Badge>
                    {r.reason && (
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 2, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.reason}
                      </div>
                    )}
                  </InsetCell>
                  <InsetCell last align="right">
                    {r.status === 'Pending' && (
                      <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', cursor: 'pointer', fontWeight: 500 }}>Cancel</span>
                    )}
                    {r.entry && (
                      <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Entry <Icon d={I.arrowR} size={11} />
                      </span>
                    )}
                  </InsetCell>
                </InsetRow>
              );
            })}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      <div style={{
        marginTop: 14, fontSize: 12, color: 'var(--fn-fg-muted)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
        Estimates lock to a snapshot once your manager approves. The <strong style={{ fontWeight: 600 }}>Entries</strong> tab shows the canonical paid records.
      </div>
    </>
  );
}

function TabPill({ label, count, active }) {
  return (
    <div style={{
      padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 8,
      borderBottom: active ? '2px solid var(--fn-accent)' : '2px solid transparent',
      marginBottom: -1, cursor: 'pointer',
    }}>
      <span style={{
        fontSize: 13.5, fontWeight: active ? 600 : 500,
        color: active ? 'var(--fn-fg)' : 'var(--fn-fg-muted)',
        letterSpacing: '-0.005em',
      }}>{label}</span>
      <span style={{
        fontSize: 10.5, padding: '1px 7px', borderRadius: 99, fontWeight: 600,
        background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-inset)',
        color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
        fontVariantNumeric: 'tabular-nums',
      }}>{count}</span>
    </div>
  );
}

function MyOvertimeEmpty() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
            My space
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            My overtime
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 580 }}>
            Log overtime when you work beyond standard hours — your manager approves, then it's paid out.
          </p>
        </div>
        <Button icon={I.plus}>Log overtime</Button>
      </div>

      <Card padded={false}>
        <div style={{ padding: '14px 22px 0', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            <TabPill label="Requests" count={0} active />
            <TabPill label="Entries" count={0} />
          </div>
        </div>
        <div style={{ padding: '48px 28px' }}>
          <EmptyState
            icon={I.zap}
            title="No overtime logged yet"
            body="When you work beyond standard hours, log it here so it can be reviewed and compensated through PKR payroll, USD payout, or comp-off leave."
            primary={{ label: 'Log your first overtime', icon: I.plus }}
            secondary={{ label: 'How OT works', icon: I.eye }}
            helpers={
              <span>
                <strong style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>Tip:</strong> Submit before you start the work whenever possible — post-hoc claims need extra approval.
              </span>
            }
          />
        </div>
      </Card>
    </>
  );
}

Object.assign(window, { MyOvertimePortal });
