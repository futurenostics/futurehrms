// Employee profile — Compensation card and Documents card

function CompensationCard({ emp, currency }) {
  const cur = (n) => currency === 'USD'
    ? `$${Math.round(n / 278.5).toLocaleString()}`
    : `₨${n.toLocaleString('en-PK')}`;

  const salary = [
    { date: '01 Apr 2026', from: 260000, to: 285000, by: 'Asma Ali', reason: 'Annual increment · performance', pct: '+9.6%' },
    { date: '15 Feb 2026', from: 220000, to: 260000, by: 'Asma Ali', reason: 'Probation → Permanent', pct: '+18.2%' },
    { date: '12 Aug 2023', from: null, to: 220000, by: 'System', reason: 'Initial hire · Engineer band 2', pct: 'Hire' },
  ];

  return (
    <Card padded={false}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Compensation</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Monthly base salary</div>
          </div>
          <Button size="sm" variant="secondary" icon={I.plus}>Increment</Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', lineHeight: 1,
            }}>{cur(emp.salaryPkr)}</span>
            <span style={{ fontSize: 13, color: 'var(--fn-fg-faint)', fontWeight: 500 }}>/ mo</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge tone="success" trend="up">9.6%</Badge>
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              {currency === 'USD' ? '≈ ' : ''}{currency === 'USD' ? `₨${emp.salaryPkr.toLocaleString('en-PK')}` : `$${Math.round(emp.salaryPkr / 278.5).toLocaleString()}`} · effective 01 Apr 2026
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px' }}>
        <div style={{
          fontSize: 10.5, color: 'var(--fn-fg-faint)', textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 600, padding: '8px 0 6px',
        }}>Recent changes</div>
        {salary.map((s, i) => (
          <div key={i} style={{
            padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12,
            borderTop: i > 0 ? '1px solid var(--fn-divider)' : 'none',
          }}>
            <Badge tone={s.pct === 'Hire' ? 'neutral' : 'success'} style={{ minWidth: 50, justifyContent: 'center' }}>{s.pct}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fn-fg)' }}>
                {s.from ? `₨${(s.from / 1000).toFixed(0)}k → ₨${(s.to / 1000).toFixed(0)}k` : `₨${(s.to / 1000).toFixed(0)}k`}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{s.reason} · {s.by}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{s.date}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DocumentsCard() {
  const documents = [
    { name: 'Offer letter', file: 'offer-letter.pdf', kind: 'Offer', date: '04 Aug 2023', size: '186 KB', hue: 280 },
    { name: 'Contract — permanent', file: 'contract-perm.pdf', kind: 'Contract', date: '15 Feb 2026', size: '212 KB', hue: 175 },
    { name: 'CNIC scan', file: 'cnic-scan.jpg', kind: 'ID', date: '12 Aug 2023', size: '480 KB', hue: 22 },
    { name: 'Bank details', file: 'bank-details.pdf', kind: 'Payment', date: '12 Aug 2023', size: '94 KB', hue: 245 },
  ];

  return (
    <Card padded={false}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Documents</div>
          <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>4 files · 972 KB</div>
        </div>
        <Button size="sm" variant="secondary" icon={I.upload}>Upload</Button>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {documents.map((d) => (
          <div key={d.file} style={{
            padding: 12, border: '1px solid var(--fn-border)', borderRadius: 6,
            background: 'var(--fn-bg-panel)', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 36, height: 44, borderRadius: 6,
              background: `oklch(0.94 0.05 ${d.hue})`,
              border: `1px solid oklch(0.85 0.07 ${d.hue})`,
              color: `oklch(0.40 0.13 ${d.hue})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
            }}>
              {d.file.split('.').pop().toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>
                {d.kind} · {d.size}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 8 }}>
                {d.date}
              </div>
            </div>
            <Icon d={I.download} size={13} style={{ color: 'var(--fn-fg-faint)', flexShrink: 0, cursor: 'pointer' }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

Object.assign(window, { CompensationCard, DocumentsCard });
