// Brief 17 — Document detail view

function DocDetailView({ variant = 'standard' }) {
  const isReplaced = variant === 'replaced';
  const isExpired = variant === 'expired';
  const isPolicy = variant === 'policy';
  const ownView = variant === 'own_pending';

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <button style={{
          width: 32, height: 32, borderRadius: 7,
          background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-fg-muted)', cursor: 'pointer',
        }}>
          <Icon d={I.chevL} size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginBottom: 4 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Documents</span> ·{' '}
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Bilal Rauf</span> · Detail
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
              color: 'var(--fn-fg)',
              padding: '4px 8px', marginLeft: -8, borderRadius: 6,
              border: '1px solid transparent',
              cursor: 'text',
            }}>
              {isPolicy ? 'Code of conduct · v3.2' : isReplaced ? 'Salary certificate · for rental (v2)' : 'Salary certificate · for HBL home loan'}
            </h1>
            <Icon d={I.edit} size={12} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
            <Badge tone={isExpired ? 'danger' : isReplaced ? 'neutral' : 'success'} dot>
              {isExpired ? 'Expired' : isReplaced ? 'Replaced' : 'Active'}
            </Badge>
          </div>
        </div>
        <Button variant="secondary" icon={I.download}>Download</Button>
        <Button variant="secondary" style={{ paddingInline: 9 }} icon={I.more}>&nbsp;</Button>
      </div>

      {/* Replaced / expired banner */}
      {isReplaced && (
        <div style={{
          marginBottom: 16, padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon d={I.layers} size={14} style={{ color: 'var(--fn-fg-muted)' }} />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
            This document was replaced on <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>05 May 2026</strong> by{' '}
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Salary certificate · May 2026 (v3)</span>. This is the previous version.
          </div>
          <Button size="sm" variant="secondary" iconRight={I.arrowR}>Open current</Button>
        </div>
      )}
      {isExpired && (
        <div style={{
          marginBottom: 16, padding: '12px 14px', borderRadius: 8,
          background: 'var(--fn-danger-soft)',
          border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} stroke={2} style={{ color: 'var(--fn-danger-soft-fg)' }} />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-danger-soft-fg)' }}>
            This document expired on <strong style={{ fontWeight: 700 }}>12 March 2026</strong>. Upload an updated version to maintain compliance.
          </div>
          <Button size="sm" icon={I.upload}>Upload new version</Button>
        </div>
      )}

      {/* Body — 2 column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* LEFT — preview */}
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--fn-divider)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 24, height: 28, borderRadius: 4,
              background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 700,
            }}>PDF</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fn-fg)' }}>
              {isPolicy ? 'code-of-conduct-v3.2.pdf' : 'salary-certificate-bilal-rauf-may-2026.pdf'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>
              · {isPolicy ? '2.1 MB' : '186 KB'}
            </span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 5, padding: 1, alignItems: 'center' }}>
              <span style={{ width: 24, height: 22, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>−</span>
              <span style={{ padding: '0 8px', fontSize: 11, fontWeight: 600, color: 'var(--fn-fg)', fontFamily: 'var(--fn-font-mono)' }}>100%</span>
              <span style={{ width: 24, height: 22, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>+</span>
            </div>
            <ToolbarPill small iconRight={I.arrowR}>Open in new tab</ToolbarPill>
          </div>
          <div style={{ padding: 24, background: 'var(--fn-bg-subtle)', minHeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{
              width: 440, padding: '44px 52px', background: '#fff',
              border: '1px solid oklch(0.92 0.005 250)',
              boxShadow: '0 12px 28px -8px rgba(15, 17, 23, 0.12), 0 4px 8px -2px rgba(15, 17, 23, 0.06)',
              fontFamily: 'var(--fn-font-sans)', color: '#1a1a2e',
              minHeight: 600,
            }}>
              {isPolicy ? (
                <>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Code of Conduct</h1>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#6e6e88' }}>Version 3.2 · effective 01 May 2026</div>
                  <p style={{ marginTop: 20, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    Futurenostics is committed to creating a workplace where everyone is treated with respect and dignity. This Code of Conduct sets out the standards we expect from each member of the team.
                  </p>
                  <h2 style={{ marginTop: 20, fontSize: 14, fontWeight: 700 }}>1. Professional behavior</h2>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    Treat colleagues, clients, and partners with respect. Communicate clearly and honestly. Avoid behaviour that could be perceived as discriminatory or harassing in any form.
                  </p>
                  <h2 style={{ marginTop: 18, fontSize: 14, fontWeight: 700 }}>2. Confidentiality</h2>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    Protect client and company information. Do not share access credentials. Sign NDAs as required for project work.
                  </p>
                </>
              ) : (
                <>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Salary Certificate</h1>
                  <div style={{ marginTop: 12, fontSize: 11, color: '#3a3a55' }}>
                    <strong>Reference:</strong> SC-2026-0142 · <strong>Issued:</strong> 12 May 2026
                  </div>
                  <p style={{ marginTop: 18, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    To whom it may concern,
                  </p>
                  <p style={{ marginTop: 12, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    This is to certify that <strong>Bilal Rauf</strong> (EMP-0042) is employed with Futurenostics Private Limited as a <strong>Senior Software Engineer</strong> in our Engineering department since 12 August 2023.
                  </p>
                  <p style={{ marginTop: 12, fontSize: 12, color: '#1a1a2e', lineHeight: 1.7 }}>
                    Their current gross monthly salary is <strong>PKR 285,000</strong>. This letter is valid for 6 months.
                  </p>
                  <hr style={{ marginTop: 24, border: 'none', borderTop: '1px solid #e5e5e8' }} />
                  <p style={{ marginTop: 18, fontSize: 12, color: '#1a1a2e', lineHeight: 1.6 }}>
                    Asma Ali<br />Head of People<br />Futurenostics Private Limited
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT — metadata cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Acknowledge CTA — for own_pending */}
          {ownView && (
            <Card padded={false} style={{
              border: '1px solid color-mix(in oklch, var(--fn-accent) 35%, transparent)',
              background: 'var(--fn-accent-soft)',
            }}>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d={I.check} size={15} stroke={2.5} />
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-accent-soft-fg)' }}>Acknowledgment required</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', opacity: 0.85 }}>Deadline: 22 May 2026 · 7 days</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', marginBottom: 14, lineHeight: 1.55 }}>
                  By acknowledging, you confirm you've read and understood the Code of Conduct v3.2.
                </div>
                <Button full size="md" icon={I.check}>I acknowledge</Button>
              </div>
            </Card>
          )}

          {/* About */}
          <Card padded={false}>
            <SectionHeader icon={I.doc} title="About" padding="14px 18px 12px" />
            <div style={{ padding: '0 18px 16px' }}>
              <MetaRow label="Category" value={
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: isPolicy ? 'oklch(0.94 0.04 280)' : 'oklch(0.94 0.04 175)',
                  color: isPolicy ? 'oklch(0.40 0.13 280)' : 'oklch(0.40 0.13 175)',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: isPolicy ? 'oklch(0.55 0.16 280)' : 'oklch(0.55 0.16 175)' }} />
                  {isPolicy ? 'Policy document' : 'Salary certificate'}
                </span>
              } />
              <MetaRow label="Source" value={<Badge tone="info">Generated</Badge>} />
              {!isPolicy && <MetaRow label="Template" value={<span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 500, cursor: 'pointer' }}>Salary cert · for bank · v3</span>} />}
              <MetaRow label="Issued" value="12 May 2026" mono />
              <MetaRow label={isExpired ? 'Expired' : 'Expiry'} value={
                isExpired
                  ? <span style={{ color: 'var(--fn-danger-soft-fg)', fontWeight: 600 }}>12 Mar 2026</span>
                  : <span style={{ color: 'var(--fn-fg-faint)' }}>Indefinite</span>
              } mono />
              <MetaRow label="Generated by" value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: 'oklch(0.92 0.07 22)', color: 'oklch(0.38 0.16 22)', fontSize: 8.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>AA</span>
                  Asma Ali · 12 May 2026
                </span>
              } />
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--fn-border)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 6 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(isPolicy ? ['policy', 'mandatory', 'q2-2026'] : ['bank', 'loan']).map(t => (
                    <span key={t} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                      background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
                    }}>#{t}</span>
                  ))}
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99, cursor: 'pointer',
                    color: 'var(--fn-accent-soft-fg)', fontWeight: 600,
                  }}>+ Add tag</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Owner */}
          <Card padded={false}>
            <SectionHeader icon={I.user} title="Owner" padding="14px 18px 12px" />
            <div style={{ padding: '0 18px 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                }}>BR</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)', cursor: 'pointer' }}>Bilal Rauf</div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Sr. Engineer · EMP-0042 · Engineering</div>
                </div>
                <Icon d={I.arrowR} size={12} style={{ color: 'var(--fn-fg-faint)' }} />
              </div>
              <MetaRow label="Visibility" value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  HR + Employee
                  <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" size={11} style={{ color: 'var(--fn-fg-faint)', cursor: 'help' }} />
                </span>
              } />
            </div>
          </Card>

          {/* Acknowledgment — only for policy */}
          {isPolicy && (
            <Card padded={false}>
              <SectionHeader icon={I.check} title="Acknowledgment" padding="14px 18px 12px" right={<Badge tone="warning">7 pending</Badge>} />
              <div style={{ padding: '0 18px 16px' }}>
                <MetaRow label="Required" value="Yes" />
                <MetaRow label="Deadline" value="22 May 2026 (7 days)" mono />
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--fn-border)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginBottom: 8 }}>
                    Acknowledged (77 of 84)
                  </div>
                  <div style={{ display: 'flex', gap: -4, marginBottom: 8 }}>
                    {[280, 175, 22, 145, 245, 65, 200].map((h, i) => (
                      <span key={i} style={{
                        width: 22, height: 22, borderRadius: 99,
                        background: `oklch(0.92 0.07 ${h})`, color: `oklch(0.38 0.16 ${h})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, border: '2px solid var(--fn-bg-panel)',
                        marginLeft: i === 0 ? 0 : -6,
                      }}>{['BR', 'SL', 'HT', 'MK', 'TM', 'OS', 'FI'][i]}</span>
                    ))}
                    <span style={{
                      width: 22, height: 22, borderRadius: 99,
                      background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, border: '2px solid var(--fn-bg-panel)', marginLeft: -6,
                    }}>+70</span>
                  </div>
                  <Button full size="sm" variant="secondary" icon={I.send}>Send reminder to 7 pending</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Signature */}
          {!isPolicy && (
            <Card padded={false}>
              <SectionHeader icon={I.shield} title="Signature" padding="14px 18px 12px" />
              <div style={{ padding: '0 18px 16px' }}>
                <div style={{
                  padding: '8px 10px', borderRadius: 6,
                  background: 'var(--fn-success-soft)',
                  border: '1px solid color-mix(in oklch, var(--fn-success) 25%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 99,
                    background: 'var(--fn-success)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d={I.check} size={11} stroke={3} />
                  </span>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--fn-success-soft-fg)' }}>
                    <strong style={{ fontWeight: 700 }}>Signed</strong> · 14 May 2026 by Asma Ali
                  </div>
                </div>
                <MetaRow label="Provider" value="Manual signature" />
                <MetaRow label="Signed copy" value={<span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 500, cursor: 'pointer' }}>salary-cert-signed.pdf ↗</span>} />
              </div>
            </Card>
          )}

          {/* Access log */}
          <Card padded={false}>
            <SectionHeader icon={I.eye} title="Access log" padding="14px 18px 12px" right={<span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Full log →</span>} />
            <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { who: 'Bilal Rauf', action: 'viewed', when: '2 hours ago', hue: 280, ip: '192.168.1.42' },
                { who: 'Asma Ali', action: 'downloaded', when: '1 day ago', hue: 22 },
                { who: 'HBL Bank Officer', action: 'viewed via share link', when: '3 days ago', hue: 145 },
                { who: 'Asma Ali', action: 'generated', when: '5 days ago', hue: 22 },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? '1px dashed var(--fn-border)' : 'none' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                    background: `oklch(0.92 0.07 ${a.hue})`, color: `oklch(0.38 0.16 ${a.hue})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8.5, fontWeight: 700,
                  }}>{a.who.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--fn-fg)' }}>
                      <strong style={{ fontWeight: 600 }}>{a.who}</strong> <span style={{ color: 'var(--fn-fg-muted)' }}>{a.action}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{a.when}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0', gap: 10,
    }}>
      <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)' }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 500, color: 'var(--fn-fg)',
        fontFamily: mono ? 'var(--fn-font-mono)' : 'inherit',
        textAlign: 'right',
      }}>{value}</span>
    </div>
  );
}

Object.assign(window, { DocDetailView });
