// Brief 3 — Log Overtime form (employee portal)
// Sheet-based form with live compensation preview

function LogOvertimePortal({ mode = 'pre_approval', channel = 'pkr_payroll', state = 'filled' }) {
  return (
    <>
      {/* Backdrop portal page peeking behind */}
      <div style={{
        padding: 28,
        display: 'flex', flexDirection: 'column', gap: 14,
        opacity: 0.6,
      }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600 }}>
          My space · Friday 15 May 2026
        </div>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em',
          color: 'var(--fn-fg)', lineHeight: 1,
        }}>
          My overtime
        </h1>
        <div style={{ height: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Card key={i} style={{ height: 96, background: 'var(--fn-bg-subtle)' }} />
          ))}
        </div>
      </div>

      {/* Sheet overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50,
      }} />

      <LogOvertimeSheet mode={mode} channel={channel} state={state} />
    </>
  );
}

function LogOvertimeSheet({ mode, channel, state }) {
  const isPostHoc = mode === 'post_hoc';
  const isCompOff = channel === 'comp_off_leave';
  const isInvalid = state === 'invalid';
  const noRule = state === 'no_rule';
  const submitted = state === 'submitted';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 720, zIndex: 51,
      background: 'var(--fn-bg-panel)',
      boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon d={I.zap} size={16} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fn-fg)' }}>
            Log overtime
          </div>
          <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
            Submit for approval by your manager. Estimated compensation updates as you fill the form.
          </div>
        </div>
        <span style={{
          width: 32, height: 32, borderRadius: 6, cursor: 'pointer', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-fg-muted)',
        }}>
          <Icon d={I.x} size={16} />
        </span>
      </div>

      {submitted ? (
        <SubmittedSuccess />
      ) : (
        <>
          {/* Body — 2 columns */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* LEFT — form */}
            <div style={{ flex: '0 0 440px', overflow: 'auto', padding: '20px 24px', borderRight: '1px solid var(--fn-divider)' }}>
              {/* Mode toggle */}
              <SheetField label="When are you logging this?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <ModeCard
                    title="Pre-approval"
                    sub="Before the work"
                    icon={I.clock}
                    active={!isPostHoc}
                  />
                  <ModeCard
                    title="Post-hoc claim"
                    sub="After the fact"
                    icon={I.flag}
                    active={isPostHoc}
                  />
                </div>
              </SheetField>

              {isPostHoc && (
                <div style={{
                  marginTop: 14, padding: '10px 12px', borderRadius: 6,
                  background: 'var(--fn-warning-soft)',
                  border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <Icon d={I.clock} size={13} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
                    Post-hoc claims may take longer to approve and require a reason for the delay.
                  </span>
                </div>
              )}

              <div style={{ height: 18 }} />

              {/* Date + Time/Hours */}
              <SheetField label="Date">
                <Input
                  defaultValue="Sat, 17 May 2026"
                  icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
                  style={{ height: 40 }}
                />
              </SheetField>

              <div style={{ height: 14 }} />

              <SheetField
                label="Hours worked"
                hint={
                  <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 500, cursor: 'pointer' }}>
                    Enter start/end times instead →
                  </span>
                }
              >
                <Input
                  defaultValue="6"
                  suffix={<span style={{ fontSize: 12, color: 'var(--fn-fg-faint)', fontWeight: 500 }}>hrs</span>}
                  style={{ height: 40, fontWeight: 600, fontSize: 14 }}
                />
              </SheetField>

              <div style={{ height: 14 }} />

              {/* OT Type */}
              <SheetField label="Overtime type">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 40,
                  background: isInvalid ? 'var(--fn-danger-soft)' : 'var(--fn-bg-panel)',
                  border: '1px solid ' + (isInvalid ? 'color-mix(in oklch, var(--fn-danger) 35%, transparent)' : 'var(--fn-border-strong)'),
                  borderRadius: 6, cursor: 'pointer',
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.16 175)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Weekend Work</span>
                  <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Eligible</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
                {isInvalid && (
                  <div style={{
                    marginTop: 6, fontSize: 11.5, color: 'var(--fn-danger-soft-fg)',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={11} />
                    You're not eligible — minimum tenure 3 months required.
                  </div>
                )}
              </SheetField>

              <div style={{ height: 14 }} />

              {/* Project (conditional) */}
              <SheetField label="Project" hint="Required for this OT type — pick the project you worked on.">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 40,
                  background: 'var(--fn-bg-panel)',
                  border: '1px solid var(--fn-border-strong)', borderRadius: 6, cursor: 'pointer',
                }}>
                  <span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--fn-icon-tile)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-icon-tile-fg)' }}>
                    <Icon d={I.briefcase} size={12} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>GreenLeaf — eCommerce</span>
                  <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>PRJ-1035</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>

              <div style={{ height: 14 }} />

              {/* Reason */}
              <SheetField label="Reason" hint="At least 200 characters helps reviewers approve faster.">
                <textarea
                  rows={3}
                  defaultValue="Client emergency on GreenLeaf launch checkout flow — needed to ship the Stripe webhook race-condition fix before Monday's go-live. Worked from 9am–3pm Saturday with Bilal and Faraz."
                  style={{
                    width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                    fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                    background: 'var(--fn-bg-panel)',
                    border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                  }}
                />
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--fn-fg-faint)', textAlign: 'right' }}>
                  216 / 200 minimum
                </div>
              </SheetField>

              {isPostHoc && (
                <>
                  <div style={{ height: 14 }} />
                  <SheetField label="Why are you submitting after the fact?">
                    <textarea
                      rows={2}
                      placeholder="e.g. on-call emergency, no time to file pre-approval…"
                      style={{
                        width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                        fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                        background: 'var(--fn-bg-panel)',
                        border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                      }}
                    />
                  </SheetField>
                </>
              )}

              <div style={{ height: 14 }} />

              {/* Attachment */}
              <SheetField label="Attachment" hint="Optional — screenshot, doc, anything supporting.">
                <div style={{
                  padding: '14px 16px', borderRadius: 6,
                  background: 'var(--fn-bg-subtle)',
                  border: '1px dashed var(--fn-border-strong)',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-muted)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--fn-border-strong)', flexShrink: 0,
                  }}>
                    <Icon d={I.upload} size={13} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>Drop a file or click to browse</div>
                    <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 1 }}>PNG, JPG, PDF · up to 10 MB</div>
                  </div>
                </div>
              </SheetField>
            </div>

            {/* RIGHT — live preview */}
            <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto', background: 'var(--fn-bg-subtle)' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
                color: 'var(--fn-fg-faint)', marginBottom: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Icon d={I.eye} size={12} /> Live estimate
              </div>

              {noRule ? (
                <NoRulePreview />
              ) : isCompOff ? (
                <CompOffPreview />
              ) : (
                <PkrPreview isPostHoc={isPostHoc} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
            background: 'var(--fn-bg-panel)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
              <Icon d={I.shield} size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Estimate locks to a snapshot when your manager approves.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button
                size="sm"
                iconRight={I.arrowR}
                style={isInvalid ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                Submit request
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PkrPreview({ isPostHoc }) {
  return (
    <>
      {/* Big number */}
      <div style={{
        padding: 18, borderRadius: 10,
        background: 'linear-gradient(140deg, oklch(0.95 0.05 175) 0%, oklch(0.96 0.04 280) 100%)',
        border: '1px solid color-mix(in oklch, oklch(0.55 0.16 175) 22%, transparent)',
      }}>
        <div style={{ fontSize: 11.5, color: 'oklch(0.40 0.13 175)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Estimated compensation
        </div>
        <div style={{
          marginTop: 8, fontSize: 36, fontWeight: 600,
          letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
          color: 'var(--fn-fg)', lineHeight: 1,
        }}>
          PKR <span style={{ fontFamily: 'var(--fn-font-mono)' }}>10,227</span>
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 5,
            background: 'oklch(0.55 0.16 175)', color: '#fff',
            fontSize: 11, fontWeight: 600,
          }}>
            <Icon d={I.card} size={10} /> Paid via PKR Payroll
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{
        marginTop: 14, padding: 16, borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 10 }}>
          Breakdown
        </div>
        <PreviewRow label="6 hours × PKR 1,704.55/hr" />
        <PreviewRow label="At 150% of base hourly rate" sub="(monthly salary ÷ 176 hrs)" />
        <PreviewRow label="Rounded to nearest 15 min" />
        <div style={{ height: 10, borderTop: '1px dashed var(--fn-border)', marginTop: 8 }} />
        <PreviewRow
          label="Rule applied"
          right={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>Engineering — Weekend OT ↗</span>}
        />
      </div>

      {/* When it pays */}
      <div style={{
        marginTop: 14, padding: '12px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon d={I.clock} size={13} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>
            Pays out with May 2026 payroll
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 1 }}>
            Disburses on or around 5 June 2026
          </div>
        </div>
      </div>

      {isPostHoc && (
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 6,
          background: 'var(--fn-warning-soft)',
          border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Icon d={I.clock} size={13} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
            Late claims older than 7 days may require additional approval.
          </span>
        </div>
      )}
    </>
  );
}

function CompOffPreview() {
  return (
    <>
      <div style={{
        padding: 18, borderRadius: 10,
        background: 'linear-gradient(140deg, oklch(0.96 0.04 280) 0%, oklch(0.97 0.03 245) 100%)',
        border: '1px solid color-mix(in oklch, oklch(0.55 0.16 280) 22%, transparent)',
      }}>
        <div style={{ fontSize: 11.5, color: 'oklch(0.40 0.16 280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Comp-off credit
        </div>
        <div style={{
          marginTop: 8, fontSize: 36, fontWeight: 600,
          letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
          color: 'var(--fn-fg)', lineHeight: 1,
        }}>
          <span style={{ fontFamily: 'var(--fn-font-mono)' }}>9</span> <span style={{ fontSize: 22, color: 'var(--fn-fg-faint)', fontWeight: 500 }}>hours</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
          Credited to your <strong style={{ fontWeight: 700, color: 'var(--fn-fg)' }}>Comp-Off</strong> leave balance
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 5,
            background: 'oklch(0.55 0.16 280)', color: '#fff',
            fontSize: 11, fontWeight: 600,
          }}>
            <Icon d={I.clock} size={10} /> Comp-Off Leave
          </span>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: 16, borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 10 }}>
          How this credit works
        </div>
        <PreviewRow label="6 hours worked × 1.5 multiplier" />
        <PreviewRow label="Expires 31 May 2027" sub="12 months from credit date" />
        <PreviewRow label="Take it later via Leave Request" />
      </div>

      <div style={{
        marginTop: 14, padding: '12px 14px', borderRadius: 8,
        background: 'oklch(0.96 0.04 280)',
        border: '1px solid color-mix(in oklch, oklch(0.55 0.16 280) 25%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon d={I.clock} size={14} style={{ color: 'oklch(0.40 0.16 280)' }} />
        <span style={{ fontSize: 12, color: 'oklch(0.35 0.16 280)' }}>
          Current Comp-Off balance: <strong style={{ fontWeight: 700 }}>4 hrs</strong>. After approval: <strong style={{ fontWeight: 700 }}>13 hrs</strong>.
        </span>
      </div>
    </>
  );
}

function NoRulePreview() {
  return (
    <div style={{
      padding: 22, borderRadius: 10,
      background: 'var(--fn-warning-soft)',
      border: '1px solid color-mix(in oklch, var(--fn-warning) 30%, transparent)',
      textAlign: 'center',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, margin: '0 auto 12px',
        background: '#fff', color: 'var(--fn-warning-soft-fg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={18} stroke={2} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-warning-soft-fg)' }}>
        No active rule matches this request
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
        For this OT type, scope, and date — no rule defines a rate. You can still submit, and HR will review manually.
      </div>
    </div>
  );
}

function PreviewRow({ label, sub, right }) {
  return (
    <div style={{
      padding: '6px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--fn-fg)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon d={I.check} size={11} stroke={3} style={{ color: 'var(--fn-success)' }} />
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginLeft: 17, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function ModeCard({ title, sub, icon, active }) {
  return (
    <button style={{
      textAlign: 'left', padding: 12,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: active ? 'var(--fn-accent)' : 'var(--fn-icon-tile)',
        color: active ? 'var(--fn-accent-fg)' : 'var(--fn-icon-tile-fg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d={icon} size={13} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}

function SubmittedSuccess() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon d={I.check} size={28} stroke={2.5} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.015em' }}>
        Request submitted
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fn-fg-muted)', maxWidth: 360, lineHeight: 1.5 }}>
        Talha Mansoor has been notified. You'll get a portal notification when it's approved.
        Estimated <strong style={{ fontWeight: 700, color: 'var(--fn-fg)' }}>PKR 10,227</strong> via PKR Payroll.
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm">Submit another</Button>
        <Button size="sm" iconRight={I.arrowR}>View my requests</Button>
      </div>
    </div>
  );
}

Object.assign(window, { LogOvertimePortal });
