// Brief 26 — Bonus management

const BONUS_AWARDS = [
  { id: 'b1', date: '12 May 2026', emp: 'Talha Mansoor', role: 'BD Manager', hue: 65, type: 'Performance', typeHue: 280, amt: 150000, reason: 'Q1 strong sales numbers', tax: 'Taxable', month: 'May 2026', status: 'Pending', tone: 'warning' },
  { id: 'b2', date: '08 May 2026', emp: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, type: 'Project completion', typeHue: 175, amt: 75000, reason: 'GreenLeaf launch on time', tax: 'Taxable', month: 'May 2026', status: 'Approved', tone: 'success' },
  { id: 'b3', date: '02 May 2026', emp: 'Sana Lateef', role: 'BD Lead', hue: 175, type: 'Performance', typeHue: 280, amt: 100000, reason: 'Q1 lead conversion', tax: 'Taxable', month: 'May 2026', status: 'Disbursed', tone: 'info' },
  { id: 'b4', date: '15 Apr 2026', emp: 'Maira Khan', role: 'BD Associate', hue: 145, type: 'Referral', typeHue: 145, amt: 25000, reason: 'Referred Awais Mahmood', tax: 'Taxable', month: 'Apr 2026', status: 'Disbursed', tone: 'info' },
  { id: 'b5', date: '01 Apr 2026', emp: '84 employees · bulk', role: 'Eid Bonus 2026', hue: 175, type: 'Eid bonus', typeHue: 145, amt: 4200000, reason: 'Eid-ul-Fitr 2026 · one basic salary', tax: 'Tax-exempt', month: 'Apr 2026', status: 'Disbursed', tone: 'info', bulk: true },
  { id: 'b6', date: '20 Mar 2026', emp: 'Hassan Tariq', role: 'Engineer', hue: 22, type: 'Retention', typeHue: 245, amt: 50000, reason: 'Joined 12 months ago retention milestone', tax: 'Taxable', month: 'Mar 2026', status: 'Disbursed', tone: 'info' },
];

const BONUS_TYPES = [
  { id: 'eid', name: 'Eid bonus', slug: 'eid_bonus', hue: 145, tax: 'Tax-exempt', recurring: true, freq: 'Annual', approval: 'Finance Manager', ytd: 1, active: true, system: true },
  { id: 'perf', name: 'Performance bonus', slug: 'performance_bonus', hue: 280, tax: 'Taxable', recurring: false, freq: '—', approval: 'Finance Manager', ytd: 2, active: true, system: true },
  { id: 'project', name: 'Project completion', slug: 'project_completion_bonus', hue: 175, tax: 'Taxable', recurring: false, freq: '—', approval: 'BD Manager + Finance', ytd: 1, active: true, system: true },
  { id: 'retention', name: 'Retention bonus', slug: 'retention_bonus', hue: 245, tax: 'Taxable', recurring: false, freq: '—', approval: 'CEO + Finance', ytd: 1, active: true, system: true },
  { id: 'referral', name: 'Referral bonus', slug: 'referral_bonus', hue: 145, tax: 'Taxable', recurring: false, freq: '—', approval: 'HR Admin', ytd: 1, active: true, system: true },
  { id: 'spot', name: 'Spot bonus', slug: 'spot_bonus', hue: 22, tax: 'Taxable', recurring: false, freq: '—', approval: 'Direct manager', ytd: 0, active: true, system: false },
];

function BonusesAdmin({ tab = 'awards', flow = null, step = 5 }) {
  if (flow === 'bulk') return <BulkBonusFlow step={step} />;
  if (flow === 'single') return <SingleBonusSheet />;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Bonuses
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            One-time additions to payroll — performance, Eid, retention, referral, and more.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill iconRight={I.chev} icon={I.plus}>Award bonus</ToolbarPill>
        </div>
      </div>

      <div style={{
        marginBottom: 18, display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        borderRadius: 8, padding: 4,
      }}>
        {[
          { id: 'awards', l: 'Awards', n: BONUS_AWARDS.length },
          { id: 'types', l: 'Bonus types', n: BONUS_TYPES.length },
        ].map(t => (
          <button key={t.id} style={{
            padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
            background: tab === t.id ? 'var(--fn-bg-subtle)' : 'transparent',
            border: '1px solid ' + (tab === t.id ? 'var(--fn-border-strong)' : 'transparent'),
            display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--fn-fg)' : 'var(--fn-fg-muted)' }}>{t.l}</span>
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, background: tab === t.id ? 'var(--fn-accent-soft)' : 'var(--fn-bg-inset)', color: tab === t.id ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)', fontWeight: 600 }}>{t.n}</span>
          </button>
        ))}
      </div>

      {tab === 'awards' ? <AwardsTab /> : <BonusTypesTab />}
    </>
  );
}

function AwardsTab() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.card} label="Total awarded YTD" value="PKR 4.6M" sub="across 8 bonuses · 87 recipients" info={false} />
        <KPI icon={I.clock} label="Pending approval" value="1" sub="awaiting Finance Manager" deltaTone="warning" info={false} />
        <KPI icon={I.zap} label="Largest single award" value="PKR 150k" sub="Talha Mansoor · Q1 performance" info={false} />
        <KPI icon={I.star} label="Most common type" value="Performance" sub="40% of awards this year" info={false} />
      </div>

      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Input icon={I.search} placeholder="Find by employee…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Type: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Department: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>This year</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{BONUS_AWARDS.length} awards</span>
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Date', width: 110 },
            { label: 'Recipient', width: 220 },
            { label: 'Type', width: 160 },
            { label: 'Amount', align: 'right', width: 130 },
            { label: 'Reason' },
            { label: 'Tax', width: 110 },
            { label: 'Payroll', width: 110 },
            { label: 'Status', width: 130 },
          ]}
        >
          <tbody>
            {BONUS_AWARDS.map((b, i) => (
              <InsetRow key={b.id} bordered={i < BONUS_AWARDS.length - 1}>
                <InsetCell first>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{b.date}</span>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `oklch(0.92 0.07 ${b.hue})`, color: `oklch(0.38 0.16 ${b.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10.5, fontWeight: 700,
                    }}>
                      {b.bulk ? <Icon d={I.users} size={13} /> : b.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{b.emp}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{b.role}</div>
                    </div>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: `oklch(0.94 0.04 ${b.typeHue})`, color: `oklch(0.40 0.13 ${b.typeHue})`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: `oklch(0.55 0.16 ${b.typeHue})` }} />
                    {b.type}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    PKR {fmtPK(b.amt)}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontStyle: 'italic' }}>{b.reason}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={b.tax === 'Taxable' ? 'warning' : 'success'}>{b.tax}</Badge>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{b.month}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={b.tone} dot>{b.status}</Badge>
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

function BonusTypesTab() {
  return (
    <Card padded={false}>
      <SectionHeader
        icon={I.layers}
        title="Bonus types"
        badge={<Badge tone="neutral">{BONUS_TYPES.length}</Badge>}
        padding="18px 22px 14px"
        right={<Button size="sm" icon={I.plus}>Add type</Button>}
      />
      <InsetTable
        padding={14}
        cols={[
          { label: '', width: 40 },
          { label: 'Name' },
          { label: 'Slug', width: 200 },
          { label: 'Tax treatment', width: 140 },
          { label: 'Recurring?', width: 130 },
          { label: 'Approval', width: 180 },
          { label: 'YTD', align: 'right', width: 80 },
          { label: 'Status', width: 110 },
        ]}
      >
        <tbody>
          {BONUS_TYPES.map((t, i) => (
            <InsetRow key={t.id} bordered={i < BONUS_TYPES.length - 1}>
              <InsetCell first>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: `oklch(0.55 0.16 ${t.hue})` }} />
              </InsetCell>
              <InsetCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</span>
                  {t.system && <Badge tone="outline">System</Badge>}
                </div>
              </InsetCell>
              <InsetCell>
                <span style={{ fontSize: 11.5, padding: '2px 7px', borderRadius: 4, background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{t.slug}</span>
              </InsetCell>
              <InsetCell>
                <Badge tone={t.tax === 'Taxable' ? 'warning' : 'success'}>{t.tax}</Badge>
              </InsetCell>
              <InsetCell>
                {t.recurring ? (
                  <span style={{ fontSize: 12, color: 'var(--fn-fg)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon d={I.clock} size={11} style={{ color: 'var(--fn-accent-soft-fg)' }} />
                    {t.freq}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>Ad-hoc</span>
                )}
              </InsetCell>
              <InsetCell>
                <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{t.approval}</span>
              </InsetCell>
              <InsetCell align="right">
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>{t.ytd}</span>
              </InsetCell>
              <InsetCell>
                <Badge tone={t.active ? 'success' : 'neutral'} dot>{t.active ? 'Active' : 'Inactive'}</Badge>
              </InsetCell>
            </InsetRow>
          ))}
        </tbody>
      </InsetTable>
      <div style={{ height: 14 }} />
    </Card>
  );
}

function SingleBonusSheet() {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 1,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div style={{
        width: 640, background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.zap} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Award single bonus</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>Routes through approval policy for the chosen bonus type</div>
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

          <div style={{ height: 14 }} />
          <SheetField label="Bonus type">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42, background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.16 280)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Performance bonus</span>
              <Badge tone="warning">Taxable</Badge>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SheetField label="Amount">
              <Input defaultValue="150,000" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PKR</span>} style={{ height: 42, fontWeight: 600, fontFamily: 'var(--fn-font-mono)' }} />
            </SheetField>
            <SheetField label="Payroll month">
              <Input defaultValue="May 2026" style={{ height: 42 }} />
            </SheetField>
          </div>

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-warning-soft)', border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Icon d={I.calc} size={13} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 1 }} />
            <span style={{ fontSize: 11.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 700 }}>Estimated tax impact:</strong> +PKR 8,500 in May withholding · brings Talha's annualized income into Slab 4. See full tax breakdown →
            </span>
          </div>

          <div style={{ height: 14 }} />
          <SheetField label="Reason (required)">
            <textarea
              rows={3}
              defaultValue="Q1 strong sales numbers · closed Northwind + Acme retainer deals · 18% over target."
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </SheetField>

          <div style={{ height: 14 }} />
          <ToggleRow label="Override default tax treatment" hint="Default for Performance bonus is Taxable. Override only for special FBR-recognized cases." />

          <div style={{
            marginTop: 16, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-icon-tile)', border: '1px solid var(--fn-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon d={I.send} size={13} />
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              Approved by <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Asma Ali (Finance Manager)</strong>
            </span>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.send}>Submit for approval</Button>
        </div>
      </div>
    </div>
  );
}

function BulkBonusFlow({ step = 5 }) {
  const steps = ['Bonus type', 'Scope', 'Amounts', 'Reason', 'Preview', 'Submit'];
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
        <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Bonuses</span>
        <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>Bulk award · Eid bonus 2026</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Bulk bonus award
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            Award the same bonus type to multiple employees in one approval batch.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div style={{
        marginBottom: 20, padding: '14px 18px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {steps.map((s, i) => {
          const state = i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'pending';
          return (
            <React.Fragment key={s}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
                background: state === 'active' ? 'var(--fn-accent-soft)' : 'transparent',
                borderRadius: 99,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 99, fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: state === 'done' ? 'var(--fn-success)' : state === 'active' ? 'var(--fn-accent)' : 'transparent',
                  border: state === 'pending' ? '1.5px solid var(--fn-border-strong)' : 'none',
                  color: state === 'pending' ? 'var(--fn-fg-faint)' : '#fff',
                }}>
                  {state === 'done' ? <Icon d={I.check} size={11} stroke={3} /> : i + 1}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: state === 'active' ? 600 : 500, color: state === 'pending' ? 'var(--fn-fg-faint)' : state === 'active' ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i + 1 < step ? 'var(--fn-success)' : 'var(--fn-border)', borderRadius: 99 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 5 — Preview */}
      <Card padded={false}>
        <SectionHeader
          icon={I.eye}
          title="Step 5 · Preview"
          badge={<Badge tone="accent">84 recipients</Badge>}
          padding="18px 22px 14px"
          right={
            <span style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
              Total: <strong style={{ color: 'var(--fn-fg)', fontWeight: 700, fontFamily: 'var(--fn-font-mono)' }}>PKR 4,200,000</strong>
            </span>
          }
        />

        <div style={{ padding: '0 22px 16px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--fn-icon-tile)', border: '1px solid var(--fn-border)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
          }}>
            <SampleStat label="Bonus type" value="Eid bonus 2026" />
            <SampleStat label="Strategy" value="1 month basic salary" />
            <SampleStat label="Recipients" value="84 employees" />
            <SampleStat label="Payroll month" value="May 2026" />
          </div>
        </div>

        <InsetTable
          padding={14}
          cols={[
            { label: 'Employee', width: 220 },
            { label: 'Department', width: 150 },
            { label: 'Basic salary', align: 'right', width: 130 },
            { label: 'Bonus amount', align: 'right', width: 150 },
            { label: 'Tax', width: 110 },
            { label: 'Flag', width: 120 },
          ]}
        >
          <tbody>
            {[
              { name: 'Bilal Rauf', dept: 'Engineering', hue: 280, basic: 285000, bonus: 285000 },
              { name: 'Talha Mansoor', dept: 'BD', hue: 65, basic: 250000, bonus: 250000, flag: 'high' },
              { name: 'Omar Sheikh', dept: 'Engineering', hue: 175, basic: 240000, bonus: 240000 },
              { name: 'Sana Lateef', dept: 'BD', hue: 175, basic: 185000, bonus: 185000 },
              { name: 'Maira Khan', dept: 'BD', hue: 145, basic: 130000, bonus: 130000 },
              { name: 'Hassan Tariq', dept: 'Engineering', hue: 22, basic: 95000, bonus: 95000 },
              { name: 'Zoya Pervez', dept: 'Operations', hue: 320, basic: 45000, bonus: 45000, flag: 'low' },
            ].map((r, i, arr) => (
              <InsetRow key={r.name} bordered={i < arr.length - 1} highlight={r.flag === 'high' ? 'color-mix(in oklch, var(--fn-warning-soft) 60%, transparent)' : undefined}>
                <InsetCell first>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: `oklch(0.92 0.07 ${r.hue})`, color: `oklch(0.38 0.16 ${r.hue})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700 }}>
                      {r.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</span>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>{r.dept}</span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>PKR {fmtPK(r.basic)}</span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>PKR {fmtPK(r.bonus)}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone="success">Tax-exempt</Badge>
                </InsetCell>
                <InsetCell>
                  {r.flag === 'high' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fn-warning-soft-fg)', fontWeight: 600 }}>
                      <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={11} />
                      Above avg
                    </span>
                  )}
                  {r.flag === 'low' && (
                    <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>Intern</span>
                  )}
                </InsetCell>
              </InsetRow>
            ))}
            <InsetRow bordered={false}>
              <InsetCell first colSpan={6}>
                <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 11.5, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>
                  … 77 more employees · total bonus PKR 4,200,000
                </div>
              </InsetCell>
            </InsetRow>
            <InsetRow bordered={false} highlight="var(--fn-bg-subtle)">
              <InsetCell first colSpan={3} style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Grand total · 84 employees</span>
              </InsetCell>
              <InsetCell align="right" style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }}>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14 }}>
                  PKR 4,200,000
                </span>
              </InsetCell>
              <InsetCell colSpan={2} style={{ borderTop: '2px solid var(--fn-border-strong)', paddingTop: 14, paddingBottom: 14 }} />
            </InsetRow>
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      <div style={{
        marginTop: 18, padding: '14px 18px',
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)' }}>
          <Icon d={I.shield} size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Approved as one batch · all 84 bonuses go through together
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon={I.chevL}>Back · edit amounts</Button>
          <Button variant="secondary" size="sm">Save as draft</Button>
          <Button size="sm" icon={I.send}>Submit for approval</Button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { BonusesAdmin });
