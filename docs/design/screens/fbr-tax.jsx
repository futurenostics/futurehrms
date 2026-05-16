// Brief 20 — FBR Income Tax Slabs editor
// + Brief 21 — Tax computation breakdown drawer
// (Designed together — they share the stacked slab-bar visualization)

const FY_SLABS_25_26 = [
  { idx: 1, fromPkr: 0, toPkr: 600000, fixed: 0, rate: 0, hue: 145 },
  { idx: 2, fromPkr: 600000, toPkr: 1200000, fixed: 0, rate: 2.5, hue: 175 },
  { idx: 3, fromPkr: 1200000, toPkr: 2400000, fixed: 15000, rate: 12.5, hue: 65 },
  { idx: 4, fromPkr: 2400000, toPkr: 3600000, fixed: 165000, rate: 22.5, hue: 22 },
  { idx: 5, fromPkr: 3600000, toPkr: 6000000, fixed: 435000, rate: 27.5, hue: 280 },
  { idx: 6, fromPkr: 6000000, toPkr: null, fixed: 1095000, rate: 35, hue: 320 },
];

const FY_SLABS_26_27_DRAFT = [
  { idx: 1, fromPkr: 0, toPkr: 600000, fixed: 0, rate: 0, hue: 145 },
  { idx: 2, fromPkr: 600000, toPkr: 1200000, fixed: 0, rate: 2.5, hue: 175 },
  { idx: 3, fromPkr: 1200000, toPkr: 2400000, fixed: 15000, rate: 11, hue: 65, changed: true },
  { idx: 4, fromPkr: 2400000, toPkr: 3600000, fixed: 147000, rate: 21, hue: 22, changed: true },
  { idx: 5, fromPkr: 3600000, toPkr: 6000000, fixed: 399000, rate: 26, hue: 280, changed: true },
  { idx: 6, fromPkr: 6000000, toPkr: null, fixed: 1023000, rate: 33, hue: 320, changed: true },
];

function fmtPK(n) {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(Math.round(n));
  return sign + new Intl.NumberFormat('en-US').format(v);
}

function FbrSlabsEditor({ fy = '2025-26', mode = 'view', impactOpen = false, activateOpen = false, gapError = false }) {
  const isDraft = fy === '2026-27';
  const slabs = isDraft ? FY_SLABS_26_27_DRAFT : FY_SLABS_25_26;

  return (
    <>
      <SettingsBreadcrumb section="Compensation" active="Income Tax (FBR)" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Income tax — FBR slabs
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640 }}>
            Salary tax slabs as published by the Federal Board of Revenue. Configure per fiscal year — previous years stay read-only for audit.
          </p>
        </div>
        <Button icon={I.plus}>New fiscal year slabs</Button>
      </div>

      {/* Permanent warning banner */}
      <div style={{
        marginBottom: 18, padding: '12px 16px', borderRadius: 8,
        background: 'var(--fn-warning-soft)',
        border: '1px solid color-mix(in oklch, var(--fn-warning) 30%, transparent)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Icon
          d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          size={18} stroke={2}
          style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.55 }}>
          <strong style={{ fontWeight: 700 }}>Changes to tax slabs affect every employee's monthly tax deduction.</strong> Always preview before activating. Active slabs cannot be deleted — only superseded by new ones.
        </div>
      </div>

      {/* FY tabs */}
      <div style={{
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        borderRadius: 8, padding: 4,
      }}>
        {[
          { l: 'FY 2026-27', sub: 'Draft', tone: 'warning', active: fy === '2026-27' },
          { l: 'FY 2025-26', sub: 'Active', tone: 'success', active: fy === '2025-26' },
          { l: 'FY 2024-25', sub: 'Historical', tone: 'neutral' },
          { l: 'FY 2023-24', sub: 'Historical', tone: 'neutral' },
        ].map(t => (
          <button key={t.l} style={{
            padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
            background: t.active ? 'var(--fn-bg-subtle)' : 'transparent',
            border: '1px solid ' + (t.active ? 'var(--fn-border-strong)' : 'transparent'),
            display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
            boxShadow: t.active ? 'var(--fn-shadow-xs)' : 'none',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 99,
              background: t.tone === 'success' ? 'var(--fn-success)' : t.tone === 'warning' ? 'var(--fn-warning)' : 'var(--fn-fg-faint)',
            }} />
            <span style={{ fontSize: 13, fontWeight: t.active ? 600 : 500, color: t.active ? 'var(--fn-fg)' : 'var(--fn-fg-muted)' }}>{t.l}</span>
            <span style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.sub}
            </span>
          </button>
        ))}
        <span style={{
          padding: '8px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--fn-accent-soft-fg)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon d={I.plus} size={12} /> Add new
        </span>
      </div>

      {/* Read-only banner for historical/active */}
      {!isDraft && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 8,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12.5, color: 'var(--fn-fg-muted)',
        }}>
          <Icon d={I.lock} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
          <span>
            <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>FY 2025-26 is active</strong> · effective 1 Jul 2025 – 30 Jun 2026 · {fy !== '2025-26' && 'these slabs are preserved for audit and cannot be modified.'}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>
            View FBR notification ↗
          </span>
        </div>
      )}

      {/* Slabs card */}
      <Card padded={false}>
        <SectionHeader
          icon={I.scale}
          title={`Tax slabs · FY ${fy}`}
          badge={isDraft ? <Badge tone="warning" dot>Draft</Badge> : <Badge tone="success" dot>Active</Badge>}
          padding="18px 22px 14px"
          right={
            isDraft ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <ToolbarPill small icon={I.layers}>Clone from FY 2025-26</ToolbarPill>
                <ToolbarPill small icon={I.shield}>Source FBR notification</ToolbarPill>
              </div>
            ) : null
          }
        />

        {gapError && (
          <div style={{
            margin: '0 22px 12px', padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-danger-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-danger) 28%, transparent)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--fn-danger-soft-fg)',
          }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={13} stroke={2} />
            <span><strong style={{ fontWeight: 700 }}>Gap between Slab 4 and Slab 5</strong> · Slab 4 ends at PKR 3,600,000 but Slab 5 starts at PKR 4,000,000. Slabs must be contiguous.</span>
          </div>
        )}

        <InsetTable
          padding={14}
          cols={[
            { label: 'Slab', width: 80 },
            { label: 'Annual income range' },
            { label: 'Fixed amount', align: 'right', width: 150 },
            { label: 'Rate', align: 'right', width: 80 },
            { label: 'Effective computation' },
          ]}
        >
          <tbody>
            {slabs.map((s, i) => (
              <InsetRow key={s.idx} bordered={i < slabs.length - 1} highlight={s.changed ? 'color-mix(in oklch, var(--fn-warning-soft) 60%, transparent)' : undefined}>
                <InsetCell first>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)',
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.55 0.16 ${s.hue})` }} />
                    Slab {s.idx}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)' }}>
                    PKR {fmtPK(s.fromPkr)} – {s.toPkr ? fmtPK(s.toPkr) : <span style={{ color: 'var(--fn-fg-muted)' }}>and above</span>}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: s.fixed === 0 ? 'var(--fn-fg-faint)' : 'var(--fn-fg)' }}>
                    {s.fixed === 0 ? '—' : `PKR ${fmtPK(s.fixed)}`}
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  {isDraft ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 6,
                      background: s.changed ? 'var(--fn-warning-soft)' : 'var(--fn-bg-panel)',
                      border: '1px solid ' + (s.changed ? 'color-mix(in oklch, var(--fn-warning) 30%, transparent)' : 'var(--fn-border-strong)'),
                      fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--fn-font-mono)',
                      color: s.changed ? 'var(--fn-warning-soft-fg)' : 'var(--fn-fg)',
                    }}>
                      {s.rate}%
                      {s.changed && <Icon d={I.edit} size={9} style={{ opacity: 0.7 }} />}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600 }}>{s.rate}%</span>
                  )}
                </InsetCell>
                <InsetCell>
                  <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5 }}>
                    {s.fixed === 0 && s.rate === 0
                      ? <>No tax on first <span style={{ fontFamily: 'var(--fn-font-mono)' }}>PKR {fmtPK(s.toPkr)}</span></>
                      : <>PKR <span style={{ fontFamily: 'var(--fn-font-mono)' }}>{fmtPK(s.fixed)}</span> + <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 600 }}>{s.rate}%</span> on income over PKR <span style={{ fontFamily: 'var(--fn-font-mono)' }}>{fmtPK(s.fromPkr)}</span></>
                    }
                  </span>
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {/* Worked example panel */}
      <Card padded={false} style={{ marginTop: 18 }}>
        <SectionHeader
          icon={I.calc}
          title="How this works"
          badge={<Badge tone="accent">Live preview</Badge>}
          padding="18px 22px 14px"
          right={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 6,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)',
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontWeight: 500 }}>Sample annual salary:</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>
                PKR 1,500,000
              </span>
              <Icon d={I.edit} size={11} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
            </div>
          }
        />
        <div style={{ padding: '0 22px 22px' }}>
          {/* Stacked slab bar */}
          <SlabBar slabs={slabs} income={1500000} />

          {/* Calculation steps */}
          <div style={{
            marginTop: 18, padding: 18, borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--fn-fg-faint)', marginBottom: 12,
            }}>
              Step-by-step
            </div>
            <div style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, color: 'var(--fn-fg-muted)', lineHeight: 1.9 }}>
              <CalcRow label="Annual salary" value="PKR 1,500,000" bold />
              <CalcRow label="First PKR 600,000 (Slab 1 · 0%)" value="PKR 0" />
              <CalcRow label="Next PKR 600,000 (Slab 2 · 2.5%)" value="+ PKR 15,000" />
              <CalcRow label="Remaining PKR 300,000 (Slab 3 · 12.5%)" value="+ PKR 37,500" />
              <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                <CalcRow label="Annual tax" value="PKR 52,500" highlight />
                <CalcRow label="Monthly tax (÷ 12)" value="PKR 4,375" highlight bold />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Rules */}
      <Card padded={false} style={{ marginTop: 18 }}>
        <SectionHeader icon={I.shield} title="Additional rules & rebates" padding="18px 22px 14px" />
        <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RebateRow label="Salary tax credit" hint="Standard rebate for eligible employees · per Section 60" on={true} extras="0% rebate · default per FBR" />
          <RebateRow label="Disabled-person rebate" hint="Additional rebate for employees with disabilities" on={true} extras="50% reduction · evidence required" />
          <RebateRow label="Senior citizen rebate" hint="For employees aged 60+ earning ≤ PKR 1M" on={true} extras="50% reduction · age threshold 60" />
          <RebateRow label="Donations rebate (Section 61)" hint="For approved donations to recognized charities" on={false} extras="Disabled — toggle on to allow per-employee claims" />
        </div>
      </Card>

      {/* Sample impact */}
      {isDraft && (
        <Card padded={false} style={{ marginTop: 18 }}>
          <SectionHeader
            icon={I.users}
            title="Sample impact · current draft vs FY 2025-26 (active)"
            badge={<Badge tone="info">5 of 84 shown</Badge>}
            padding="18px 22px 14px"
            right={
              <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>
                View full impact analysis →
              </span>
            }
          />
          <InsetTable
            padding={14}
            cols={[
              { label: 'Employee' },
              { label: 'Annual gross', align: 'right', width: 140 },
              { label: 'Monthly tax · FY 25-26', align: 'right', width: 170 },
              { label: 'Monthly tax · draft', align: 'right', width: 160 },
              { label: 'Delta', align: 'right', width: 130 },
            ]}
          >
            <tbody>
              {[
                { name: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, annual: 2520000, oldM: 18438, newM: 16650, delta: -1788 },
                { name: 'Talha Mansoor', role: 'BD Manager', hue: 65, annual: 3000000, oldM: 24375, newM: 21750, delta: -2625 },
                { name: 'Hassan Tariq', role: 'Engineer', hue: 22, annual: 1140000, oldM: 1125, newM: 1125, delta: 0 },
                { name: 'Sana Lateef', role: 'BD Lead', hue: 175, annual: 2220000, oldM: 14688, newM: 13350, delta: -1338 },
                { name: 'Faisal Anwar', role: 'CEO', hue: 280, annual: 7800000, oldM: 81250, newM: 76000, delta: -5250 },
              ].map((e, i, arr) => (
                <InsetRow key={e.name} bordered={i < arr.length - 1}>
                  <InsetCell first>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: `oklch(0.92 0.07 ${e.hue})`,
                        color: `oklch(0.38 0.16 ${e.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {e.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{e.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{e.role}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>
                      PKR {fmtPK(e.annual)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg-muted)' }}>
                      PKR {fmtPK(e.oldM)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', fontWeight: 600 }}>
                      PKR {fmtPK(e.newM)}
                    </span>
                  </InsetCell>
                  <InsetCell align="right">
                    {e.delta === 0 ? (
                      <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>
                    ) : (
                      <Badge tone={e.delta < 0 ? 'success' : 'danger'} trend={e.delta < 0 ? 'down' : 'up'}>
                        PKR {fmtPK(e.delta)}
                      </Badge>
                    )}
                  </InsetCell>
                </InsetRow>
              ))}
            </tbody>
          </InsetTable>
          <div style={{ height: 14 }} />
        </Card>
      )}

      {/* Sticky footer for drafts */}
      {isDraft && (
        <div style={{
          marginTop: 22, padding: '14px 18px',
          background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
          borderRadius: 8, boxShadow: 'var(--fn-shadow-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--fn-warning)' }} />
            Last saved 2 minutes ago · draft for FY 2026-27
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button variant="secondary" size="sm">Save as draft</Button>
            <Button size="sm" icon={I.lock}>Activate for FY 2026-27</Button>
          </div>
        </div>
      )}

      {impactOpen && <FullImpactDrawer />}
      {activateOpen && <ActivateModal />}
    </>
  );
}

function CalcRow({ label, value, bold, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '2px 0',
    }}>
      <span style={{ color: highlight ? 'var(--fn-fg)' : 'var(--fn-fg-muted)', fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span style={{
        color: highlight ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
        fontWeight: bold ? 700 : 500,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function RebateRow({ label, hint, on, extras }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Toggle on={on} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{hint}</div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)', fontStyle: 'italic' }}>{extras}</span>
      <Icon d={I.edit} size={12} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
    </div>
  );
}

function SlabBar({ slabs, income }) {
  // Compute how much of income falls into each slab
  const segments = slabs.map(s => {
    const from = s.fromPkr;
    const to = s.toPkr || Math.max(income, s.fromPkr + 1);
    const inThisSlab = Math.max(0, Math.min(income, to) - from);
    return { ...s, inThisSlab };
  });
  const totalInBar = Math.max(income, 1);

  return (
    <div>
      {/* Y-axis labels for income markers (PKR thresholds) */}
      <div style={{ position: 'relative', marginBottom: 6, height: 16 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)',
        }}>
          PKR 0
        </div>
        <div style={{
          position: 'absolute', right: 0, top: 0, fontSize: 10, color: 'var(--fn-fg)', fontFamily: 'var(--fn-font-mono)', fontWeight: 600,
        }}>
          PKR {fmtPK(income)} (annual)
        </div>
      </div>

      {/* Bar */}
      <div style={{
        display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden',
        border: '1px solid var(--fn-border)',
      }}>
        {segments.map(s => {
          if (s.inThisSlab === 0) return null;
          const widthPct = (s.inThisSlab / totalInBar) * 100;
          return (
            <div key={s.idx} style={{
              width: `${widthPct}%`,
              background: `oklch(0.55 0.16 ${s.hue})`,
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 0,
            }} title={`Slab ${s.idx} · ${s.rate}%`}>
              {widthPct > 8 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'var(--fn-font-mono)',
                  letterSpacing: '0.04em',
                }}>
                  {s.rate}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
      }}>
        {segments.filter(s => s.inThisSlab > 0).map(s => (
          <div key={s.idx} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.55 0.16 ${s.hue})`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fn-fg)' }}>Slab {s.idx} · {s.rate}%</div>
              <div style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>
                PKR {fmtPK(s.inThisSlab)} in this slab
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullImpactDrawer() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 680, zIndex: 51,
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
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={I.users} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Full impact analysis</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              84 employees · current FY 25-26 vs draft FY 26-27
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <SummaryStat label="Total monthly tax · current" value="PKR 412,890" />
            <SummaryStat label="Total monthly tax · draft" value="PKR 386,420" tone="success" />
            <SummaryStat label="Delta · per month" value="-PKR 26,470" tone="success" />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 10 }}>
            Largest impact (top 10 by absolute delta)
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              padding: '10px 12px', marginBottom: 6, borderRadius: 6,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 6,
                background: `oklch(0.92 0.07 ${[280, 175, 145, 65, 22, 200, 245, 320][i]})`,
                color: `oklch(0.38 0.16 ${[280, 175, 145, 65, 22, 200, 245, 320][i]})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>
                {['BR', 'TM', 'SL', 'OS', 'FA', 'MK', 'FI', 'HT'][i]}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>
                {['Bilal Rauf', 'Talha Mansoor', 'Sana Lateef', 'Omar Sheikh', 'Faisal Anwar', 'Maira Khan', 'Faraz Iqbal', 'Hassan Tariq'][i]}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>
                {fmtPK([18438, 24375, 14688, 18438, 81250, 14688, 9438, 1125][i])} → {fmtPK([16650, 21750, 13350, 16650, 76000, 13350, 8175, 1125][i])}
              </span>
              <Badge tone={i === 7 ? 'neutral' : 'success'} trend={i === 7 ? null : 'down'}>
                {i === 7 ? '—' : fmtPK([-1788, -2625, -1338, -1788, -5250, -1338, -1263][i])}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SummaryStat({ label, value, tone }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)' }}>
        {label}
      </div>
      <div style={{
        marginTop: 4, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--fn-font-mono)',
        color: tone === 'success' ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg)',
      }}>{value}</div>
    </div>
  );
}

function ActivateModal() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.55)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 580, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.5)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--fn-warning-soft)', color: 'var(--fn-warning-soft-fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.lock} size={18} stroke={2} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--fn-fg)' }}>Activate FY 2026-27 tax slabs?</div>
              <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 3 }}>
                This affects <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>every employee's</strong> tax withholding from <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>1 July 2026</strong>.
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{
            padding: 14, borderRadius: 8,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
              Confirm you have done all three
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'I have verified these slabs against the official FBR notification', checked: true },
                { l: 'I have run the sample impact analysis and reviewed the deltas', checked: true },
                { l: 'I understand this affects every employee\'s payroll from 1 July 2026', checked: false },
              ].map((c, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  padding: '8px 10px', borderRadius: 6,
                  background: c.checked ? 'var(--fn-success-soft)' : 'var(--fn-bg-panel)',
                  border: '1px solid ' + (c.checked ? 'color-mix(in oklch, var(--fn-success) 25%, transparent)' : 'var(--fn-border)'),
                  cursor: 'pointer',
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: c.checked ? 'var(--fn-success)' : 'var(--fn-bg-panel)',
                    border: '1.5px solid ' + (c.checked ? 'var(--fn-success)' : 'var(--fn-border-strong)'),
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.checked && <Icon d={I.check} size={10} stroke={3} style={{ color: '#fff' }} />}
                  </span>
                  <span style={{ fontSize: 12, color: c.checked ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg)', fontWeight: c.checked ? 500 : 400, lineHeight: 1.5 }}>
                    {c.l}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--fn-fg)' }}>
            Type <span style={{ fontFamily: 'var(--fn-font-mono)', padding: '1px 7px', borderRadius: 4, background: 'var(--fn-bg-inset)', fontSize: 11.5 }}>ACTIVATE FY 2026-27</span> to confirm
          </label>
          <Input
            defaultValue="ACTIVATE FY 20"
            style={{ height: 40, fontFamily: 'var(--fn-font-mono)', fontSize: 13, fontWeight: 600 }}
            suffix={<span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--fn-accent)' }} />}
          />

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-warning-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
            fontSize: 11.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Icon d={I.shield} size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              Active slabs are immutable. After activation: FY 2025-26 moves to historical (read-only), the FY 2026-27 slabs apply to every payroll run from 1 July 2026. Logged as <span style={{ fontFamily: 'var(--fn-font-mono)' }}>tax.slabs.activated</span>.
            </span>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.lock}>Activate</Button>
        </div>
      </div>
    </>
  );
}

// ───── Brief 21 — Tax computation breakdown drawer ─────

function TaxBreakdownDrawer({ variant = 'hr', scenario = 'standard' }) {
  const isEmployee = variant === 'employee';
  const isBonus = scenario === 'bonus';
  const isZero = scenario === 'zero';
  return (
    <div style={{
      width: '100%', minHeight: '100%', padding: 24,
      background: 'rgba(20, 16, 38, 0.30)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div style={{
        width: 720, background: 'var(--fn-bg-panel)',
        borderRadius: 10, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.30)',
        display: 'flex', flexDirection: 'column', maxHeight: '100%',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={I.calc} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)' }}>
              Tax computation · May 2026
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              Bilal Rauf · EMP-0042 · FY 2025-26 slabs (active)
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Summary */}
          <div style={{
            padding: 18, borderRadius: 10,
            background: 'linear-gradient(140deg, var(--fn-accent-soft) 0%, oklch(0.96 0.03 175) 100%)',
            border: '1px solid color-mix(in oklch, var(--fn-accent) 22%, transparent)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--fn-accent-soft-fg)',
            }}>
              {isZero ? 'Tax withheld this month' : isBonus ? 'Tax withheld (incl. bonus catch-up)' : 'Tax withheld this month'}
            </div>
            <div style={{
              marginTop: 8, fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', lineHeight: 1,
              fontFamily: 'var(--fn-font-mono)',
            }}>
              PKR {isZero ? '0' : isBonus ? '18,400' : '10,211'}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--fn-fg-muted)' }}>
              Computed from <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>PKR {isZero ? '480,000' : isBonus ? '2,772,724' : '2,522,724'}</strong> annualized income · FY 2025-26 slabs
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon={I.download} style={{ height: 28 }}>Download as PDF</Button>
              {!isEmployee && <Button variant="secondary" size="sm" icon={I.scale} style={{ height: 28 }}>View slab config</Button>}
              {isEmployee && (
                <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer', alignSelf: 'center' }}>
                  Disagree with this calculation? →
                </span>
              )}
            </div>
          </div>

          {/* Bonus explainer */}
          {isBonus && (
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 8,
              background: 'var(--fn-warning-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Icon d={I.zap} size={14} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.55 }}>
                <strong style={{ fontWeight: 700 }}>Why is this month's tax higher?</strong> {isEmployee
                  ? 'You received a bonus this month that brought your projected annual income into a higher slab range. The system catches up the under-withholding from earlier months.'
                  : <>Bonus of PKR 250,000 paid in May. Annualized income jumped from PKR 2,522,724 to PKR 2,772,724 — pushing more into Slab 3. Catch-up of <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 700 }}>+PKR 8,189</span> applied.</>
                }
              </div>
            </div>
          )}

          {/* Income basis */}
          {!isEmployee && !isZero && (
            <BreakdownSection title="Income basis" icon={I.calc} sub="How we annualize your monthly salary">
              <div style={{
                padding: 14, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.9,
              }}>
                <CalcRow label="Monthly gross (this month)" value="PKR 210,227" />
                <CalcRow label="× projected months remaining" value="× 2" />
                <CalcRow label="= projected future income" value="PKR 420,454" />
                <CalcRow label="+ YTD cumulative gross (Jul – Apr)" value="+ PKR 1,890,000" />
                <CalcRow label="+ this month gross" value="+ PKR 210,227" />
                <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                  <CalcRow label="Annualized fiscal year income" value="PKR 2,522,724" highlight bold />
                </div>
              </div>
              <div style={{
                marginTop: 10, fontSize: 11.5, color: 'var(--fn-fg-faint)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={12} />
                <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Why annualized?</span>
              </div>
            </BreakdownSection>
          )}

          {/* Slabs applied — the canonical visualization shared with Brief 20 */}
          <BreakdownSection title="Slabs applied" icon={I.scale} sub="How your annualized income distributes across FBR slabs">
            <SlabBar slabs={FY_SLABS_25_26} income={isZero ? 480000 : isBonus ? 2772724 : 2522724} />

            <div style={{
              marginTop: 16, padding: 14, borderRadius: 8,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.9,
            }}>
              {isZero ? (
                <CalcRow label="Annualized income PKR 480,000 falls entirely in Slab 1 (0%)" value="PKR 0" bold highlight />
              ) : (
                <>
                  <CalcRow label="Slab 1 · PKR 0 – 600,000 · 0%" value="PKR 0" />
                  <CalcRow label="Slab 2 · PKR 600,000 × 2.5%" value="+ PKR 15,000" />
                  <CalcRow label={`Slab 3 · PKR ${isBonus ? '1,200,000' : '1,200,000'} × 12.5%`} value={`+ PKR ${isBonus ? '150,000' : '150,000'}`} />
                  {isBonus && <CalcRow label="Slab 3 (extra from bonus) · PKR 250,000 × 12.5%" value="+ PKR 31,250" />}
                  <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                    <CalcRow label="Annual tax (before rebates)" value={isBonus ? 'PKR 196,250' : 'PKR 165,000'} highlight bold />
                  </div>
                </>
              )}
            </div>
          </BreakdownSection>

          {/* Rebates */}
          {!isZero && !isEmployee && (
            <BreakdownSection title="Rebates & credits" icon={I.shield}>
              <div style={{
                padding: 14, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.9,
              }}>
                <CalcRow label="Salary tax credit (Section 60)" value="-PKR 0" />
                <CalcRow label="Senior citizen rebate" value="not applicable" />
                <CalcRow label="Donations rebate (Section 61)" value="-PKR 5,000" />
                <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                  <CalcRow label="Total rebates" value="-PKR 5,000" highlight bold />
                </div>
              </div>
            </BreakdownSection>
          )}

          {/* Withholding */}
          {!isZero && (
            <BreakdownSection title="Withholding" icon={I.card}>
              <div style={{
                padding: 14, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                fontFamily: 'var(--fn-font-mono)', fontSize: 12, lineHeight: 1.9,
              }}>
                <CalcRow label="Annual tax (after rebates)" value={isBonus ? 'PKR 191,250' : 'PKR 160,000'} />
                <CalcRow label="÷ 12 months" value={isBonus ? 'PKR 15,938/mo base' : 'PKR 13,333/mo base'} />
                {isBonus && <CalcRow label="Catch-up adjustment (bonus retroactive)" value="+ PKR 2,462" />}
                <div style={{ borderTop: '1px solid var(--fn-border)', marginTop: 6, paddingTop: 6 }}>
                  <CalcRow label="This month's deduction" value={isBonus ? 'PKR 18,400' : 'PKR 10,211'} highlight bold />
                </div>
              </div>
            </BreakdownSection>
          )}

          {/* YTD */}
          {!isZero && (
            <BreakdownSection title="Year-to-date" icon={I.clock}>
              <div style={{
                padding: 16, borderRadius: 8,
                background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)' }}>Tax withheld FY 2025-26 so far</div>
                    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', letterSpacing: '-0.02em' }}>
                      PKR {isBonus ? '111,290' : '92,890'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-muted)' }}>Expected for full year</div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg-muted)' }}>
                      PKR {isBonus ? '191,250' : '160,000'}
                    </div>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--fn-bg-panel)', overflow: 'hidden', border: '1px solid var(--fn-border)' }}>
                  <div style={{
                    height: '100%', width: isBonus ? '58%' : '58%',
                    background: 'var(--fn-accent)',
                  }} />
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fn-fg-faint)' }}>
                  <span>58% of expected annual withheld</span>
                  <span>Remaining: PKR {isBonus ? '79,960' : '67,110'} over 2 months</span>
                </div>
              </div>
            </BreakdownSection>
          )}

          {/* Notes (HR only) */}
          {!isEmployee && (
            <BreakdownSection title="Notes" icon={I.edit}>
              <div style={{
                padding: 12, borderRadius: 8,
                background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
                fontSize: 12, color: 'var(--fn-fg-muted)', fontStyle: 'italic',
              }}>
                {isBonus
                  ? '"Bonus of PKR 250,000 paid in May caused tax catch-up." — Asma Ali · 02 Jun 2026'
                  : 'No notes on this computation.'}
              </div>
            </BreakdownSection>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownSection({ title, sub, icon, children }) {
  return (
    <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--fn-divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={icon} size={13} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)' }}>{title}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>· {sub}</span>}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { FbrSlabsEditor, TaxBreakdownDrawer });
