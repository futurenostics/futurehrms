// Brief 22 — EOBI & Provident Fund configuration
// Brief 23 — Gratuity policy configuration

function StatutoryConfig({ editing = null }) {
  return (
    <>
      <SettingsBreadcrumb section="Compensation" active="Statutory Contributions" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Statutory contributions
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            EOBI and Provident Fund configuration. Applied to every payroll run from the effective date — past runs are immutable.
          </p>
        </div>
      </div>

      <EOBICard editing={editing === 'eobi'} />
      <div style={{ height: 18 }} />
      <PFCard editing={editing === 'pf'} />

      <Card padded={false} style={{ marginTop: 18 }}>
        <SectionHeader icon={I.clock} title="Version history" padding="18px 22px 14px" right={<span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>View full audit history →</span>} />
        <div style={{ padding: '0 22px 18px' }}>
          {[
            { config: 'EOBI', from: '01 Jul 2024', by: 'Asma Ali', change: 'Updated employer rate to 5%' },
            { config: 'EOBI', from: '01 Jul 2022', by: 'System (seed)', change: 'Initial configuration' },
            { config: 'PF', from: '01 Jan 2026', by: 'Asma Ali', change: 'Interest rate raised 10% → 12%' },
            { config: 'PF', from: '01 Jul 2023', by: 'Asma Ali', change: 'Initial configuration' },
          ].map((v, i, arr) => (
            <div key={i} style={{
              padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
            }}>
              <Badge tone={v.config === 'EOBI' ? 'warning' : 'info'}>{v.config}</Badge>
              <span style={{ fontSize: 12.5, color: 'var(--fn-fg)' }}>{v.change}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>by {v.by}</span>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{v.from}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function EOBICard({ editing }) {
  return (
    <Card padded={false}>
      <SectionHeader
        icon={I.shield}
        title="Employees' Old-Age Benefits Institution (EOBI)"
        badge={<Badge tone="warning">Mandatory</Badge>}
        padding="20px 22px 16px"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="success" dot>Active</Badge>
            {!editing && <Button variant="secondary" size="sm" icon={I.edit}>Edit</Button>}
          </div>
        }
      />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <ConfigRow label="Enabled" value={<Toggle on />} />
            <ConfigRow label="Employee contribution" value="1%" sub="of minimum wage base" mono />
            <ConfigRow label="Employer contribution" value="5%" sub="of minimum wage base" mono />
            <ConfigRow label="Minimum wage base" value="PKR 32,000" sub="EOBI-mandated" mono />
            <ConfigRow label="Maximum wage cap" value="PKR 32,000" sub="capped at minimum wage" mono />
          </div>
          <div>
            <ConfigRow label="EOBI registration #" value="EOBI-PK-0123456-2024" mono />
            <ConfigRow label="Effective from" value="01 Jul 2024" mono />
            <ConfigRow label="Source notification" value="EOBI Circular 12/2024 ↗" link />
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-icon-tile)', border: '1px solid var(--fn-border)',
              fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={12} style={{ marginTop: 1, flexShrink: 0 }} />
              <span><strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>What is EOBI?</strong> Mandatory pension fund for private-sector employees in Pakistan. Required for companies with 5+ employees.</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 18, padding: 16, borderRadius: 8,
          background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
          border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-accent-soft-fg)', marginBottom: 10 }}>
            Sample · employee earning PKR 80,000/mo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <SampleStat label="Employee deduction" value="PKR 320" sub="1% × PKR 32,000" />
            <SampleStat label="Employer contribution" value="PKR 1,600" sub="5% × PKR 32,000" />
            <SampleStat label="Total monthly EOBI" value="PKR 1,920" sub="combined inflow" highlight />
          </div>
        </div>
      </div>
    </Card>
  );
}

function PFCard({ editing }) {
  return (
    <Card padded={false}>
      <SectionHeader
        icon={I.card}
        title="Provident Fund"
        badge={<Badge tone="info">Company policy</Badge>}
        padding="20px 22px 16px"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone="success" dot>Active</Badge>
            {!editing && <Button variant="secondary" size="sm" icon={I.edit}>Edit</Button>}
          </div>
        }
      />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <ConfigRow label="Enabled" value={<Toggle on />} />
            <ConfigRow label="Employee contribution" value="8.33%" sub="of basic salary" mono />
            <ConfigRow label="Employer match" value="8.33%" sub="of basic salary" mono />
            <ConfigRow label="Eligibility" value="After confirmation" sub="post probation" />
            <ConfigRow label="Vesting period" value="36 months" sub="full employer match" mono />
          </div>
          <div>
            <ConfigRow label="Interest rate" value="12% per year" sub="compounded monthly" mono />
            <ConfigRow label="Withdrawal rules" value="Loan allowed against balance" sub="links to Loans module" />
            <ConfigRow label="Tax treatment" value="Tax-exempt · recognized fund" sub="FBR Form A" />
            <ConfigRow label="Effective from" value="01 Jan 2026" mono />
          </div>
        </div>

        <div style={{
          marginTop: 18, padding: 16, borderRadius: 8,
          background: 'linear-gradient(140deg, oklch(0.95 0.04 280) 0%, oklch(0.96 0.04 175) 100%)',
          border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-accent-soft-fg)', marginBottom: 10 }}>
            Sample · employee earning PKR 200,000/mo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <SampleStat label="Employee · monthly" value="PKR 16,660" />
            <SampleStat label="Employer · monthly" value="PKR 16,660" />
            <SampleStat label="Total PF inflow / mo" value="PKR 33,320" highlight />
            <SampleStat label="Annual interest (PKR 200k balance)" value="PKR 24,000" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConfigRow({ label, value, sub, mono, link }) {
  return (
    <div style={{
      padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      borderBottom: '1px dashed var(--fn-divider)',
    }}>
      <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>{label}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: link ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
          fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
          cursor: link ? 'pointer' : 'default',
        }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SampleStat({ label, value, sub, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>
        {label}
      </div>
      <div style={{
        marginTop: 4, fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--fn-font-mono)',
        color: highlight ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ───── Brief 23 — Gratuity policy ─────

function GratuityPolicy({ disabled = false }) {
  return (
    <>
      <SettingsBreadcrumb section="Compensation" active="Gratuity" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Gratuity policy
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            Statutory gratuity calculation and accrual rules. Paid on exit (resignation or termination after eligibility period).
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={I.edit}>Edit policy</Button>
      </div>

      {disabled && (
        <div style={{
          marginBottom: 16, padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-danger-soft)', border: '1px solid color-mix(in oklch, var(--fn-danger) 30%, transparent)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={15} stroke={2} style={{ color: 'var(--fn-danger-soft-fg)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--fn-danger-soft-fg)' }}>
            <strong style={{ fontWeight: 700 }}>Gratuity is disabled.</strong> Employees will not accrue gratuity. Re-enabling later does not retroactively credit past service.
          </span>
        </div>
      )}

      <Card padded={false}>
        <SectionHeader
          icon={I.flag}
          title="Active policy"
          badge={<Badge tone={disabled ? 'neutral' : 'success'} dot>{disabled ? 'Disabled' : 'Active · since 01 Jul 2023'}</Badge>}
          padding="20px 22px 16px"
        />
        <div style={{ padding: '0 22px 22px' }}>

          {/* Eligibility */}
          <GratuitySection title="Eligibility" icon={I.shield}>
            <ConfigRow label="Enabled" value={<Toggle on={!disabled} />} />
            <ConfigRow label="Minimum continuous service" value="5 years" sub="below threshold = no gratuity" mono />
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', marginBottom: 6 }}>Eligible exit reasons</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['Resignation', 'Retirement', 'Termination (without cause)', 'Death (paid to nominee)', 'Disability'].map(r => (
                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fn-success-soft-fg)' }}>
                      <Icon d={I.check} size={11} stroke={2.5} /> {r}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', marginBottom: 6 }}>Disqualifying reasons</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['Termination for misconduct', 'Voluntary forfeiture'].map(r => (
                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fn-danger-soft-fg)' }}>
                      <Icon d={I.x} size={11} stroke={2.5} /> {r}
                    </span>
                  ))}
                </div>
                <div style={{
                  marginTop: 8, padding: '8px 10px', borderRadius: 6,
                  background: 'var(--fn-warning-soft)',
                  border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
                  fontSize: 11, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5,
                }}>
                  <Icon d={I.shield} size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Withholding gratuity for misconduct should be reviewed with legal counsel.
                </div>
              </div>
            </div>
          </GratuitySection>

          {/* Formula */}
          <GratuitySection title="Calculation formula" icon={I.calc}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <FormulaCard
                title="Basic × Years"
                expr="Last drawn basic salary × years of service"
                active
              />
              <FormulaCard
                title="Gross × Years"
                expr="Last drawn gross salary × years of service"
              />
              <FormulaCard
                title="Average × Years"
                expr="Average of last 12 months × years of service"
              />
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ConfigRow label="Service rounding" value="Round to nearest 6 months" sub="7y 8mo → 7.5y" />
              <ConfigRow label="Maximum cap" value="No cap" sub="company-wide" />
            </div>
            <div style={{ marginTop: 10 }}>
              <ConfigRow label="Tax treatment" value="Tax-exempt up to PKR 7,500,000" sub="per FBR rules · auto-updated from tax config" link />
            </div>
          </GratuitySection>

          {/* Accrual */}
          <GratuitySection title="Accrual & liability reporting" icon={I.chart}>
            <ConfigRow label="Monthly accrual booking" value={<Toggle on />} sub="books as liability for accounting" />
            <ConfigRow label="Liability report frequency" value="Quarterly" />
            <ConfigRow label="Report recipient" value="bookkeeping@futurenostics.com" mono />
          </GratuitySection>

          {/* Sample */}
          <GratuitySection title="Sample computation" icon={I.eye} sub="Adjust the sliders to model different scenarios">
            <div style={{
              padding: 16, borderRadius: 8,
              background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
              border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    <span>Years of service</span>
                    <span style={{ fontFamily: 'var(--fn-font-mono)' }}>8y</span>
                  </div>
                  <SliderTrack value={80} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    <span>Last drawn basic salary</span>
                    <span style={{ fontFamily: 'var(--fn-font-mono)' }}>PKR 100,000</span>
                  </div>
                  <SliderTrack value={50} />
                </div>
              </div>

              <div style={{
                padding: 14, borderRadius: 6, background: 'rgba(255,255,255,0.5)',
                border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
                fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, lineHeight: 1.8,
              }}>
                <CalcRow label="Basic salary" value="PKR 100,000" />
                <CalcRow label="× Years of service (rounded)" value="× 8 years" />
                <div style={{ borderTop: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)', marginTop: 6, paddingTop: 6 }}>
                  <CalcRow label="Gratuity payable on exit" value="PKR 800,000" highlight bold />
                </div>
                <CalcRow label="Tax-exempt up to" value="PKR 7,500,000" />
                <CalcRow label="Tax due on gratuity" value="PKR 0" />
              </div>
            </div>
          </GratuitySection>
        </div>
      </Card>

      <Card padded={false} style={{ marginTop: 18 }}>
        <SectionHeader icon={I.clock} title="Version history" badge={<Badge tone="neutral">3 versions</Badge>} padding="18px 22px 14px" />
        <div style={{ padding: '0 22px 18px' }}>
          {[
            { from: '01 Jul 2024', by: 'Asma Ali', change: 'Service rounding changed: nearest year → nearest 6 months' },
            { from: '15 Mar 2024', by: 'Asma Ali', change: 'Disqualifying reasons clarified' },
            { from: '01 Jul 2023', by: 'System (seed)', change: 'Initial policy · 5-year eligibility, Basic × Years formula' },
          ].map((v, i, arr) => (
            <div key={i} style={{
              padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--fn-fg)', flex: 1 }}>{v.change}</span>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>by {v.by}</span>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{v.from}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function GratuitySection({ title, icon, sub, children }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--fn-divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={icon} size={13} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)' }}>{title}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>· {sub}</span>}
      </div>
      {children}
    </div>
  );
}

function FormulaCard({ title, expr, active }) {
  return (
    <div style={{
      padding: 14, borderRadius: 8,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 99,
          border: '2px solid ' + (active ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
          background: active ? 'var(--fn-accent)' : 'transparent',
          boxShadow: active ? 'inset 0 0 0 3px var(--fn-bg-panel)' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)', fontFamily: 'var(--fn-font-mono)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>{expr}</div>
    </div>
  );
}

function SliderTrack({ value }) {
  return (
    <div style={{ position: 'relative', height: 20 }}>
      <div style={{ position: 'absolute', top: 9, left: 0, right: 0, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.5)' }} />
      <div style={{ position: 'absolute', top: 9, left: 0, width: `${value}%`, height: 4, borderRadius: 99, background: 'var(--fn-accent)' }} />
      <div style={{
        position: 'absolute', top: 3, left: `calc(${value}% - 8px)`,
        width: 16, height: 16, borderRadius: 99,
        background: 'var(--fn-accent)', border: '3px solid #fff', boxShadow: 'var(--fn-shadow-sm)',
      }} />
    </div>
  );
}

Object.assign(window, { StatutoryConfig, GratuityPolicy });
