// New / Edit Commission Rule — friendly form with live preview
function CommissionRuleForm({ currency = 'USD' }) {
  // Sample form state — represents a "fresh rule" being built
  const splitMode = 'percent'; // 'percent' | 'fixed'
  const roles = [
    { id: 'winner', label: 'Winner', sub: 'Closes the deal', pct: 50, icon: '🏆', hue: 280 },
    { id: 'communicator', label: 'Communicator', sub: 'Day-to-day client owner', pct: 30, icon: '💬', hue: 200 },
    { id: 'eligible', label: 'Eligible team', sub: 'Split equally · 4 people', pct: 20, icon: '👥', hue: 175 },
  ];
  const sumPct = roles.reduce((s, r) => s + r.pct, 0);
  const poolPct = 24;
  const sampleRev = 10000;
  const pool = sampleRev * (poolPct / 100);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Back to rules</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            New commission rule
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)', maxWidth: 600 }}>
            Define how commissions split for one department × category. The live preview shows exactly what a $10,000 project would pay out under this rule.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost">Cancel</Button>
          <Button variant="secondary">Save as draft</Button>
          <Button iconRight={I.arrowR}>Publish as v3.3</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* LEFT — form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Scope card */}
          <Card padded={false}>
            <SectionHeader icon={I.scale} title="Scope" />
            <div style={{ padding: '0 22px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <RuleField label="Department" hint="Engineering Eng band 1–3 are covered by this rule.">
                <DropdownPicker value="Engineering" hint="Eng band 1–3 · 42 people" hue={280} />
              </RuleField>
              <RuleField label="Project category" hint="External · direct client projects only.">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {['External', 'Upwork', 'B2B'].map((c, i) => (
                    <button key={c} style={{
                      padding: '12px 10px', fontSize: 13, fontWeight: 600,
                      background: i === 0 ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                      color: i === 0 ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
                      border: '1px solid ' + (i === 0 ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
                      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <span>{c}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.7 }}>
                        {c === 'External' ? '11 projects' : c === 'Upwork' ? '8 projects' : '4 projects'}
                      </span>
                    </button>
                  ))}
                </div>
              </RuleField>
            </div>
          </Card>

          {/* Pool size */}
          <Card padded={false}>
            <SectionHeader
              icon={I.calc}
              title="Commission pool"
              right={
                <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
                  <span style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                    background: 'var(--fn-bg-panel)', color: 'var(--fn-fg)',
                    boxShadow: 'var(--fn-shadow-xs)',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ fontFamily: 'var(--fn-font-mono)' }}>%</span> Percentage
                  </span>
                  <span style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--fn-fg-faint)',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ fontFamily: 'var(--fn-font-mono)' }}>$</span> Fixed amount
                  </span>
                </div>
              }
            />
            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 14 }}>
                What % of project revenue goes into the commission pool? <span style={{ color: 'var(--fn-fg-faint)' }}>Switch to <strong style={{ fontWeight: 600 }}>Fixed amount</strong> if your rule pays the same flat amount per project.</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 18,
                padding: '14px 18px', borderRadius: 10,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              }}>
                <span style={{
                  fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', lineHeight: 1,
                }}>
                  24<span style={{ color: 'var(--fn-fg-faint)', fontWeight: 500, fontSize: 28 }}>%</span>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative', height: 24, marginTop: 2 }}>
                    <div style={{
                      position: 'absolute', top: 11, left: 0, right: 0, height: 4,
                      borderRadius: 99, background: 'var(--fn-bg-inset)',
                    }} />
                    <div style={{
                      position: 'absolute', top: 11, left: 0, width: `${poolPct * 2}%`, height: 4,
                      borderRadius: 99, background: 'var(--fn-accent)',
                    }} />
                    {[10, 20, 30, 40, 50].map(t => (
                      <div key={t} style={{
                        position: 'absolute', top: 8, left: `${t * 2}%`, width: 1, height: 10,
                        background: t === poolPct ? 'var(--fn-accent)' : 'var(--fn-fg-faint)',
                        opacity: t === poolPct ? 1 : 0.4,
                      }} />
                    ))}
                    <div style={{
                      position: 'absolute', top: 5, left: `calc(${poolPct * 2}% - 8px)`,
                      width: 16, height: 16, borderRadius: 99,
                      background: 'var(--fn-accent)', border: '3px solid var(--fn-bg-panel)',
                      boxShadow: 'var(--fn-shadow-sm)', cursor: 'grab',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>
                    <span>0%</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50%</span>
                  </div>
                </div>
              </div>

              {/* Inactive Fixed amount preview row — shows the alternative mode */}
              <div style={{
                marginTop: 10, padding: '14px 18px', borderRadius: 10,
                background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
                display: 'flex', alignItems: 'center', gap: 14, opacity: 0.7,
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--fn-font-mono)', fontSize: 16, fontWeight: 600,
                }}>$</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Fixed pool per project</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                    e.g. <span style={{ fontFamily: 'var(--fn-font-mono)' }}>$2,400</span> regardless of revenue · used for B2B rules with negotiated flat fees
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>
                  Switch →
                </span>
              </div>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
                <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={14} style={{ color: 'var(--fn-fg-faint)', flexShrink: 0 }} />
                Engineering External rules elsewhere average <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>22–26%</strong>. You're in the safe range.
              </div>
            </div>
          </Card>

          {/* Split */}
          <Card padded={false}>
            <SectionHeader
              icon={I.users}
              title="Pool split"
              right={
                <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2 }}>
                  <span style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                    background: 'var(--fn-bg-panel)', color: 'var(--fn-fg)',
                    boxShadow: 'var(--fn-shadow-xs)',
                  }}>Percentages</span>
                  <span style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--fn-fg-faint)',
                  }}>Fixed amounts</span>
                </div>
              }
            />
            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 14 }}>
                How is the pool divided across the people credited on a project?
              </div>

              {/* Role rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {roles.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', background: 'var(--fn-bg-subtle)',
                    border: '1px solid var(--fn-border)', borderRadius: 10,
                  }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `oklch(0.93 0.06 ${r.hue})`,
                      color: `oklch(0.38 0.15 ${r.hue})`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>{r.icon}</span>
                    <div style={{ width: 160 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{r.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{r.sub}</div>
                    </div>
                    {/* slider */}
                    <div style={{ flex: 1, position: 'relative', height: 24 }}>
                      <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)' }} />
                      <div style={{ position: 'absolute', top: 11, left: 0, width: `${r.pct}%`, height: 4, borderRadius: 99, background: `oklch(0.55 0.15 ${r.hue})` }} />
                      <div style={{
                        position: 'absolute', top: 5, left: `calc(${r.pct}% - 8px)`,
                        width: 16, height: 16, borderRadius: 99,
                        background: `oklch(0.55 0.15 ${r.hue})`, border: '3px solid var(--fn-bg-panel)',
                        boxShadow: 'var(--fn-shadow-sm)',
                      }} />
                    </div>
                    {/* % input */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '0 12px 0 14px', height: 36, minWidth: 80,
                      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
                      borderRadius: 6,
                    }}>
                      <span style={{
                        fontSize: 16, fontWeight: 600, fontFamily: 'var(--fn-font-mono)',
                        color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right',
                      }}>{r.pct}</span>
                      <span style={{ fontSize: 13, color: 'var(--fn-fg-faint)' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another */}
              <button style={{
                marginTop: 10, padding: '11px 16px', width: '100%',
                background: 'transparent', border: '1px dashed var(--fn-border-strong)',
                borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 500, color: 'var(--fn-fg-muted)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Icon d={I.plus} size={13} /> Add another role
              </button>

              {/* Sanity check */}
              <div style={{
                marginTop: 14, padding: '12px 14px', borderRadius: 8,
                background: sumPct === 100 ? 'var(--fn-success-soft)' : 'var(--fn-danger-soft)',
                border: '1px solid ' + (sumPct === 100 ? 'color-mix(in oklch, var(--fn-success) 25%, transparent)' : 'color-mix(in oklch, var(--fn-danger) 25%, transparent)'),
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 99,
                  background: sumPct === 100 ? 'var(--fn-success)' : 'var(--fn-danger)',
                  color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon d={sumPct === 100 ? I.check : 'M12 9v4M12 17h.01'} size={12} stroke={3} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sumPct === 100 ? 'var(--fn-success-soft-fg)' : 'var(--fn-danger-soft-fg)' }}>
                    {sumPct === 100 ? 'Splits add up to 100% ✓' : `Splits total ${sumPct}% — needs to be exactly 100%`}
                  </div>
                  <div style={{ fontSize: 11.5, color: sumPct === 100 ? 'var(--fn-success-soft-fg)' : 'var(--fn-danger-soft-fg)', opacity: 0.85, marginTop: 2 }}>
                    Winner 50% + Communicator 30% + Eligible team 20%
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Effective date */}
          <Card padded={false}>
            <SectionHeader icon={I.clock} title="When does it apply?" />
            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { l: 'Next processing run', s: 'Starts 01 June 2026', active: true, hue: 280 },
                  { l: 'Specific date', s: 'Pick a future date', hue: 200 },
                ].map(o => (
                  <button key={o.l} style={{
                    textAlign: 'left', padding: 14,
                    background: o.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                    color: o.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
                    border: '1px solid ' + (o.active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                      border: '2px solid ' + (o.active ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
                      background: o.active ? 'var(--fn-accent)' : 'transparent',
                      boxShadow: o.active ? 'inset 0 0 0 3px var(--fn-bg-panel)' : 'none',
                    }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.l}</div>
                      <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>{o.s}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--fn-fg-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon d={I.shield} size={14} style={{ color: 'var(--fn-fg-faint)' }} />
                Historical runs always use the rule that was active at the time — old months won't change.
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — live preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card padded={false} style={{ position: 'sticky', top: 12 }}>
            <SectionHeader
              icon={I.eye}
              title="Live preview"
              badge={<Badge tone="accent">Auto-updates</Badge>}
            />
            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginBottom: 14 }}>
                How a sample <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>${sampleRev.toLocaleString()}</strong> External / Engineering project would pay out under this rule.
              </div>

              {/* Big total */}
              <div style={{
                padding: 18, borderRadius: 10,
                background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
                border: '1px solid color-mix(in oklch, var(--fn-accent) 20%, transparent)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-accent-soft-fg)' }}>
                    Commission pool
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontFamily: 'var(--fn-font-mono)' }}>
                    {poolPct}% × ${sampleRev.toLocaleString()}
                  </span>
                </div>
                <div style={{
                  marginTop: 8, fontSize: 38, fontWeight: 600,
                  letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
                  color: 'var(--fn-fg)', lineHeight: 1,
                }}>
                  ${pool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fn-accent-soft-fg)' }}>
                  USD · split across {roles.length} role groups below
                </div>
              </div>

              {/* Per-role amounts */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roles.map(r => {
                  const amt = pool * (r.pct / 100);
                  return (
                    <div key={r.id} style={{
                      padding: '12px 14px', borderRadius: 8,
                      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: 7,
                        background: `oklch(0.93 0.06 ${r.hue})`,
                        color: `oklch(0.38 0.15 ${r.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, flexShrink: 0,
                      }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{r.label}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{r.pct}% of pool</span>
                        </div>
                        <div style={{
                          marginTop: 4, fontSize: 18, fontWeight: 600,
                          fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em',
                          color: `oklch(0.42 0.15 ${r.hue})`,
                        }}>
                          ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sanity row */}
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--fn-bg-subtle)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 12.5, color: 'var(--fn-fg-muted)',
              }}>
                <span>Sum of payouts</span>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fn-fg)' }}>
                  ${pool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <Icon d={I.check} size={11} stroke={3} style={{ color: 'var(--fn-success)', marginLeft: 8 }} />
                </span>
              </div>
            </div>
          </Card>

          {/* Comparison */}
          <Card padded={false}>
            <SectionHeader icon={I.scale} title="Compare to current rule" padding="18px 22px 14px" />
            <div style={{ padding: '0 22px 22px' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { l: 'Pool %', prev: '24%', next: '24%', same: true },
                    { l: 'Winner', prev: '50% · $1,200', next: '50% · $1,200', same: true },
                    { l: 'Communicator', prev: '30% · $720', next: '30% · $720', same: true },
                    { l: 'Eligible team', prev: '20% · $480', next: '20% · $480', same: true },
                    { l: 'Effective from', prev: '01 May 2026', next: '01 Jun 2026', changed: true },
                  ].map((row, i, arr) => (
                    <tr key={row.l} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--fn-divider)' : 'none' }}>
                      <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--fn-fg-muted)' }}>{row.l}</td>
                      <td style={{ padding: '10px 0', fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-faint)', textAlign: 'right' }}>
                        {row.prev}
                      </td>
                      <td style={{ padding: '10px 0 10px 14px', width: 14, textAlign: 'center' }}>
                        <Icon d={I.arrowR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
                      </td>
                      <td style={{
                        padding: '10px 0', textAlign: 'right',
                        fontFamily: 'var(--fn-font-mono)', fontSize: 12, fontWeight: row.changed ? 600 : 400,
                        color: row.changed ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
                      }}>
                        {row.next}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                marginTop: 14, padding: '10px 12px',
                background: 'var(--fn-bg-subtle)', borderRadius: 6,
                fontSize: 11.5, color: 'var(--fn-fg-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon d={I.clock} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                Will be saved as <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)', fontWeight: 600 }}>v3.3</span> — previous v3.2 stays queryable forever.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function RuleField({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{hint}</div>}
    </div>
  );
}

function DropdownPicker({ value, hint, hue = 280 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 6, cursor: 'pointer',
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `oklch(0.93 0.06 ${hue})`,
        color: `oklch(0.38 0.15 ${hue})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d={I.building} size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>{hint}</div>}
      </div>
      <Icon d={I.chev} size={14} style={{ color: 'var(--fn-fg-faint)' }} />
    </div>
  );
}

Object.assign(window, { CommissionRuleForm });