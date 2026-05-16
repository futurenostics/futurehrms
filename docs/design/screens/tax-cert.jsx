// Brief 28 — Annual Tax Certificate (PDF + generation flow)

function TaxCertificatePDF({ variant = 'fullYear' }) {
  const isPartial = variant === 'partial';
  return (
    <div style={{
      width: '100%', minHeight: '100%', padding: 32, background: 'oklch(0.95 0.005 250)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    }}>
      <div style={{
        width: 640, padding: '36px 44px', background: '#ffffff',
        boxShadow: '0 18px 40px -10px rgba(15, 17, 23, 0.18), 0 6px 12px -3px rgba(15, 17, 23, 0.08)',
        border: '1px solid oklch(0.92 0.005 250)',
        fontFamily: '"Source Serif", "Times New Roman", Georgia, serif',
        color: '#1a1a2e',
      }}>
        {/* Header strip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '2px solid oklch(0.55 0.18 280)', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 7,
              background: 'oklch(0.55 0.18 280)', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 19, fontWeight: 700, letterSpacing: '-0.04em',
              fontFamily: '"Source Serif", serif',
            }}>F</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', color: '#1a1a2e' }}>Futurenostics</div>
              <div style={{ fontSize: 9, color: '#6e6e88', marginTop: 1, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                Private Limited · Pakistan
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 9.5, color: '#6e6e88', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
            <div style={{ fontWeight: 600, color: '#3a3a55' }}>4-A, Block 6, P.E.C.H.S.</div>
            <div>Karachi 75400, Pakistan</div>
            <div style={{ fontFamily: 'var(--fn-font-mono)' }}>NTN: 9876543-2</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', color: '#1a1a2e' }}>
            Certificate of Salary Tax Deduction
          </h1>
          <div style={{ marginTop: 5, fontSize: 11, fontStyle: 'italic', color: '#6e6e88', fontFamily: 'Inter, sans-serif' }}>
            Issued under Section 149 of the Income Tax Ordinance, 2001
          </div>
          <div style={{
            marginTop: 8, display: 'inline-block', padding: '4px 12px', borderRadius: 4,
            background: 'oklch(0.95 0.04 280)', color: 'oklch(0.32 0.16 280)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'Inter, sans-serif',
          }}>
            TAX YEAR 2025–26 · 1 JUL 2025 – 30 JUN 2026
          </div>
        </div>

        {/* Section 1 — Employee */}
        <PdfSection title="Employee identification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            <PdfField label="Name" value="Bilal Rauf" />
            <PdfField label="Employee code" value="EMP-0042" mono />
            <PdfField label="Father / husband name" value="Muhammad Rauf" />
            <PdfField label="CNIC" value="42101-1234567-8" mono />
            <PdfField label="Designation" value="Senior Software Engineer" />
            <PdfField label="Department" value="Engineering" />
            <PdfField label="Address" value="House 14, Street 22, F-7/2, Islamabad" />
            <PdfField label="Period of service" value={isPartial ? '01 Nov 2025 – 30 Jun 2026 (8 months)' : '01 Jul 2025 – 30 Jun 2026 (12 months)'} />
          </div>
        </PdfSection>

        {/* Section 2 — Income breakdown */}
        <PdfSection title="Annual income breakdown">
          <PdfTable rows={[
            { l: 'Basic salary', v: isPartial ? 1600000 : 2400000 },
            { l: 'Allowances (taxable)', v: 0 },
            { l: 'Allowances (exempt under Section 13)', v: 0, muted: true },
            { l: 'Bonuses', v: isPartial ? 0 : 75000 },
            { l: 'Overtime', v: isPartial ? 28000 : 47724 },
            { l: 'Other additions', v: 0, muted: true },
            { l: 'Total gross salary', v: isPartial ? 1628000 : 2522724, total: true },
          ]} />
        </PdfSection>

        {/* Section 3 — Deductions */}
        <PdfSection title="Statutory deductions">
          <PdfTable rows={[
            { l: 'Income tax deducted u/s 149', v: isPartial ? -82000 : -160000 },
            { l: 'EOBI contribution · employee', v: -3840, muted: true },
            { l: 'Provident Fund · employee contribution', v: isPartial ? -133280 : -199920 },
            { l: 'Other deductions', v: 0, muted: true },
          ]} />
        </PdfSection>

        {/* Section 4 — Tax computation */}
        <PdfSection title="Tax computation">
          <div style={{
            padding: 14, background: 'oklch(0.97 0.005 250)', borderRadius: 6,
            border: '1px solid oklch(0.92 0.005 250)',
            fontFamily: 'Inter, sans-serif', fontSize: 11,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#3a3a55' }}>Annual taxable income</span>
              <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600 }}>PKR {fmtPK(isPartial ? 1628000 : 2522724)}</span>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed oklch(0.92 0.005 250)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6e6e88', marginBottom: 5 }}>Slab-by-slab</div>
              <PdfSlabLine slab="Slab 1 · 0% on first PKR 600,000" value={0} />
              <PdfSlabLine slab="Slab 2 · 2.5% on PKR 600,000" value={15000} />
              <PdfSlabLine slab="Slab 3 · 12.5% on PKR 1,200,000" value={150000} />
              {!isPartial && <PdfSlabLine slab="Catch-up adjustments (bonuses)" value={-5000} />}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid oklch(0.92 0.005 250)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#3a3a55' }}>Tax before rebates</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)' }}>PKR {fmtPK(isPartial ? 102000 : 165000)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#3a3a55' }}>Rebates applied (donations u/s 61)</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)' }}>-PKR 5,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px dashed oklch(0.92 0.005 250)', marginTop: 4, fontWeight: 700 }}>
                <span>Net tax payable</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)' }}>PKR {fmtPK(isPartial ? 97000 : 160000)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#3a3a55' }}>Tax already deducted (monthly withholding)</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)' }}>PKR {fmtPK(isPartial ? 82000 : 160000)}</span>
              </div>
              <div style={{
                marginTop: 6, padding: '8px 10px', borderRadius: 4,
                background: isPartial ? 'oklch(0.95 0.04 22)' : 'oklch(0.95 0.05 145)',
                display: 'flex', justifyContent: 'space-between', fontWeight: 700,
              }}>
                <span style={{ color: isPartial ? 'oklch(0.45 0.13 25)' : 'oklch(0.40 0.10 145)' }}>
                  {isPartial ? 'Additional tax payable' : 'Adjustment'}
                </span>
                <span style={{ fontFamily: 'var(--fn-font-mono)', color: isPartial ? 'oklch(0.45 0.13 25)' : 'oklch(0.40 0.10 145)' }}>
                  {isPartial ? 'PKR 15,000' : 'NIL'}
                </span>
              </div>
            </div>
          </div>
        </PdfSection>

        {/* Section 5 — Monthly detail */}
        <PdfSection title="Monthly detail">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5, fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ background: 'oklch(0.97 0.005 250)' }}>
                <th style={pdfTh()}>Month</th>
                <th style={pdfTh('right')}>Gross salary</th>
                <th style={pdfTh('right')}>Tax</th>
                <th style={pdfTh('right')}>EOBI</th>
                <th style={pdfTh('right')}>PF</th>
                <th style={pdfTh('right')}>Net paid</th>
              </tr>
            </thead>
            <tbody>
              {(isPartial
                ? ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26']
                : ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26']
              ).map(m => (
                <tr key={m} style={{ borderTop: '1px solid oklch(0.94 0.005 250)' }}>
                  <td style={pdfTd()}>{m}</td>
                  <td style={pdfTd('right', true)}>{fmtPK(isPartial ? 203500 : 210227)}</td>
                  <td style={pdfTd('right', true)}>{fmtPK(isPartial ? 10250 : 13333)}</td>
                  <td style={pdfTd('right', true)}>320</td>
                  <td style={pdfTd('right', true)}>{fmtPK(isPartial ? 16660 : 16660)}</td>
                  <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 176270 : 179914)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid oklch(0.55 0.18 280)', background: 'oklch(0.97 0.005 250)' }}>
                <td style={pdfTd(false, true, true)}>Totals</td>
                <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 1628000 : 2522724)}</td>
                <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 82000 : 160000)}</td>
                <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 2560 : 3840)}</td>
                <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 133280 : 199920)}</td>
                <td style={pdfTd('right', true, true)}>{fmtPK(isPartial ? 1410160 : 2158964)}</td>
              </tr>
            </tbody>
          </table>
        </PdfSection>

        {/* Section 6 — Certification */}
        <PdfSection title="Certification">
          <p style={{ margin: 0, fontSize: 11, color: '#1a1a2e', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
            I certify that the above is a true statement of salary paid and tax deducted during the tax year referenced.
          </p>
          <div style={{
            marginTop: 22, paddingTop: 14, borderTop: '1px dashed oklch(0.85 0.005 250)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          }}>
            <div style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
              <div style={{ height: 28 }} />
              <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: 4, minWidth: 180 }}>
                <div style={{ fontWeight: 700 }}>Asma Ali</div>
                <div style={{ color: '#6e6e88' }}>Head of People · HR Admin</div>
                <div style={{ color: '#6e6e88', fontFamily: 'var(--fn-font-mono)' }}>15 Jul 2026</div>
              </div>
            </div>
            <div style={{
              width: 64, height: 64, padding: 3, borderRadius: 4,
              background: '#fff', border: '1px solid oklch(0.92 0.005 250)',
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1,
            }}>
              {[
                1,1,1,1,1,1,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,0,1,1,1,1,0,
                1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,1,
              ].map((b, i) => (
                <span key={i} style={{ aspectRatio: '1', background: b ? '#1a1a2e' : 'transparent', borderRadius: 0.5 }} />
              ))}
            </div>
          </div>
        </PdfSection>

        {/* Footer */}
        <div style={{
          marginTop: 16, paddingTop: 12, borderTop: '1px solid oklch(0.92 0.005 250)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 8.5, color: '#9090a8', fontFamily: 'Inter, sans-serif',
        }}>
          <span>System-generated · valid without physical signature when verified via QR code at <span style={{ color: '#3a3a55' }}>verify.futurenostics.com/tc/8a3f9c</span></span>
          <span style={{ fontFamily: 'var(--fn-font-mono)' }}>Gen 15 Jul 2026 · 14:32 PKT · page 1/1</span>
        </div>
      </div>
    </div>
  );
}

function PdfSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
        color: 'oklch(0.40 0.16 280)', marginBottom: 8, paddingBottom: 4,
        borderBottom: '1px solid oklch(0.92 0.005 250)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PdfField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9090a8' }}>
        {label}
      </div>
      <div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 600, color: '#1a1a2e', fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit' }}>
        {value}
      </div>
    </div>
  );
}

function PdfTable({ rows }) {
  return (
    <div style={{
      border: '1px solid oklch(0.92 0.005 250)', borderRadius: 4, overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: r.total ? 'oklch(0.97 0.005 250)' : '#fff',
          borderTop: i > 0 ? '1px solid oklch(0.94 0.005 250)' : 'none',
          borderBottom: r.total ? '2px solid oklch(0.55 0.18 280)' : 'none',
        }}>
          <span style={{ fontSize: 11, color: r.muted ? '#9090a8' : r.total ? '#1a1a2e' : '#3a3a55', fontWeight: r.total ? 700 : 500 }}>
            {r.l}
          </span>
          <span style={{
            fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
            fontSize: r.total ? 12 : 11,
            fontWeight: r.total ? 700 : 600,
            color: r.muted ? '#b0b0c0' : r.v < 0 ? 'oklch(0.45 0.13 25)' : '#1a1a2e',
          }}>
            {r.v === 0 ? '—' : (r.v < 0 ? '-' : '') + 'PKR ' + fmtPK(Math.abs(r.v))}
          </span>
        </div>
      ))}
    </div>
  );
}

function PdfSlabLine({ slab, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 10 }}>
      <span style={{ color: '#6e6e88' }}>{slab}</span>
      <span style={{ fontFamily: 'var(--fn-font-mono)', color: value < 0 ? 'oklch(0.45 0.13 25)' : '#1a1a2e', fontWeight: 500 }}>
        {value === 0 ? 'PKR 0' : (value < 0 ? '-' : '+') + 'PKR ' + fmtPK(Math.abs(value))}
      </span>
    </div>
  );
}

function pdfTh(align = 'left') {
  return {
    padding: '8px 10px', textAlign: align,
    fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#6e6e88',
  };
}

function pdfTd(align = 'left', mono, bold) {
  return {
    padding: '7px 10px', textAlign: typeof align === 'string' ? align : 'left',
    fontSize: 10,
    fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
    fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
    fontWeight: bold ? 700 : 500,
    color: '#1a1a2e',
  };
}

function TaxCertificateGen({ progress = false }) {
  const rows = [
    { name: 'Bilal Rauf', dept: 'Engineering', hue: 280, eid: 'EMP-0042', status: 'Generated', date: '15 Jul 2026', tone: 'success' },
    { name: 'Sana Lateef', dept: 'BD', hue: 175, eid: 'EMP-0019', status: 'Generated', date: '15 Jul 2026', tone: 'success' },
    { name: 'Talha Mansoor', dept: 'BD', hue: 65, eid: 'EMP-0033', status: 'Generated', date: '15 Jul 2026', tone: 'success' },
    { name: 'Omar Sheikh', dept: 'Engineering', hue: 175, eid: 'EMP-0055', status: 'Generated', date: '15 Jul 2026', tone: 'success' },
    { name: 'Hassan Tariq', dept: 'Engineering', hue: 22, eid: 'EMP-0073', status: 'Pending data', date: '—', tone: 'warning', reason: 'Missing CNIC' },
    { name: 'Daniyal Ahmed', dept: 'Operations', hue: 280, eid: 'EMP-0014', status: 'Pending data', date: '—', tone: 'warning', reason: 'Missing residential address' },
    { name: 'Maira Khan', dept: 'BD', hue: 145, eid: 'EMP-0061', status: 'Generated', date: '15 Jul 2026', tone: 'success' },
  ];

  return (
    <>
      <SettingsBreadcrumb section="Year-End" active="Tax Certificates" />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em' }}>Annual tax certificates</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            Generate Section 149 tax deduction certificates for each employee at fiscal year end.
          </p>
        </div>
        <Button icon={I.zap}>Bulk generate (84)</Button>
      </div>

      <div style={{
        marginBottom: 18, padding: '14px 18px',
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <ToolbarPill iconRight={I.chev}>FY 2025-26</ToolbarPill>
        <div style={{ height: 24, borderLeft: '1px solid var(--fn-divider)' }} />
        <div style={{ display: 'flex', gap: 22, fontSize: 12.5 }}>
          <span>Total · <strong style={{ fontWeight: 700 }}>84</strong></span>
          <span style={{ color: 'var(--fn-success-soft-fg)' }}><strong style={{ fontWeight: 700 }}>78</strong> generated</span>
          <span style={{ color: 'var(--fn-warning-soft-fg)' }}><strong style={{ fontWeight: 700 }}>6</strong> pending data</span>
          <span style={{ color: 'var(--fn-fg-muted)' }}><strong style={{ fontWeight: 700 }}>0</strong> emailed</span>
        </div>
        <div style={{ flex: 1 }} />
        <ToolbarPill icon={I.download} small>Export ZIP</ToolbarPill>
        <ToolbarPill icon={I.send} small>Email all</ToolbarPill>
      </div>

      {progress && (
        <div style={{
          marginBottom: 18, padding: 16, borderRadius: 8,
          background: 'var(--fn-accent-soft)', border: '1px solid color-mix(in oklch, var(--fn-accent) 28%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fn-accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={I.zap} size={15} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-accent-soft-fg)' }}>
                Bulk generation in progress
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', marginTop: 2 }}>
                Generating Section 149 certificates · 52 of 84 complete · ~18 seconds remaining
              </div>
            </div>
            <Button size="sm" variant="secondary" style={{ height: 28 }}>Cancel</Button>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.6)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '62%', background: 'var(--fn-accent)' }} />
          </div>
        </div>
      )}

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Employee', width: 220 },
            { label: 'Department', width: 150 },
            { label: 'EID', width: 110 },
            { label: 'Status', width: 160 },
            { label: 'Generated', width: 130 },
            { label: '', width: 240 },
          ]}
        >
          <tbody>
            {rows.map((r, i) => (
              <InsetRow key={r.eid} bordered={i < rows.length - 1} highlight={r.tone === 'warning' ? 'color-mix(in oklch, var(--fn-warning-soft) 35%, transparent)' : undefined}>
                <InsetCell first>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `oklch(0.92 0.07 ${r.hue})`, color: `oklch(0.38 0.16 ${r.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>{r.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{r.dept}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{r.eid}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={r.tone} dot>{r.status}</Badge>
                  {r.reason && <div style={{ fontSize: 10.5, color: 'var(--fn-warning-soft-fg)', marginTop: 3, fontStyle: 'italic' }}>{r.reason}</div>}
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{r.date}</span>
                </InsetCell>
                <InsetCell last align="right">
                  {r.tone === 'success' ? (
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Button size="sm" variant="secondary" icon={I.eye} style={{ height: 26 }}>View</Button>
                      <Button size="sm" variant="secondary" icon={I.download} style={{ height: 26 }}>PDF</Button>
                      <Button size="sm" variant="secondary" icon={I.send} style={{ height: 26 }}>Email</Button>
                    </div>
                  ) : (
                    <Button size="sm" iconRight={I.arrowR} style={{ height: 26 }}>Resolve data gap</Button>
                  )}
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>
    </>
  );
}

Object.assign(window, { TaxCertificatePDF, TaxCertificateGen });
