// Brief 6 — Payroll Run detail page
// PKR salary disbursement run with full per-employee breakdown

const PAYROLL_ROWS = [
  { eid: 'EMP-0042', emp: 'Bilal Rauf', role: 'Sr. Engineer', dept: 'Engineering', hue: 280, days: { present: 19, leave: 1, lwp: 1, absent: 1 }, base: 200000, lwp: -9091, absent: -9091, other: 0, ot: 10227, bonus: 0, otCount: 1, held: false, flag: null },
  { eid: 'EMP-0019', emp: 'Sana Lateef', role: 'BD Lead', dept: 'BD', hue: 175, days: { present: 22, leave: 0, lwp: 0, absent: 0 }, base: 185000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 0, otCount: 0, held: false },
  { eid: 'EMP-0055', emp: 'Omar Sheikh', role: 'Sr. Engineer', dept: 'Engineering', hue: 175, days: { present: 20, leave: 2, lwp: 0, absent: 0 }, base: 210000, lwp: 0, absent: 0, other: 0, ot: 8000, bonus: 0, otCount: 1, held: false },
  { eid: 'EMP-0067', emp: 'Faraz Iqbal', role: 'Engineer', dept: 'Engineering', hue: 200, days: { present: 14, leave: 0, lwp: 8, absent: 0 }, base: 140000, lwp: -50909, absent: 0, other: -5000, ot: 0, bonus: 0, otCount: 0, held: true, holdReason: '8 days LWP needs HR confirmation', flag: 'attention' },
  { eid: 'EMP-0033', emp: 'Talha Mansoor', role: 'BD Manager', dept: 'BD', hue: 65, days: { present: 22, leave: 0, lwp: 0, absent: 0 }, base: 250000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 25000, bonusNote: 'Q1 performance bonus', otCount: 0, held: false },
  { eid: 'EMP-0061', emp: 'Maira Khan', role: 'BD Associate', dept: 'BD', hue: 145, days: { present: 21, leave: 1, lwp: 0, absent: 0 }, base: 120000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 0, otCount: 0, held: false },
  { eid: 'EMP-0073', emp: 'Hassan Tariq', role: 'Engineer', dept: 'Engineering', hue: 22, days: { present: 22, leave: 0, lwp: 0, absent: 0 }, base: 95000, lwp: 0, absent: 0, other: 0, ot: 10227, bonus: 0, otCount: 1, held: false },
  { eid: 'EMP-0014', emp: 'Daniyal Ahmed', role: 'Ops Lead', dept: 'Operations', hue: 280, days: { present: 22, leave: 0, lwp: 0, absent: 0 }, base: 165000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 0, otCount: 0, held: false, flag: 'no_bank' },
];

function fmtPKR(n, opts = {}) {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  return sign + (opts.noSymbol ? '' : '') + new Intl.NumberFormat('en-PK').format(v);
}

function PayrollRunDetail({ status = 'draft', overrideOpen = false, disburseOpen = false }) {
  const enriched = PAYROLL_ROWS.map(r => {
    const workingDays = 22;
    const gross = r.base + r.ot + r.bonus;
    const totalDed = -r.lwp - r.absent - r.other; // make positive
    const net = gross - totalDed;
    return { ...r, gross, totalDed, net, workingDays };
  });
  const totalNet = enriched.filter(r => !r.held).reduce((s, r) => s + r.net, 0);
  const totalOT = enriched.reduce((s, r) => s + r.ot, 0);
  const totalDeductions = enriched.reduce((s, r) => s + r.totalDed, 0);
  const heldCount = enriched.filter(r => r.held).length;

  const statusMeta = {
    draft: { label: 'Draft', tone: 'warning', cta: 'Submit for approval', ctaIcon: I.send, secondary: ['Recompute', 'Discard run'] },
    pending: { label: 'Pending approval', tone: 'info', cta: 'View approval status', ctaIcon: I.arrowR, secondary: ['Recall'] },
    approved: { label: 'Approved · ready to disburse', tone: 'accent', cta: 'Disburse', ctaIcon: I.send, secondary: ['Download draft CSV'] },
    disbursed: { label: 'Disbursed', tone: 'success', cta: 'Download bank CSV', ctaIcon: I.download, secondary: ['Download all payslips (ZIP)'] },
    locked: { label: 'Locked', tone: 'neutral', cta: 'Export', ctaIcon: I.download, secondary: [] },
  };
  const sm = statusMeta[status];
  const readonly = status !== 'draft';

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Payroll</span>
            <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Runs</span>
            <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
            <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>May 2026</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
              May 2026 payroll run
            </h1>
            <Badge tone={sm.tone} dot>{sm.label}</Badge>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fn-fg-muted)' }}>
            PKR salary disbursement · created by <strong style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>Asma Ali</strong> on 28 May 2026 · 28 employees
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {sm.secondary.map(s => <ToolbarPill key={s}>{s}</ToolbarPill>)}
          <Button icon={sm.ctaIcon}>{sm.cta}</Button>
        </div>
      </div>

      {/* Bank-accounts blocker (only in draft if any) */}
      {status === 'draft' && (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-warning-soft)',
          border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon
            d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            size={16} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)', flexShrink: 0 }}
          />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 700 }}>1 employee is missing a verified bank account.</strong> Disbursement will be blocked until <strong style={{ fontWeight: 600 }}>Daniyal Ahmed</strong> has a verified account on file.
          </div>
          <Button variant="secondary" size="sm" iconRight={I.arrowR}>Fix bank accounts</Button>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.card} label="Total net payable" value={`PKR ${(totalNet / 1000).toFixed(1)}k`} sub={`${enriched.length - heldCount} employees · excl. held`} info={false} />
        <KPI icon={I.zap} label="Overtime included" value={`PKR ${(totalOT / 1000).toFixed(1)}k`} sub="3 OT entries pulled" info={false} />
        <KPI icon={I.arrowD} label="Total deductions" value={`PKR ${(totalDeductions / 1000).toFixed(1)}k`} sub="LWP + absent + manual" deltaTone="danger" info={false} />
        <KPI icon={I.lock} label="Held entries" value={heldCount} sub="excluded from this run" deltaTone="warning" info={false} />
      </div>

      {/* Working-days strip */}
      <Card padded={false} style={{ marginBottom: 14 }}>
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 7,
              background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={14} />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>May 2026 calendar</div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>Used as the working-days baseline for every employee</div>
            </div>
          </div>
          <div style={{ height: 28, borderLeft: '1px solid var(--fn-divider)' }} />
          <CalStat label="Working days" value="22" />
          <CalStat label="Public holiday" value="1" sub="14 May · Labour Day" />
          <CalStat label="Weekend days" value="8" />
          <CalStat label="Total days" value="31" muted />
          <div style={{ flex: 1 }} />
          {!readonly && (
            <Button variant="secondary" size="sm" icon={I.edit}>Edit working days</Button>
          )}
        </div>
      </Card>

      {/* Filter bar */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Input icon={I.search} placeholder="Find by employee, EID…" style={{ height: 32, flex: 1, maxWidth: 260 }} />
        <ToolbarPill iconRight={I.chev} small>Department: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Active only</ToolbarPill>
        <ToolbarPill icon={I.lock} small>Held (1)</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>Showing {enriched.length} of 28 employees</span>
      </div>

      {/* Main table */}
      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: '', width: 36 },
            { label: 'Employee', width: 220 },
            { label: 'P / L / LWP / A', width: 130 },
            { label: 'Base', align: 'right', width: 95 },
            { label: 'LWP', align: 'right', width: 95 },
            { label: 'Absent', align: 'right', width: 90 },
            { label: 'Other', align: 'right', width: 90 },
            { label: 'OT', align: 'right', width: 100 },
            { label: 'Bonus', align: 'right', width: 90 },
            { label: 'Gross', align: 'right', width: 105 },
            { label: 'Net', align: 'right', width: 115 },
            { label: 'Hold', width: 60 },
            { label: '', width: 36 },
          ]}
        >
          <tbody>
            {enriched.map((r, i) => {
              const hasFlag = r.flag === 'attention' || r.flag === 'no_bank';
              return (
                <InsetRow
                  key={r.eid}
                  bordered={i < enriched.length - 1}
                  highlight={r.held ? 'var(--fn-bg-subtle)' : undefined}
                >
                  <InsetCell first>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: '1.5px solid var(--fn-border-strong)',
                      background: 'var(--fn-bg-panel)',
                      display: 'inline-block',
                    }} />
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: r.held ? 0.65 : 1 }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: `oklch(0.92 0.07 ${r.hue})`,
                        color: `oklch(0.38 0.16 ${r.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {r.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{r.emp}</span>
                          {r.flag === 'attention' && (
                            <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={12} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)' }} />
                          )}
                          {r.flag === 'no_bank' && (
                            <span title="No bank account" style={{ display: 'inline-flex' }}>
                              <Icon d={I.card} size={12} style={{ color: 'var(--fn-danger-soft-fg)' }} />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{r.role} · {r.eid}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'inline-flex', gap: 1, fontFamily: 'var(--fn-font-mono)', fontSize: 11, fontWeight: 600 }}>
                      <DayChip n={r.days.present} bg="oklch(0.94 0.04 175)" fg="oklch(0.40 0.13 175)" />
                      <DayChip n={r.days.leave} bg="oklch(0.94 0.04 280)" fg="oklch(0.42 0.16 280)" />
                      <DayChip n={r.days.lwp} bg="oklch(0.95 0.04 65)" fg="oklch(0.44 0.10 70)" />
                      <DayChip n={r.days.absent} bg="oklch(0.95 0.04 22)" fg="oklch(0.45 0.13 25)" />
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)' }}>
                      {fmtPKR(r.base)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      color: r.lwp < 0 ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg-faint)',
                    }}>
                      {r.lwp === 0 ? '—' : fmtPKR(r.lwp)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      color: r.absent < 0 ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg-faint)',
                    }}>
                      {r.absent === 0 ? '—' : fmtPKR(r.absent)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      color: r.other < 0 ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg-faint)',
                    }}>
                      {r.other === 0 ? '—' : fmtPKR(r.other)}
                      {!readonly && <Icon d={I.edit} size={10} style={{ opacity: 0.4, cursor: 'pointer' }} />}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    {r.ot > 0 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fn-success-soft-fg)', fontWeight: 600,
                      }} title={`${r.otCount} OT entries`}>
                        +{fmtPKR(r.ot)}
                        <span style={{
                          fontSize: 9, padding: '1px 4px', borderRadius: 3,
                          background: 'var(--fn-success-soft)',
                          color: 'var(--fn-success-soft-fg)', fontWeight: 700,
                        }}>{r.otCount}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>
                    )}
                  </InsetCell>
                  <InsetCell align="right">
                    {r.bonus > 0 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fn-success-soft-fg)', fontWeight: 600,
                      }} title={r.bonusNote}>
                        +{fmtPKR(r.bonus)}
                        {!readonly && <Icon d={I.edit} size={10} style={{ opacity: 0.4, cursor: 'pointer' }} />}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)',
                      }}>
                        —
                        {!readonly && <Icon d={I.edit} size={10} style={{ opacity: 0.3, cursor: 'pointer' }} />}
                      </span>
                    )}
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--fn-fg)' }}>
                      {fmtPKR(r.gross)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700, fontSize: 13.5,
                      color: r.held ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                      textDecoration: r.held ? 'line-through' : 'none',
                    }}>
                      {fmtPKR(r.net)}
                    </span>
                  </InsetCell>
                  <InsetCell>
                    <Toggle on={r.held} />
                  </InsetCell>
                  <InsetCell last align="right">
                    <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                  </InsetCell>
                </InsetRow>
              );
            })}

            {/* Subtotal row */}
            <InsetRow bordered={false} highlight="var(--fn-bg-subtle)">
              <InsetCell first colSpan={9} style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>
                  Run subtotal · {enriched.length - heldCount} active employees (1 held excluded)
                </span>
              </InsetCell>
              <InsetCell align="right" style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }}>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fn-fg-muted)' }}>
                  {fmtPKR(enriched.filter(r => !r.held).reduce((s, r) => s + r.gross, 0))}
                </span>
              </InsetCell>
              <InsetCell align="right" style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }}>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 16, color: 'var(--fn-fg)' }}>
                  {fmtPKR(totalNet)}
                </span>
              </InsetCell>
              <InsetCell last colSpan={2} style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }} />
            </InsetRow>
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {/* Day breakdown legend */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 18, fontSize: 12, color: 'var(--fn-fg-muted)', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>Day key:</span>
        <LegendDot bg="oklch(0.94 0.04 175)" fg="oklch(0.40 0.13 175)" n="P" label="Present" />
        <LegendDot bg="oklch(0.94 0.04 280)" fg="oklch(0.42 0.16 280)" n="L" label="Paid leave" />
        <LegendDot bg="oklch(0.95 0.04 65)" fg="oklch(0.44 0.10 70)" n="LWP" label="Leave without pay" />
        <LegendDot bg="oklch(0.95 0.04 22)" fg="oklch(0.45 0.13 25)" n="A" label="Absent — deducted" />
        <div style={{ flex: 1 }} />
        <Icon d={I.shield} size={12} style={{ color: 'var(--fn-fg-faint)' }} />
        <span>
          OT entries are pulled from approved entries with <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>channel = pkr_payroll</span> for May 2026.
        </span>
      </div>

      {overrideOpen && <OverridePopover />}
      {disburseOpen && <DisburseModal totalNet={totalNet} count={enriched.length - heldCount} />}
    </>
  );
}

function CalStat({ label, value, sub, muted }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{
        marginTop: 3, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', color: muted ? 'var(--fn-fg-muted)' : 'var(--fn-fg)',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function DayChip({ n, bg, fg }) {
  return (
    <span style={{
      width: 26, height: 22, borderRadius: 4,
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700,
    }}>{n}</span>
  );
}

function LegendDot({ bg, fg, n, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 22, height: 20, borderRadius: 4, background: bg, color: fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, fontFamily: 'var(--fn-font-mono)',
      }}>{n}</span>
      {label}
    </span>
  );
}

function OverridePopover() {
  return (
    <div style={{
      position: 'absolute', top: 600, left: 760, zIndex: 50, width: 320,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.25), 0 6px 12px -4px rgba(15, 17, 23, 0.12)',
    }}>
      <div style={{
        padding: '12px 16px 10px', borderBottom: '1px solid var(--fn-divider)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={I.edit} size={13} />
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Override bonus</div>
          <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Talha Mansoor · current — PKR 25,000</div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <SheetField label="New amount">
          <Input defaultValue="35,000" style={{ height: 36 }} suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PKR</span>} />
        </SheetField>
        <div style={{ height: 12 }} />
        <SheetField label="Reason (required)">
          <textarea
            rows={3}
            defaultValue="Increased Q1 bonus to reflect successful Northwind close — approved by CEO."
            style={{
              width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 12.5,
              fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
              background: 'var(--fn-bg-panel)',
              border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
            }}
          />
        </SheetField>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fn-fg-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon d={I.shield} size={11} />
          Logged in audit as <span style={{ fontFamily: 'var(--fn-font-mono)' }}>payroll.entry.override</span>
        </div>
      </div>
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm" icon={I.check}>Save override</Button>
      </div>
    </div>
  );
}

function DisburseModal({ totalNet, count }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.45)', zIndex: 50,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 540, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px 14px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.lock} size={16} stroke={2} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)' }}>Disburse May 2026 payroll?</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>
              This action is <strong style={{ fontWeight: 700 }}>irreversible</strong>. Payslip emails go out immediately.
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{
            padding: 14, borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
          }}>
            <DisburseStat label="Total to disburse" value={`PKR ${(totalNet / 1000).toFixed(1)}k`} mono />
            <DisburseStat label="Recipients" value={`${count} employees`} />
            <DisburseStat label="Bank CSV" value="generated" sub="generic format" />
            <DisburseStat label="Payslip PDFs" value={`${count} files`} sub="PDF/A-1b" />
          </div>

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-warning-soft)', border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
            fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Icon d={I.shield} size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              Once disbursed: run is locked, 3 OT entries flip to <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600 }}>status: paid</span>, payslips email immediately. Corrections require a new compensating run.
            </span>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--fn-fg)' }}>
              Type <span style={{ fontFamily: 'var(--fn-font-mono)', padding: '1px 6px', borderRadius: 4, background: 'var(--fn-bg-inset)', fontSize: 11.5 }}>DISBURSE MAY 2026</span> to confirm
            </label>
            <Input
              defaultValue="DISBURSE MAY 20"
              suffix={<span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--fn-accent)', verticalAlign: 'middle' }} />}
              style={{ height: 40, fontFamily: 'var(--fn-font-mono)', fontSize: 13, fontWeight: 600 }}
            />
          </div>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.send}>Disburse & lock run</Button>
        </div>
      </div>
    </>
  );
}

function DisburseStat({ label, value, sub, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{
        marginTop: 4, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)',
        fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, { PayrollRunDetail });
