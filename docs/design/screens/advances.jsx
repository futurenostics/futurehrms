// Brief 24 — Salary Advances admin page

const ADVANCES = [
  { id: 'a1', date: '12 May 2026', emp: 'Hassan Tariq', role: 'Engineer', hue: 22, principal: 80000, repaid: 0, outstanding: 80000, perMonth: 16000, months: 5, monthsLeft: 5, next: 'Jun 2026 Payroll', status: 'Pending', tone: 'warning' },
  { id: 'a2', date: '05 May 2026', emp: 'Maira Khan', role: 'BD Associate', hue: 145, principal: 60000, repaid: 0, outstanding: 60000, perMonth: 20000, months: 3, monthsLeft: 3, next: 'Jun 2026 Payroll', status: 'Active', tone: 'info' },
  { id: 'a3', date: '02 May 2026', emp: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, principal: 100000, repaid: 25000, outstanding: 75000, perMonth: 25000, months: 4, monthsLeft: 3, next: 'Jun 2026 Payroll', status: 'Active', tone: 'info', selected: true },
  { id: 'a4', date: '18 Apr 2026', emp: 'Faraz Iqbal', role: 'Engineer', hue: 200, principal: 50000, repaid: 25000, outstanding: 25000, perMonth: 25000, months: 2, monthsLeft: 1, next: 'Jun 2026 Payroll', status: 'Active', tone: 'info' },
  { id: 'a5', date: '04 Apr 2026', emp: 'Sana Lateef', role: 'BD Lead', hue: 175, principal: 120000, repaid: 60000, outstanding: 60000, perMonth: 30000, months: 4, monthsLeft: 2, next: 'Jun 2026 Payroll', status: 'Active', tone: 'info' },
  { id: 'a6', date: '01 Feb 2026', emp: 'Talha Mansoor', role: 'BD Manager', hue: 65, principal: 200000, repaid: 200000, outstanding: 0, perMonth: 50000, months: 4, monthsLeft: 0, next: '—', status: 'Fully repaid', tone: 'success' },
  { id: 'a7', date: '12 Mar 2026', emp: 'Omar Sheikh', role: 'Sr. Engineer', hue: 175, principal: 75000, repaid: 0, outstanding: 0, perMonth: 25000, months: 3, monthsLeft: 0, next: '—', status: 'Cancelled', tone: 'neutral' },
];

function AdvancesAdmin({ detail = null, issueOpen = false, overLimit = false }) {
  const sel = detail ? ADVANCES.find(a => a.id === detail) : null;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Salary advances
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
            Short-term salary advances. Repaid through automatic payroll deductions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.cog}>Policy settings</ToolbarPill>
          <Button icon={I.plus}>Issue advance</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.card} label="Outstanding" value="PKR 300k" sub="across 4 active advances" info={false} />
        <KPI icon={I.arrowD} label="This month repayments" value="PKR 116k" sub="auto-deducted from May payroll" info={false} />
        <KPI icon={I.clock} label="Pending approval" value="1" sub="awaiting Finance Manager" deltaTone="warning" info={false} />
        <KPI icon={I.zap} label="Issued YTD" value="PKR 685k" sub="across 12 advances" info={false} />
      </div>

      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Input icon={I.search} placeholder="Find by employee, EID…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Department: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>This year</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{ADVANCES.length} of 24 advances</span>
      </div>

      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Date issued', width: 110 },
            { label: 'Employee', width: 220 },
            { label: 'Principal', align: 'right', width: 110 },
            { label: 'Repaid', align: 'right', width: 180 },
            { label: 'Outstanding', align: 'right', width: 120 },
            { label: 'Repayment plan', width: 170 },
            { label: 'Next deduction', width: 150 },
            { label: 'Status', width: 130 },
            { label: '', width: 36 },
          ]}
        >
          <tbody>
            {ADVANCES.map((a, i) => (
              <InsetRow key={a.id} bordered={i < ADVANCES.length - 1} highlight={a.id === detail ? 'var(--fn-accent-soft)' : undefined}>
                <InsetCell first>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{a.date}</span>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `oklch(0.92 0.07 ${a.hue})`, color: `oklch(0.38 0.16 ${a.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {a.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{a.emp}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{a.role}</div>
                    </div>
                  </div>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    PKR {fmtPK(a.principal)}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>
                      PKR {fmtPK(a.repaid)}
                    </span>
                    <div style={{ width: 120, height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${a.principal === 0 ? 0 : (a.repaid / a.principal) * 100}%`,
                        background: a.status === 'Fully repaid' ? 'var(--fn-success)' : 'var(--fn-accent)',
                      }} />
                    </div>
                  </div>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{
                    fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                    color: a.outstanding === 0 ? 'var(--fn-fg-faint)' : 'var(--fn-fg)',
                  }}>
                    {a.status === 'Cancelled' ? '—' : `PKR ${fmtPK(a.outstanding)}`}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>
                    PKR {fmtPK(a.perMonth)}/mo · {a.monthsLeft}/{a.months} left
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: a.next === '—' ? 'var(--fn-fg-faint)' : 'var(--fn-fg-muted)' }}>{a.next}</span>
                </InsetCell>
                <InsetCell>
                  <Badge tone={a.tone} dot>{a.status}</Badge>
                </InsetCell>
                <InsetCell last>
                  <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {detail && sel && <AdvanceDetailDrawer adv={sel} />}
      {issueOpen && <IssueAdvanceSheet overLimit={overLimit} />}
    </>
  );
}

function AdvanceDetailDrawer({ adv }) {
  const schedule = Array.from({ length: adv.months }).map((_, i) => {
    const mNames = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];
    const paid = i < (adv.repaid / adv.perMonth);
    return {
      month: mNames[i] || `Month ${i + 1}`,
      scheduled: adv.perMonth,
      actual: paid ? adv.perMonth : null,
      status: paid ? 'Deducted' : 'Scheduled',
    };
  });

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 640, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: `oklch(0.92 0.07 ${adv.hue})`, color: `oklch(0.38 0.16 ${adv.hue})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {adv.emp.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{adv.emp} · Advance #{adv.id.toUpperCase()}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>Issued {adv.date} · {adv.role}</div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Summary */}
          <div style={{
            padding: 18, borderRadius: 10,
            background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
            border: '1px solid color-mix(in oklch, var(--fn-accent) 18%, transparent)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-accent-soft-fg)' }}>Outstanding</div>
                <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)', letterSpacing: '-0.02em', lineHeight: 1, marginTop: 6 }}>
                  PKR {fmtPK(adv.outstanding)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fn-fg-muted)' }}>of PKR {fmtPK(adv.principal)} principal</div>
              </div>
              <Badge tone={adv.tone} dot>{adv.status}</Badge>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.6)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(adv.repaid / adv.principal) * 100}%`, background: 'var(--fn-accent)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--fn-fg-muted)' }}>
              <span>{Math.round((adv.repaid / adv.principal) * 100)}% repaid</span>
              <span>{adv.monthsLeft} months remaining</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon={I.edit} style={{ height: 28 }}>Modify</Button>
              <Button size="sm" icon={I.zap} style={{ height: 28 }}>Settle early</Button>
            </div>
          </div>

          {/* Summary card */}
          <SectionInDrawer title="Summary" icon={I.shield}>
            <ConfigRow label="Principal" value={`PKR ${fmtPK(adv.principal)}`} mono />
            <ConfigRow label="Issue date" value={adv.date} mono />
            <ConfigRow label="Approved by" value="Asma Ali · 02 May 2026" sub="Finance Manager" />
            <ConfigRow label="Reason" value="Medical emergency · family member surgery" />
          </SectionInDrawer>

          {/* Schedule */}
          <SectionInDrawer title="Repayment schedule" icon={I.calc}>
            <div style={{ border: '1px solid var(--fn-border)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--fn-bg-subtle)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Month</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Scheduled</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Actual</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((s, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--fn-divider)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>{s.month}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--fn-font-mono)' }}>PKR {fmtPK(s.scheduled)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--fn-font-mono)', color: s.actual ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg-faint)', fontWeight: s.actual ? 600 : 400 }}>
                        {s.actual ? `PKR ${fmtPK(s.actual)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge tone={s.status === 'Deducted' ? 'success' : 'neutral'} dot>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionInDrawer>

          {/* Activity */}
          <SectionInDrawer title="Activity" icon={I.clock}>
            {[
              { d: '15 May 2026', t: 'PKR 25,000 deducted from May payroll', tone: 'success' },
              { d: '02 May 2026', t: 'Approved by Asma Ali', tone: 'accent' },
              { d: '01 May 2026', t: 'Advance request submitted', tone: 'neutral' },
            ].map((a, i, arr) => (
              <div key={i} style={{
                padding: '8px 0', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-divider)' : 'none',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: a.tone === 'success' ? 'var(--fn-success)' : a.tone === 'accent' ? 'var(--fn-accent)' : 'var(--fn-fg-faint)' }} />
                <span style={{ fontSize: 12, color: 'var(--fn-fg)', flex: 1 }}>{a.t}</span>
                <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{a.d}</span>
              </div>
            ))}
          </SectionInDrawer>
        </div>
      </div>
    </>
  );
}

function IssueAdvanceSheet({ overLimit }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 720, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.zap} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Issue salary advance</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>Goes through approval before deductions start</div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <SheetField label="Employee">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
            }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.92 0.07 22)', color: 'oklch(0.38 0.16 22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>HT</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Hassan Tariq</div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Engineer · EMP-0073</div>
              </div>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          {/* Eligibility */}
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 8,
            background: overLimit ? 'var(--fn-danger-soft)' : 'var(--fn-success-soft)',
            border: '1px solid ' + (overLimit ? 'color-mix(in oklch, var(--fn-danger) 25%, transparent)' : 'color-mix(in oklch, var(--fn-success) 25%, transparent)'),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon d={overLimit ? "M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" : I.shield} size={13} style={{ color: overLimit ? 'var(--fn-danger-soft-fg)' : 'var(--fn-success-soft-fg)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: overLimit ? 'var(--fn-danger-soft-fg)' : 'var(--fn-success-soft-fg)' }}>
                Eligibility check
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: overLimit ? 'var(--fn-danger-soft-fg)' : 'var(--fn-success-soft-fg)', lineHeight: 1.55 }}>
              {overLimit ? (
                <>
                  <strong style={{ fontWeight: 700 }}>PKR 250,000 exceeds eligibility cap of PKR 200,000.</strong> Hassan is eligible for up to 1 month basic salary. Adjust amount or contact Finance Manager for an exception.
                </>
              ) : (
                <>
                  <strong style={{ fontWeight: 700 }}>Hassan currently has PKR 0 outstanding.</strong> Eligible for up to <strong style={{ fontWeight: 700 }}>PKR 95,000</strong> (1 month basic salary). Maximum 2 active advances per policy.
                </>
              )}
            </div>
          </div>

          <div style={{ height: 14 }} />
          <SheetField label="Principal amount">
            <Input defaultValue={overLimit ? '250,000' : '80,000'} suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PKR</span>} style={{ height: 42, fontWeight: 600, fontFamily: 'var(--fn-font-mono)' }} />
          </SheetField>

          <div style={{ height: 14 }} />
          <SheetField label="Repayment plan">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <PlanCard title="Single deduction" sub="Full repayment next payroll" />
              <PlanCard title="Spread over N months" sub="5 months · PKR 16,000/mo" active />
              <PlanCard title="Custom schedule" sub="Define each month manually" />
            </div>
          </SheetField>

          <div style={{
            marginTop: 14, padding: 14, borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
              Schedule preview
            </div>
            <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-muted)', lineHeight: 1.8 }}>
              Deduction <strong style={{ color: 'var(--fn-fg)', fontWeight: 700 }}>PKR 16,000</strong> from <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Jun, Jul, Aug, Sep, Oct 2026</strong> payrolls.
            </div>
          </div>

          <div style={{ height: 14 }} />
          <SheetField label="Reason (required)">
            <textarea
              rows={3}
              defaultValue="Medical emergency · need to cover hospital deposit for father's surgery on 18 May."
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </SheetField>

          <div style={{
            marginTop: 16, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-icon-tile)', border: '1px solid var(--fn-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon d={I.send} size={13} style={{ color: 'var(--fn-icon-tile-fg)' }} />
            <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>
              This advance will be approved by <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Asma Ali (Finance Manager)</strong>. You'll be notified when approved.
            </span>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.send} style={overLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            Submit for approval
          </Button>
        </div>
      </div>
    </>
  );
}

function PlanCard({ title, sub, active }) {
  return (
    <button style={{
      textAlign: 'left', padding: 12,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 14, height: 14, borderRadius: 99, flexShrink: 0,
          border: '2px solid ' + (active ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
          background: active ? 'var(--fn-accent)' : 'transparent',
          boxShadow: active ? 'inset 0 0 0 2px var(--fn-bg-panel)' : 'none',
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{title}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginLeft: 20 }}>{sub}</span>
    </button>
  );
}

function SectionInDrawer({ title, icon, children }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--fn-divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon d={icon} size={13} style={{ color: 'var(--fn-fg-muted)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { AdvancesAdmin });
