// Brief 8 — Payslip PDF (PKR)
// Single-page A4 layout — designed as if rendered for print

function PayslipPDF({ variant = 'standard' }) {
  const isDraft = variant === 'draft';
  const hasNoOT = variant === 'no_ot';
  const hasOverride = variant === 'override';

  const baseSalary = 200000;
  const overtime = hasNoOT ? 0 : 10227;
  const bonus = 0;
  const otherAdd = 0;
  const lwpDed = 9091;
  const absentDed = 9091;
  const otherDed = hasOverride ? 5000 : 0;
  const gross = baseSalary + overtime + bonus + otherAdd;
  const totalDed = lwpDed + absentDed + otherDed;
  const net = gross - totalDed;

  // Wrap entire payslip in scaled "paper" container
  return (
    <div style={{
      width: '100%', minHeight: '100%',
      padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      background: 'oklch(0.96 0.005 250)',
    }}>
      <div style={{
        width: 620, minHeight: 880,
        background: '#ffffff',
        boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.18), 0 6px 12px -4px rgba(15, 17, 23, 0.08)',
        border: '1px solid oklch(0.92 0.005 250)',
        position: 'relative', overflow: 'hidden',
        fontFamily: 'var(--fn-font-sans)', color: '#1a1a2e',
      }}>
        {/* DRAFT watermark */}
        {isDraft && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 1,
          }}>
            <span style={{
              fontSize: 140, fontWeight: 800, letterSpacing: '-0.05em',
              color: 'oklch(0.65 0.18 22 / 0.10)',
              transform: 'rotate(-28deg)', whiteSpace: 'nowrap',
              fontFamily: 'var(--fn-font-display)',
            }}>
              DRAFT
            </span>
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 2, padding: '28px 32px 24px' }}>
          {/* Branding strip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            paddingBottom: 14, borderBottom: '2px solid oklch(0.55 0.18 280)',
            marginBottom: 22,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'oklch(0.55 0.18 280)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em',
                fontFamily: 'var(--fn-font-display)',
                position: 'relative',
              }}>
                F
                <span style={{
                  position: 'absolute', right: 4, bottom: 4,
                  width: 4, height: 4, background: 'oklch(0.92 0.10 175)', borderRadius: 99,
                }} />
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a2e' }}>
                  Futurenostics
                </div>
                <div style={{ fontSize: 9.5, color: '#6e6e88', marginTop: 1, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Private Limited · Pakistan
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: '#6e6e88', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: '#3a3a55' }}>4-A, Block 6, P.E.C.H.S.</div>
              <div>Karachi 75400, Pakistan</div>
              <div style={{ fontFamily: 'var(--fn-font-mono)' }}>SECP: 0123456 · NTN: 9876543-2</div>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
              color: '#6e6e88',
            }}>
              Monthly salary statement
            </div>
            <h1 style={{
              margin: '6px 0 0', fontSize: 22, fontWeight: 600,
              letterSpacing: '-0.02em', color: '#1a1a2e',
            }}>
              Salary Payslip <span style={{ color: '#6e6e88', fontWeight: 400 }}>— May 2026</span>
            </h1>
            {hasOverride && (
              <div style={{
                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 8px', fontSize: 10, fontWeight: 600,
                background: 'oklch(0.95 0.05 65)', color: 'oklch(0.44 0.10 70)',
                borderRadius: 4, fontFamily: 'var(--fn-font-mono)',
              }}>
                Contains manual overrides
              </div>
            )}
          </div>

          {/* Employee block */}
          <div style={{
            padding: 16, borderRadius: 6,
            background: 'oklch(0.97 0.008 280)',
            border: '1px solid oklch(0.90 0.012 280)',
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <span style={{
                width: 42, height: 42, borderRadius: 8,
                background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em',
              }}>
                BR
              </span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.015em' }}>
                  Bilal Rauf
                </div>
                <div style={{ fontSize: 11.5, color: '#6e6e88', marginTop: 1 }}>
                  Senior Software Engineer · Engineering
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, paddingTop: 12, borderTop: '1px dashed oklch(0.86 0.012 280)' }}>
              <PslField label="EID" value="EMP-0042" mono />
              <PslField label="Department" value="Engineering" />
              <PslField label="Designation" value="Sr. Engineer · L3" />
              <PslField label="Joined" value="12 Aug 2023" />
            </div>
          </div>

          {/* Two columns: attendance + compensation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18, marginBottom: 18 }}>
            {/* Attendance */}
            <div>
              <PslSectionTitle>Attendance summary</PslSectionTitle>
              <div style={{
                border: '1px solid oklch(0.92 0.005 250)', borderRadius: 6, overflow: 'hidden',
              }}>
                <PslRow label="Working days in month" value="22" mono />
                <PslRow label="Days present" value="19" mono tone="success" />
                <PslRow label="Days on paid leave" value="1" mono tone="info" sub="Annual 1" />
                <PslRow label="Days on unpaid leave" value="1" mono tone="warning" />
                <PslRow label="Days absent (unauthorized)" value="1" mono tone="danger" last />
              </div>
            </div>

            {/* Compensation */}
            <div>
              <PslSectionTitle>Compensation summary</PslSectionTitle>
              <div style={{
                border: '1px solid oklch(0.92 0.005 250)', borderRadius: 6, overflow: 'hidden',
              }}>
                <PslMoneyRow label="Base salary" value={baseSalary} />
                {!hasNoOT && <PslMoneyRow label="Overtime" value={overtime} positive />}
                <PslMoneyRow label="Bonus" value={bonus} muted={bonus === 0} />
                <PslMoneyRow label="Other additions" value={otherAdd} muted={otherAdd === 0} />
                <PslMoneyRow label="Gross" value={gross} bold subtotal />
                <PslMoneyRow label="LWP deduction" value={-lwpDed} negative />
                <PslMoneyRow label="Absent deduction" value={-absentDed} negative />
                <PslMoneyRow label="Other deductions" value={-otherDed} negative muted={otherDed === 0} override={hasOverride && otherDed > 0} />
                <PslMoneyRow label="Total deductions" value={-totalDed} subtotal />
                {/* Net payable — emphasized */}
                <div style={{
                  padding: '12px 14px',
                  background: 'oklch(0.92 0.10 175)',
                  borderTop: '2px solid oklch(0.55 0.16 175)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'oklch(0.32 0.12 175)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Net payable
                  </span>
                  <span style={{
                    fontSize: 18, fontWeight: 700, color: 'oklch(0.32 0.14 175)',
                    fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                  }}>
                    PKR {fmtPkPK(net)}
                  </span>
                </div>
              </div>
              {hasOverride && (
                <div style={{
                  marginTop: 6, fontSize: 9.5, color: 'oklch(0.44 0.10 70)', lineHeight: 1.5,
                  display: 'flex', alignItems: 'flex-start', gap: 5,
                }}>
                  <span style={{ fontWeight: 700 }}>*</span>
                  <span>Manually overridden by HR (Asma Ali · 11 May 2026): "Loan repayment deduction · approved by employee."</span>
                </div>
              )}
            </div>
          </div>

          {/* Overtime breakdown */}
          {!hasNoOT && (
            <div style={{ marginBottom: 18 }}>
              <PslSectionTitle>Overtime breakdown</PslSectionTitle>
              <div style={{
                border: '1px solid oklch(0.92 0.005 250)', borderRadius: 6, overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                  <thead>
                    <tr style={{ background: 'oklch(0.97 0.005 250)' }}>
                      <th style={pslThStyle()}>Date</th>
                      <th style={pslThStyle()}>OT type</th>
                      <th style={pslThStyle('right')}>Hours</th>
                      <th style={pslThStyle()}>Rate basis</th>
                      <th style={pslThStyle('right')}>Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: '1px solid oklch(0.92 0.005 250)' }}>
                      <td style={pslTdStyle({ mono: true })}>17 May 2026</td>
                      <td style={pslTdStyle()}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: 'oklch(0.55 0.16 175)' }} />
                          Weekend Work
                        </span>
                      </td>
                      <td style={pslTdStyle({ align: 'right', mono: true })}>6.00</td>
                      <td style={pslTdStyle({ muted: true })}>150% of hourly</td>
                      <td style={pslTdStyle({ align: 'right', mono: true, bold: true })}>10,227.27</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid oklch(0.92 0.005 250)', background: 'oklch(0.97 0.005 250)' }}>
                      <td style={pslTdStyle({ bold: true })} colSpan={4}>Total overtime</td>
                      <td style={pslTdStyle({ align: 'right', mono: true, bold: true })}>10,227.27</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bank transfer */}
          <div style={{ marginBottom: 22 }}>
            <PslSectionTitle>Bank transfer details</PslSectionTitle>
            <div style={{
              padding: '12px 14px', borderRadius: 6,
              background: 'oklch(0.97 0.005 250)', border: '1px solid oklch(0.92 0.005 250)',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            }}>
              <PslField label="Bank" value="HBL" sub="Habib Bank Ltd" />
              <PslField label="Account title" value="Bilal Rauf" />
              <PslField label="Account no." value="•••• 4218" mono />
              <PslField label="Transfer date" value={isDraft ? '— pending —' : '02 Jun 2026'} />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            paddingTop: 14, borderTop: '1px solid oklch(0.92 0.005 250)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18,
          }}>
            <div style={{ flex: 1, fontSize: 9.5, color: '#6e6e88', lineHeight: 1.6 }}>
              <div>
                This is a system-generated document and does not require a signature.
              </div>
              <div style={{ marginTop: 2 }}>
                For questions contact HR at <span style={{ color: '#3a3a55', fontWeight: 600 }}>hr@futurenostics.com</span>.
              </div>
              <div style={{ marginTop: 8, fontSize: 8.5, color: '#9090a8', fontFamily: 'var(--fn-font-mono)' }}>
                Generated 31 May 2026 · run_id: prl_2026_05 · entry_id: pe_8a3f9c · page 1 / 1
              </div>
            </div>
            {/* QR */}
            <div style={{
              width: 64, height: 64, padding: 4, borderRadius: 4,
              background: '#fff', border: '1px solid oklch(0.92 0.005 250)',
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1,
              flexShrink: 0,
            }}>
              {/* Stylized QR pattern */}
              {[
                1,1,1,1,1,1,1,0,
                1,0,0,0,1,0,1,0,
                1,0,1,0,1,0,1,1,
                1,0,0,1,1,1,1,0,
                1,0,1,0,1,1,0,1,
                1,1,1,1,0,1,1,0,
                0,1,1,0,1,0,1,0,
                1,0,1,1,0,1,1,1,
              ].map((b, i) => (
                <span key={i} style={{
                  aspectRatio: '1', background: b ? '#1a1a2e' : 'transparent',
                  borderRadius: 0.5,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtPkPK(n) {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  // Western format here (commas every 3) — note in design says PK lakhs is the convention but using western for readability
  return sign + new Intl.NumberFormat('en-US').format(v) + '.00';
}

function PslField({ label, value, sub, mono }) {
  return (
    <div>
      <div style={{
        fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: '#9090a8',
      }}>
        {label}
      </div>
      <div style={{
        marginTop: 3, fontSize: 11.5, fontWeight: 600, color: '#1a1a2e',
        fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: '#6e6e88', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function PslSectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
      color: '#6e6e88', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function PslRow({ label, value, mono, sub, tone, last }) {
  const toneFg = {
    success: 'oklch(0.40 0.13 175)',
    info: 'oklch(0.42 0.13 245)',
    warning: 'oklch(0.44 0.10 70)',
    danger: 'oklch(0.45 0.13 25)',
  }[tone];
  return (
    <div style={{
      padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: last ? 'none' : '1px solid oklch(0.96 0.005 250)',
      background: '#fff',
    }}>
      <div>
        <span style={{ fontSize: 11, color: '#3a3a55' }}>{label}</span>
        {sub && <span style={{ fontSize: 9.5, color: '#9090a8', marginLeft: 6, fontStyle: 'italic' }}>· {sub}</span>}
      </div>
      <span style={{
        fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
        fontSize: 11.5, fontWeight: 600,
        color: toneFg || '#1a1a2e',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function PslMoneyRow({ label, value, bold, subtotal, negative, positive, muted, override }) {
  return (
    <div style={{
      padding: subtotal ? '10px 12px' : '7px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: subtotal ? 'oklch(0.97 0.005 250)' : '#fff',
      borderTop: subtotal ? '1px solid oklch(0.92 0.005 250)' : 'none',
      borderBottom: subtotal ? '1px solid oklch(0.92 0.005 250)' : '1px solid oklch(0.96 0.005 250)',
    }}>
      <span style={{
        fontSize: subtotal ? 11.5 : 11,
        fontWeight: subtotal || bold ? 700 : 500,
        color: muted ? '#9090a8' : subtotal ? '#1a1a2e' : '#3a3a55',
      }}>
        {label}{override && <span style={{ color: 'oklch(0.44 0.10 70)', marginLeft: 3, fontWeight: 700 }}>*</span>}
      </span>
      <span style={{
        fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
        fontSize: subtotal ? 12.5 : 11.5,
        fontWeight: subtotal || bold ? 700 : 600,
        color: muted ? '#b0b0c0' : negative ? 'oklch(0.45 0.13 25)' : positive ? 'oklch(0.40 0.13 175)' : '#1a1a2e',
      }}>
        {value === 0 ? '0.00' : (value < 0 ? '−' : '') + fmtPkPK(Math.abs(value))}
      </span>
    </div>
  );
}

function pslThStyle(align = 'left') {
  return {
    padding: '8px 10px', textAlign: align,
    fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#6e6e88',
  };
}
function pslTdStyle(opts = {}) {
  return {
    padding: '8px 10px',
    textAlign: opts.align || 'left',
    fontSize: 10.5,
    fontFamily: opts.mono ? 'var(--fn-font-mono)' : 'inherit',
    fontWeight: opts.bold ? 700 : 500,
    color: opts.muted ? '#6e6e88' : '#1a1a2e',
    fontVariantNumeric: opts.mono ? 'tabular-nums' : 'normal',
  };
}

Object.assign(window, { PayslipPDF });
