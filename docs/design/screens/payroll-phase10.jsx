// Brief 27 — Payroll Run detail (Phase 10 extensions)
// Adds tax/EOBI/PF/bonus/loan columns + entry detail drawer + compliance modal

const P10_ROWS = [
  { eid: 'EMP-0042', emp: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, days: { p: 19, l: 1, lwp: 1, a: 1 }, base: 200000, lwp: -9091, absent: -9091, other: 0, ot: 10227, bonus: 0, tax: -18400, eobi: -320, pf: -16660, gratuity: 16660, advance: -25000, loan: -22000, selected: true },
  { eid: 'EMP-0019', emp: 'Sana Lateef', role: 'BD Lead', hue: 175, days: { p: 22, l: 0, lwp: 0, a: 0 }, base: 185000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 0, tax: -14688, eobi: -320, pf: -15411, gratuity: 15411, advance: 0, loan: -17500 },
  { eid: 'EMP-0055', emp: 'Omar Sheikh', role: 'Sr. Engineer', hue: 175, days: { p: 20, l: 2, lwp: 0, a: 0 }, base: 210000, lwp: 0, absent: 0, other: 0, ot: 8000, bonus: 0, tax: -16500, eobi: -320, pf: -17493, gratuity: 17493, advance: 0, loan: -21300 },
  { eid: 'EMP-0033', emp: 'Talha Mansoor', role: 'BD Manager', hue: 65, days: { p: 22, l: 0, lwp: 0, a: 0 }, base: 250000, lwp: 0, absent: 0, other: 0, ot: 0, bonus: 150000, bonusNote: 'Q1 performance', tax: -32500, eobi: -320, pf: -20825, gratuity: 20825, advance: 0, loan: 0 },
  { eid: 'EMP-0067', emp: 'Faraz Iqbal', role: 'Engineer', hue: 200, days: { p: 14, l: 0, lwp: 8, a: 0 }, base: 140000, lwp: -50909, absent: 0, other: 0, ot: 0, bonus: 0, tax: -2275, eobi: -320, pf: -11662, gratuity: 11662, advance: 0, loan: 0, held: true },
];

function fmt(n) {
  const sign = n < 0 ? '-' : '';
  return sign + new Intl.NumberFormat('en-US').format(Math.abs(n));
}

function PayrollPhase10({ entryOpen = false, compliance = null, cols = 'full' }) {
  const rows = P10_ROWS;
  const totals = rows.reduce((s, r) => {
    s.tax += r.tax; s.eobi += r.eobi; s.pf += r.pf; s.bonus += r.bonus;
    s.advance += r.advance; s.loan += r.loan;
    return s;
  }, { tax: 0, eobi: 0, pf: 0, bonus: 0, advance: 0, loan: 0 });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fn-fg-muted)', marginBottom: 14 }}>
        <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Payroll</span>
        <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Runs</span>
        <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>May 2026 · with statutory</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em' }}>May 2026 payroll run</h1>
            <Badge tone="warning" dot>Draft</Badge>
            <Badge tone="accent">Phase 10 · with FBR + EOBI + PF</Badge>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fn-fg-muted)' }}>
            FY 2025-26 tax slabs applied · 28 employees · 1 held · created by Asma Ali
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.download}>Bank CSV</ToolbarPill>
          <Button icon={I.send}>Submit for approval</Button>
        </div>
      </div>

      {/* Validation banners */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-warning-soft)',
        border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--fn-warning-soft-fg)', flex: 1 }}>
          <strong style={{ fontWeight: 700 }}>3 approved bonuses</strong> for May 2026 are pending pickup. They will be included on next save.
        </span>
        <Button size="sm" variant="secondary" iconRight={I.arrowR}>Pull in</Button>
      </div>

      {/* Extended KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon={I.card} label="Net payable" value="PKR 4.2M" sub="27 active employees" info={false} />
        <KPI icon={I.arrowD} label="Tax withheld" value={`PKR ${fmt(-totals.tax / 1000)}k`} sub="FY 25-26 slabs · view breakdown" info={false} />
        <KPI icon={I.shield} label="EOBI" value={`PKR ${fmt(-totals.eobi)}`} sub="employee + 5× employer" info={false} />
        <KPI icon={I.card} label="PF" value={`PKR ${fmt(-totals.pf / 1000)}k`} sub="emp + matching employer" info={false} />
        <KPI icon={I.zap} label="Bonuses + OT" value={`PKR ${fmt((totals.bonus + 18227) / 1000)}k`} sub="bonuses · weekend OT" deltaTone="success" info={false} />
      </div>

      {/* Filter + Columns toggle */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Input icon={I.search} placeholder="Find employee…" style={{ height: 32, flex: 1, maxWidth: 240 }} />
        <ToolbarPill iconRight={I.chev} small>Department: All</ToolbarPill>
        <ToolbarPill icon={I.lock} small>Held (1)</ToolbarPill>
        <div style={{ flex: 1 }} />
        <ToolbarPill icon={I.layers} small iconRight={I.chev}>
          Columns · {cols === 'full' ? '11 visible' : '6 visible'}
        </ToolbarPill>
        {cols === 'popover' && <ColumnsPopover />}
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: '', width: 36 },
            { label: 'Employee', width: 200 },
            { label: 'Days', width: 130 },
            { label: 'Base', align: 'right', width: 100 },
            { label: 'Tax', align: 'right', width: 110 },
            { label: 'EOBI', align: 'right', width: 80 },
            { label: 'PF', align: 'right', width: 100 },
            { label: 'Bonus', align: 'right', width: 130 },
            { label: 'OT', align: 'right', width: 90 },
            { label: 'Adv/Loan', align: 'right', width: 120 },
            { label: 'Net', align: 'right', width: 120 },
            { label: '', width: 36 },
          ]}
        >
          <tbody>
            {rows.map((r, i) => {
              const gross = r.base + r.ot + r.bonus;
              const ded = r.lwp + r.absent + r.other + r.tax + r.eobi + r.pf + r.advance + r.loan;
              const net = gross + ded;
              return (
                <InsetRow key={r.eid} bordered={i < rows.length - 1} highlight={r.selected ? 'var(--fn-accent-soft)' : r.held ? 'var(--fn-bg-subtle)' : undefined}>
                  <InsetCell first>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid var(--fn-border-strong)', background: 'var(--fn-bg-panel)' }} />
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: r.held ? 0.65 : 1 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: `oklch(0.92 0.07 ${r.hue})`, color: `oklch(0.38 0.16 ${r.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>{r.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.emp}</span>
                          {r.held && <Icon d={I.lock} size={11} style={{ color: 'var(--fn-warning-soft-fg)' }} />}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{r.role} · {r.eid}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'inline-flex', gap: 1, fontFamily: 'var(--fn-font-mono)', fontSize: 10.5, fontWeight: 700 }}>
                      <span style={{ width: 22, height: 20, borderRadius: 3, background: 'oklch(0.94 0.04 175)', color: 'oklch(0.40 0.13 175)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.days.p}</span>
                      <span style={{ width: 22, height: 20, borderRadius: 3, background: 'oklch(0.94 0.04 280)', color: 'oklch(0.42 0.16 280)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.days.l}</span>
                      <span style={{ width: 22, height: 20, borderRadius: 3, background: 'oklch(0.95 0.04 65)', color: 'oklch(0.44 0.10 70)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.days.lwp}</span>
                      <span style={{ width: 22, height: 20, borderRadius: 3, background: 'oklch(0.95 0.04 22)', color: 'oklch(0.45 0.13 25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.days.a}</span>
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.base)}</span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-danger-soft-fg)' }}>
                      {fmt(r.tax)}
                      <Icon d={I.eye} size={10} style={{ opacity: 0.5, cursor: 'pointer' }} />
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-danger-soft-fg)' }}>{fmt(r.eobi)}</span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-danger-soft-fg)' }}>{fmt(r.pf)}</span>
                  </InsetCell>
                  <InsetCell align="right">
                    {r.bonus > 0 ? (
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-success-soft-fg)', fontWeight: 600 }} title={r.bonusNote}>
                        +{fmt(r.bonus)}
                      </span>
                    ) : <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>}
                  </InsetCell>
                  <InsetCell align="right">
                    {r.ot > 0 ? (
                      <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-success-soft-fg)', fontWeight: 600 }}>+{fmt(r.ot)}</span>
                    ) : <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>}
                  </InsetCell>
                  <InsetCell align="right">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'var(--fn-font-mono)', fontSize: 11 }}>
                      {r.advance < 0 && <span style={{ color: 'var(--fn-danger-soft-fg)' }}>adv {fmt(r.advance)}</span>}
                      {r.loan < 0 && <span style={{ color: 'var(--fn-danger-soft-fg)' }}>loan {fmt(r.loan)}</span>}
                      {r.advance === 0 && r.loan === 0 && <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>}
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700, fontSize: 13,
                      color: r.held ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                      textDecoration: r.held ? 'line-through' : 'none',
                    }}>{fmt(net)}</span>
                  </InsetCell>
                  <InsetCell last>
                    <Icon d={I.eye} size={14} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                  </InsetCell>
                </InsetRow>
              );
            })}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {entryOpen && <EntryDetailDrawer />}
      {compliance && <ComplianceModal failed={compliance === 'fail'} />}
    </>
  );
}

function ColumnsPopover() {
  const cols = [
    { l: 'Employee', on: true, locked: true },
    { l: 'Days breakdown (P/L/LWP/A)', on: true },
    { l: 'Base', on: true },
    { l: 'LWP deduction', on: false },
    { l: 'Absent deduction', on: false },
    { l: 'Other deductions', on: false },
    { l: 'Income tax', on: true },
    { l: 'EOBI', on: true },
    { l: 'PF', on: true },
    { l: 'Gratuity accrual', on: false, hint: 'Informational only' },
    { l: 'Bonus', on: true },
    { l: 'Overtime', on: true },
    { l: 'Advance repayment', on: true },
    { l: 'Loan EMI', on: true },
    { l: 'Gross', on: false },
    { l: 'Net', on: true, locked: true },
  ];
  return (
    <div style={{
      position: 'absolute', top: 160, right: 32, zIndex: 30, width: 280,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.20)',
      padding: 4,
    }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--fn-divider)' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Visible columns</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>11 of 16 shown</div>
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto', padding: 4 }}>
        {cols.map((c, i) => (
          <div key={i} style={{
            padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 4, cursor: c.locked ? 'not-allowed' : 'pointer',
            opacity: c.locked ? 0.65 : 1,
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              background: c.on ? 'var(--fn-accent)' : 'var(--fn-bg-panel)',
              border: '1.5px solid ' + (c.on ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {c.on && <Icon d={I.check} size={9} stroke={3} style={{ color: '#fff' }} />}
            </span>
            <span style={{ fontSize: 12, color: 'var(--fn-fg)', flex: 1 }}>{c.l}</span>
            {c.locked && <Icon d={I.lock} size={10} style={{ color: 'var(--fn-fg-faint)' }} />}
            {c.hint && <span style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>{c.hint}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>Save as preset</span>
        <span style={{ fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Reset</span>
      </div>
    </div>
  );
}

function EntryDetailDrawer() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 640, zIndex: 51,
        background: 'var(--fn-bg-panel)', boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 8, background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>BR</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Bilal Rauf · May 2026 payslip</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>Sr. Engineer · EMP-0042 · gross PKR 210,227 · net PKR 119,656</div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
          {/* Tax breakdown card */}
          <Card padded={false}>
            <SectionHeader icon={I.scale} title="Tax breakdown" padding="14px 16px 10px" right={<Button size="sm" variant="secondary" iconRight={I.arrowR} style={{ height: 26 }}>View full</Button>} />
            <div style={{ padding: '0 16px 14px', fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.8 }}>
              <CalcRow label="Annualized income" value="PKR 2,522,724" />
              <CalcRow label="Annual tax (after rebates)" value="PKR 160,000" />
              <CalcRow label="÷ 12 + catch-up" value="PKR 18,400/mo" highlight bold />
            </div>
          </Card>

          {/* Statutory */}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card padded={false}>
              <SectionHeader icon={I.shield} title="EOBI" padding="12px 14px 8px" />
              <div style={{ padding: '0 14px 12px', fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, lineHeight: 1.7 }}>
                <CalcRow label="Employee" value="PKR 320" />
                <CalcRow label="Employer" value="PKR 1,600" />
              </div>
            </Card>
            <Card padded={false}>
              <SectionHeader icon={I.card} title="Provident Fund" padding="12px 14px 8px" />
              <div style={{ padding: '0 14px 12px', fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, lineHeight: 1.7 }}>
                <CalcRow label="Employee" value="PKR 16,660" />
                <CalcRow label="Employer match" value="PKR 16,660" />
                <CalcRow label="YTD interest" value="PKR 2,400" />
              </div>
            </Card>
          </div>

          {/* Deductions */}
          <Card padded={false} style={{ marginTop: 12 }}>
            <SectionHeader icon={I.arrowD} title="Deduction details" padding="14px 16px 10px" />
            <div style={{ padding: '0 16px 14px', fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.7 }}>
              <CalcRow label="LWP (1 day)" value="-PKR 9,091" />
              <CalcRow label="Absent (1 day)" value="-PKR 9,091" />
              <CalcRow label="Income tax" value="-PKR 18,400" />
              <CalcRow label="EOBI · employee" value="-PKR 320" />
              <CalcRow label="PF · employee" value="-PKR 16,660" />
              <CalcRow label="Advance repayment · view →" value="-PKR 25,000" />
              <CalcRow label="Loan EMI L-2025-042 · view →" value="-PKR 22,000" />
              <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                <CalcRow label="Total deductions" value="-PKR 100,562" bold highlight />
              </div>
            </div>
          </Card>

          {/* Additions */}
          <Card padded={false} style={{ marginTop: 12 }}>
            <SectionHeader icon={I.arrowU} title="Addition details" padding="14px 16px 10px" />
            <div style={{ padding: '0 16px 14px', fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.7 }}>
              <CalcRow label="Overtime · 6h weekend · view →" value="+PKR 10,227" />
              <CalcRow label="Bonus · this month" value="—" />
            </div>
          </Card>

          {/* YTD */}
          <Card padded={false} style={{ marginTop: 12 }}>
            <SectionHeader icon={I.clock} title="Year-to-date" padding="14px 16px 10px" />
            <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <SampleStat label="YTD gross" value="PKR 2.1M" />
              <SampleStat label="YTD net" value="PKR 1.4M" />
              <SampleStat label="YTD tax" value="PKR 92,890" />
              <SampleStat label="Projected annual" value="PKR 2.52M" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ComplianceModal({ failed }) {
  const checks = [
    { l: 'Tax slabs configured and valid for FY 2025-26', ok: true },
    { l: 'EOBI registered · contribution rates active', ok: true },
    { l: 'PF active · all employees enrolled', ok: true },
    { l: 'All employees have verified bank accounts', ok: !failed, sub: failed ? '1 employee missing: Daniyal Ahmed' : '84/84 verified' },
    { l: 'All employees have CNICs on file', ok: !failed, sub: failed ? '2 employees missing CNICs · payroll cannot disburse' : '84/84 on file', critical: true },
    { l: 'All required policy acknowledgments completed', ok: true, sub: 'last policy ack 2 days ago' },
    { l: 'OT entries reconciled with timesheets', ok: true, sub: '12 entries · 0 disputes' },
    { l: 'No payroll-affecting changes in past 24h', ok: true },
  ];
  const failures = checks.filter(c => !c.ok).length;
  const canDisburse = !failed || failures === 0;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.50)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 620, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 40, height: 40, borderRadius: 10,
              background: failed ? 'var(--fn-warning-soft)' : 'var(--fn-success-soft)',
              color: failed ? 'var(--fn-warning-soft-fg)' : 'var(--fn-success-soft-fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.shield} size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Pre-disbursement compliance check</div>
              <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 3 }}>
                {failed
                  ? `${failures} of 8 checks need attention before disbursement`
                  : 'All 8 checks passed · ready to disburse'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 22, maxHeight: 480, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checks.map((c, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 6,
                background: c.ok ? 'var(--fn-success-soft)' : 'var(--fn-danger-soft)',
                border: '1px solid ' + (c.ok ? 'color-mix(in oklch, var(--fn-success) 22%, transparent)' : 'color-mix(in oklch, var(--fn-danger) 28%, transparent)'),
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 99, flexShrink: 0, marginTop: 1,
                  background: c.ok ? 'var(--fn-success)' : 'var(--fn-danger)', color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={c.ok ? I.check : I.x} size={11} stroke={3} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: c.ok ? 'var(--fn-success-soft-fg)' : 'var(--fn-danger-soft-fg)' }}>
                      {c.l}
                    </span>
                    {c.critical && !c.ok && <Badge tone="danger">Critical</Badge>}
                  </div>
                  {c.sub && (
                    <div style={{ fontSize: 11, color: c.ok ? 'var(--fn-success-soft-fg)' : 'var(--fn-danger-soft-fg)', marginTop: 2, opacity: 0.85 }}>
                      {c.sub}
                    </div>
                  )}
                </div>
                {!c.ok && <Button size="sm" variant="secondary" iconRight={I.arrowR} style={{ height: 26 }}>Resolve</Button>}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.shield} size={11} /> Audit-logged · {failed ? 'override requires Super Admin' : 'all checks recorded'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm" icon={I.send} style={!canDisburse ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
              {canDisburse ? 'Continue to disburse' : 'Resolve to continue'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PayrollPhase10 });
