// Brief 25 — Employee Loans · admin + amortization view

const LOANS = [
  { id: 'l1', date: '15 Jul 2025', emp: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, principal: 500000, outstanding: 240000, rate: 5, term: 24, emi: 22000, next: 'Jun 2026', status: 'Active', tone: 'info', selected: true },
  { id: 'l2', date: '01 Mar 2026', emp: 'Talha Mansoor', role: 'BD Manager', hue: 65, principal: 800000, outstanding: 720000, rate: 6, term: 36, emi: 24380, next: 'Jun 2026', status: 'Active', tone: 'info' },
  { id: 'l3', date: '12 Jan 2026', emp: 'Sana Lateef', role: 'BD Lead', hue: 175, principal: 300000, outstanding: 175000, rate: 5, term: 18, emi: 17500, next: 'Jun 2026', status: 'Active', tone: 'info' },
  { id: 'l4', date: '08 Nov 2025', emp: 'Omar Sheikh', role: 'Sr. Engineer', hue: 175, principal: 250000, outstanding: 87500, rate: 4.5, term: 12, emi: 21300, next: 'Jun 2026', status: 'Active', tone: 'info', pfBacked: true },
  { id: 'l5', date: '05 Aug 2024', emp: 'Faraz Iqbal', role: 'Engineer', hue: 200, principal: 400000, outstanding: 0, rate: 5, term: 24, emi: 17570, next: '—', status: 'Fully repaid', tone: 'success' },
  { id: 'l6', date: '15 Apr 2024', emp: 'Awais Mahmood', role: 'BD Associate', hue: 65, principal: 150000, outstanding: 32000, rate: 0, term: 12, emi: 12500, next: '—', status: 'Defaulted', tone: 'danger' },
];

function LoansAdmin({ view = 'list', issueOpen = false, prepayOpen = false, restructured = false }) {
  if (view === 'detail') return <LoanDetail restructured={restructured} prepayOpen={prepayOpen} />;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Employee loans
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            Long-term loans to employees, repaid via payroll deductions. Interest configurable per loan.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.cog}>Loan policy</ToolbarPill>
          <Button icon={I.plus}>Issue loan</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.card} label="Outstanding portfolio" value="PKR 1.22M" sub="across 4 active loans" info={false} />
        <KPI icon={I.arrowD} label="This month repayments" value="PKR 85k" sub="auto-deducted from payroll" info={false} />
        <KPI icon={I.zap} label="Interest accrued YTD" value="PKR 42k" sub="for accounting" info={false} />
        <KPI icon={I.shield} label="Active loans" value="4" sub="1 PF-backed · 1 defaulted" deltaTone="warning" delta="1 default" deltaTrend="down" />
      </div>

      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Input icon={I.search} placeholder="Find by employee…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Amount: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>This year</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{LOANS.length} loans</span>
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Issued', width: 110 },
            { label: 'Employee', width: 220 },
            { label: 'Principal', align: 'right', width: 130 },
            { label: 'Outstanding', align: 'right', width: 200 },
            { label: 'Rate', align: 'right', width: 80 },
            { label: 'Term', align: 'right', width: 80 },
            { label: 'EMI', align: 'right', width: 110 },
            { label: 'Next', width: 100 },
            { label: 'Status', width: 130 },
          ]}
        >
          <tbody>
            {LOANS.map((l, i) => (
              <InsetRow key={l.id} bordered={i < LOANS.length - 1} highlight={l.selected ? 'var(--fn-accent-soft)' : undefined}>
                <InsetCell first>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{l.date}</span>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `oklch(0.92 0.07 ${l.hue})`, color: `oklch(0.38 0.16 ${l.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {l.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{l.emp}</span>
                        {l.pfBacked && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                            background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', letterSpacing: '0.04em',
                          }}>PF-BACKED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{l.role}</div>
                    </div>
                  </div>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    PKR {fmtPK(l.principal)}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                      color: l.outstanding === 0 ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                    }}>
                      PKR {fmtPK(l.outstanding)}
                    </span>
                    <div style={{ width: 130, height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${l.principal === 0 ? 0 : ((l.principal - l.outstanding) / l.principal) * 100}%`,
                        background: l.status === 'Fully repaid' ? 'var(--fn-success)' : l.status === 'Defaulted' ? 'var(--fn-danger)' : 'var(--fn-accent)',
                      }} />
                    </div>
                  </div>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>{l.rate}%</span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>{l.term}mo</span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>PKR {fmtPK(l.emi)}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: l.next === '—' ? 'var(--fn-fg-faint)' : 'var(--fn-fg-muted)' }}>{l.next}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={l.tone} dot>{l.status}</Badge>
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {issueOpen && <IssueLoanSheet />}
    </>
  );
}

function LoanDetail({ restructured, prepayOpen }) {
  const monthsTotal = 24;
  const monthsPaid = 12;
  const principal = 500000;
  const emi = 22000;
  const totalPaid = 264000;
  const remaining = monthsTotal - monthsPaid;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
        <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Loans</span>
        <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>L-2025-042 · Bilal Rauf</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
            }}>BR</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
                Loan L-2025-042 · Bilal Rauf
              </h1>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fn-fg-muted)' }}>
                PKR 500,000 over 24 months at 5% reducing balance · issued 15 Jul 2025
              </div>
            </div>
          </div>
        </div>
        <Badge tone="info" dot>Active · 50% repaid</Badge>
      </div>

      {restructured && (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-warning-soft)',
          border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon d={I.edit} size={14} style={{ color: 'var(--fn-warning-soft-fg)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--fn-warning-soft-fg)' }}>
            <strong style={{ fontWeight: 700 }}>Loan restructured 15 Dec 2025.</strong> Original schedule preserved in audit. Current schedule below reflects the restructured terms.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
        {/* Left: amortization */}
        <div>
          <Card padded={false}>
            <SectionHeader
              icon={I.chart}
              title="Outstanding balance over time"
              padding="18px 22px 14px"
              right={<ToolbarPill iconRight={I.chev} small>24-month view</ToolbarPill>}
            />
            <div style={{ padding: '0 22px 18px' }}>
              <BalanceChart monthsTotal={monthsTotal} monthsPaid={monthsPaid} principal={principal} emi={emi} />
            </div>
          </Card>

          <Card padded={false} style={{ marginTop: 18 }}>
            <SectionHeader
              icon={I.calc}
              title="Amortization schedule"
              badge={<Badge tone="neutral">24 months</Badge>}
              padding="18px 22px 14px"
              right={<ToolbarPill small icon={I.download}>Export</ToolbarPill>}
            />
            <InsetTable
              padding={14}
              cols={[
                { label: 'Month', width: 100 },
                { label: 'EMI', align: 'right', width: 100 },
                { label: 'Principal', align: 'right', width: 110 },
                { label: 'Interest', align: 'right', width: 100 },
                { label: 'Cumulative', align: 'right', width: 130 },
                { label: 'Outstanding', align: 'right', width: 130 },
                { label: 'Status', width: 110 },
              ]}
            >
              <tbody>
                {Array.from({ length: 15 }).map((_, i) => {
                  const month = i + 1;
                  const isPaid = month <= monthsPaid;
                  const isCurrent = month === monthsPaid + 1;
                  const isRestructured = restructured && month === 6;
                  const principalPortion = 19917 + i * 84;
                  const interestPortion = emi - principalPortion;
                  const cumulative = principalPortion * month;
                  const outstanding = principal - cumulative;
                  const mNames = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26'];
                  return (
                    <InsetRow
                      key={month}
                      bordered={i < 14}
                      highlight={
                        isCurrent ? 'var(--fn-accent-soft)' :
                        isRestructured ? 'var(--fn-warning-soft)' :
                        isPaid ? 'color-mix(in oklch, var(--fn-success-soft) 35%, transparent)' :
                        undefined
                      }
                    >
                      <InsetCell first>
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: isCurrent ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)', fontWeight: isCurrent ? 600 : 500 }}>
                          {mNames[i]}
                        </span>
                      </InsetCell>
                      <InsetCell align="right">
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {fmtPK(emi)}
                        </span>
                      </InsetCell>
                      <InsetCell align="right">
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-success-soft-fg)' }}>
                          {fmtPK(principalPortion)}
                        </span>
                      </InsetCell>
                      <InsetCell align="right">
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-warning-soft-fg)' }}>
                          {fmtPK(interestPortion)}
                        </span>
                      </InsetCell>
                      <InsetCell align="right">
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>
                          {fmtPK(cumulative)}
                        </span>
                      </InsetCell>
                      <InsetCell align="right">
                        <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {fmtPK(outstanding)}
                        </span>
                      </InsetCell>
                      <InsetCell>
                        {isRestructured ? (
                          <Badge tone="warning" dot>Restructured</Badge>
                        ) : isCurrent ? (
                          <Badge tone="accent" dot>Scheduled</Badge>
                        ) : isPaid ? (
                          <Badge tone="success" dot>Paid</Badge>
                        ) : (
                          <Badge tone="neutral" dot>Scheduled</Badge>
                        )}
                      </InsetCell>
                    </InsetRow>
                  );
                })}
                <InsetRow bordered={false}>
                  <InsetCell first colSpan={7}>
                    <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 11.5, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                      … 9 more months · view full schedule →
                    </div>
                  </InsetCell>
                </InsetRow>
              </tbody>
            </InsetTable>
            <div style={{ height: 14 }} />
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card padded={false}>
            <SectionHeader icon={I.shield} title="Summary" padding="18px 22px 14px" />
            <div style={{ padding: '0 22px 18px' }}>
              <ConfigRow label="Principal" value={`PKR ${fmtPK(principal)}`} mono />
              <ConfigRow label="Interest rate" value="5% per annum" sub="reducing balance" mono />
              <ConfigRow label="Term" value="24 months" mono />
              <ConfigRow label="Issue date" value="15 Jul 2025" mono />
              <ConfigRow label="Approved by" value="Asma Ali · 14 Jul 2025" />
              <ConfigRow label="Reason" value="Wedding expenses" />
            </div>
          </Card>

          <Card padded={false}>
            <SectionHeader icon={I.calc} title="Repayment status" padding="18px 22px 14px" />
            <div style={{ padding: '0 22px 18px' }}>
              <RepayStat label="Total paid" value={`PKR ${fmtPK(totalPaid)}`} highlight="success" />
              <RepayStat label="Interest paid YTD" value="PKR 18,400" />
              <RepayStat label="Outstanding principal" value={`PKR ${fmtPK(240000)}`} highlight="accent" />
              <RepayStat label="Outstanding interest" value="PKR 24,000" />
              <RepayStat label="Estimated payoff" value="Jun 2027" sub="at current pace" />
            </div>
          </Card>

          <Card padded={false}>
            <SectionHeader icon={I.zap} title="Actions" padding="18px 22px 14px" />
            <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="secondary" full icon={I.edit} size="sm" style={{ justifyContent: 'flex-start' }}>Modify loan</Button>
              <Button variant="secondary" full icon={I.arrowU} size="sm" style={{ justifyContent: 'flex-start' }}>Make prepayment</Button>
              <Button variant="secondary" full icon={I.layers} size="sm" style={{ justifyContent: 'flex-start' }}>Restructure</Button>
              <Button variant="secondary" full icon={I.doc} size="sm" style={{ justifyContent: 'flex-start' }}>View loan agreement</Button>
              <div style={{ height: 6, borderTop: '1px dashed var(--fn-divider)', marginTop: 4 }} />
              <Button variant="secondary" full icon="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size="sm" style={{ justifyContent: 'flex-start', color: 'var(--fn-danger-soft-fg)' }}>Mark defaulted</Button>
            </div>
          </Card>
        </div>
      </div>

      {prepayOpen && <PrepaymentModal />}
    </>
  );
}

function BalanceChart({ monthsTotal, monthsPaid }) {
  // 24 data points showing decreasing balance
  const W = 800, H = 200, padL = 50, padR = 16, padT = 14, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = innerW / (monthsTotal - 1);
  const points = Array.from({ length: monthsTotal }).map((_, i) => {
    const x = padL + i * stepX;
    const ratio = 1 - (i / monthsTotal);
    const y = padT + innerH * (1 - ratio);
    return { x, y, month: i + 1, balance: 500000 - i * 20833 };
  });
  const todayX = padL + monthsPaid * stepX;
  const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const pathToToday = points.slice(0, monthsPaid + 1).map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="lnA" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--fn-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--fn-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = padT + innerH * (1 - v / 100);
          return (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--fn-divider)" />
              <text x={padL - 6} y={y + 3} fontSize="10" textAnchor="end" fill="var(--fn-fg-faint)" fontFamily="var(--fn-font-mono)">
                {fmtPK(500000 * v / 100 / 1000)}k
              </text>
            </g>
          );
        })}
        {/* Future area faded */}
        <path d={`${path} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`} fill="url(#lnA)" opacity="0.4" />
        <path d={path} fill="none" stroke="var(--fn-accent)" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
        <path d={pathToToday} fill="none" stroke="var(--fn-accent)" strokeWidth="2.5" />
        {/* Today marker */}
        <line x1={todayX} x2={todayX} y1={padT} y2={padT + innerH} stroke="var(--fn-fg)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
        <circle cx={todayX} cy={points[monthsPaid].y} r="5" fill="var(--fn-accent)" stroke="#fff" strokeWidth="2" />
        <text x={todayX} y={padT - 4} fontSize="10" textAnchor="middle" fill="var(--fn-fg)" fontFamily="var(--fn-font-mono)" fontWeight="600">Today</text>
        {/* x-axis labels */}
        {[1, 6, 12, 18, 24].map(m => {
          const x = padL + (m - 1) * stepX;
          return <text key={m} x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--fn-fg-faint)" fontFamily="var(--fn-font-mono)">M{m}</text>;
        })}
      </svg>
    </div>
  );
}

function RepayStat({ label, value, sub, highlight }) {
  const color = highlight === 'success' ? 'var(--fn-success-soft-fg)' : highlight === 'accent' ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)';
  return (
    <div style={{
      padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: '1px dashed var(--fn-divider)',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color, letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

function IssueLoanSheet() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 720, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.card} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Issue employee loan</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>Routes through Finance Manager approval before disbursement</div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <SheetField label="Employee">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42, background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.92 0.07 65)', color: 'oklch(0.38 0.16 65)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>TM</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Talha Mansoor</div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>BD Manager · EMP-0033</div>
              </div>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{
            marginTop: 14, padding: 14, borderRadius: 8,
            background: 'var(--fn-success-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-success) 25%, transparent)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-success-soft-fg)', marginBottom: 6 }}>Eligibility check</div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-success-soft-fg)', lineHeight: 1.55 }}>
              No active loans · Eligible for up to <strong style={{ fontWeight: 700 }}>PKR 1,500,000</strong> (6 months basic salary) · Max one active loan per policy.
            </div>
          </div>

          <div style={{ height: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SheetField label="Principal amount">
              <Input defaultValue="800,000" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PKR</span>} style={{ height: 42, fontWeight: 600, fontFamily: 'var(--fn-font-mono)' }} />
            </SheetField>
            <SheetField label="Interest rate" hint="Per annum">
              <Input defaultValue="6" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>%</span>} style={{ height: 42, fontFamily: 'var(--fn-font-mono)' }} />
            </SheetField>
          </div>

          <div style={{ height: 14 }} />
          <SheetField label="Interest method">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <PlanCard title="Reducing balance" sub="Interest on outstanding · industry standard" active />
              <PlanCard title="Flat rate" sub="Interest on principal · simpler · more expensive" />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SheetField label="Term">
              <Input defaultValue="36" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>months</span>} style={{ height: 42, fontFamily: 'var(--fn-font-mono)' }} />
            </SheetField>
            <SheetField label="First deduction">
              <Input defaultValue="Jun 2026 payroll" style={{ height: 42 }} />
            </SheetField>
          </div>

          <div style={{
            marginTop: 14, padding: 16, borderRadius: 10,
            background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
            border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-accent-soft-fg)', marginBottom: 10 }}>
              EMI calculator preview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <SampleStat label="Monthly EMI" value="PKR 24,380" highlight />
              <SampleStat label="Total payable" value="PKR 877,680" />
              <SampleStat label="Total interest" value="PKR 77,680" sub="over 36 months" />
            </div>
          </div>

          <div style={{ height: 14 }} />
          <SheetField label="Purpose">
            <textarea
              rows={3}
              placeholder="What's the loan for? Used in the loan agreement document."
              defaultValue="House renovation · employee residence in Karachi"
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </SheetField>

          <div style={{ height: 14 }} />
          <SheetField label="Loan agreement template" hint="Auto-generated and attached on approval">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42, background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={I.doc} size={13} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Standard employee loan agreement · v4</span>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.send}>Submit for approval</Button>
        </div>
      </div>
    </>
  );
}

function PrepaymentModal() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.45)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 560, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={I.arrowU} size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Make prepayment · L-2025-042</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Outstanding PKR 240,000 · 12 months remaining</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <SheetField label="Prepayment amount">
            <Input defaultValue="100,000" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PKR</span>} style={{ height: 42, fontWeight: 600, fontFamily: 'var(--fn-font-mono)' }} />
          </SheetField>

          <div style={{ height: 14 }} />
          <SheetField label="Apply prepayment to">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <PlanCard title="Reduce term" sub="Same EMI · shorter payoff" active />
              <PlanCard title="Reduce EMI" sub="Same term · smaller deductions" />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />
          <SheetField label="Effective payroll month">
            <Input defaultValue="Jun 2026" style={{ height: 42 }} />
          </SheetField>

          <div style={{
            marginTop: 16, padding: 14, borderRadius: 8,
            background: 'var(--fn-success-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-success) 25%, transparent)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-success-soft-fg)', marginBottom: 6 }}>
              Impact preview
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-success-soft-fg)', lineHeight: 1.6 }}>
              After PKR 100,000 prepayment: term shortens by <strong style={{ fontWeight: 700 }}>5 months</strong> · payoff <strong style={{ fontWeight: 700 }}>May 2027 (was Oct 2027)</strong> · total interest saved <strong style={{ fontWeight: 700 }}>PKR 8,400</strong>.
            </div>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.check}>Confirm prepayment</Button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { LoansAdmin });
