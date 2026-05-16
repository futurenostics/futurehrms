// Brief 19 — Required reading / Acknowledgment center (employee portal)

const PENDING_ACKS = [
  {
    id: 'a1', title: 'Code of Conduct · v3.2', cat: 'Policy', catHue: 280,
    issued: '01 May 2026', deadline: '22 May 2026', daysLeft: 7, overdue: false,
    preview: "Futurenostics is committed to creating a workplace where everyone is treated with respect and dignity. This Code of Conduct sets out the standards we expect from each member of the team. We require every employee to read and acknowledge this document annually…",
    progress: 0,
  },
  {
    id: 'a2', title: 'Acceptable Use Policy', cat: 'Policy', catHue: 280,
    issued: '28 Apr 2026', deadline: '12 May 2026', daysLeft: -3, overdue: true,
    preview: "Outlines the acceptable use of company devices, networks, and accounts. Covers VPN access, BYOD, password requirements, and reporting of security incidents…",
    progress: 0,
  },
  {
    id: 'a3', title: 'Updated NDA · Q2 2026', cat: 'Contract', catHue: 245,
    issued: '06 May 2026', deadline: '06 Jun 2026', daysLeft: 22, overdue: false,
    preview: "Confidentiality agreement covering client information, source code, and roadmap details. This updates the version you signed on 12 Aug 2023…",
    progress: 40, started: '5 min ago',
    replacesOld: 'You previously acknowledged on 12 Aug 2023 · please review the changes and re-acknowledge',
  },
];

function RequiredReading({ state = 'list', empty = false, modalState = 'mid' }) {
  if (empty) return <RequiredReadingEmpty />;
  if (state === 'reading') return <ReadingModal modalState={modalState} />;
  if (state === 'acknowledged') return <RequiredReadingAcknowledged />;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
          My space
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Required reading
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
          Documents you need to read and acknowledge. They unlock once you scroll to the bottom.
        </p>
      </div>

      {/* Overdue banner */}
      <div style={{
        marginBottom: 14, padding: '12px 14px', borderRadius: 8,
        background: 'var(--fn-warning-soft)',
        border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)' }} />
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-warning-soft-fg)' }}>
          <strong style={{ fontWeight: 700 }}>1 document is overdue.</strong> Please acknowledge as soon as possible.
        </div>
      </div>

      {/* Count strip */}
      <div style={{
        marginBottom: 14, fontSize: 12.5, color: 'var(--fn-fg-muted)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>{PENDING_ACKS.length} documents pending acknowledgment</strong>
        <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
        <span style={{ color: 'var(--fn-danger-soft-fg)', fontWeight: 600 }}>1 overdue</span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PENDING_ACKS.map(a => (
          <Card key={a.id} padded={false} style={{
            border: a.overdue ? '1px solid color-mix(in oklch, var(--fn-warning) 25%, var(--fn-border))' : '1px solid var(--fn-border)',
          }}>
            <div style={{ padding: '18px 22px', display: 'flex', gap: 16 }}>
              {/* Icon */}
              <span style={{
                width: 44, height: 52, borderRadius: 6, flexShrink: 0,
                background: `oklch(0.94 0.04 ${a.catHue})`,
                color: `oklch(0.40 0.13 ${a.catHue})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${a.catHue}) 25%, transparent)`,
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
              }}>PDF</span>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.015em', cursor: 'pointer' }}>{a.title}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: `oklch(0.94 0.04 ${a.catHue})`,
                    color: `oklch(0.40 0.13 ${a.catHue})`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: `oklch(0.55 0.16 ${a.catHue})` }} />
                    {a.cat}
                  </span>
                  {a.overdue ? (
                    <Badge tone="danger" dot>OVERDUE · {Math.abs(a.daysLeft)} days late</Badge>
                  ) : a.daysLeft < 10 ? (
                    <Badge tone="warning" dot>Due in {a.daysLeft} days</Badge>
                  ) : (
                    <Badge tone="neutral">Due in {a.daysLeft} days</Badge>
                  )}
                  {a.replacesOld && <Badge tone="info">Updated version</Badge>}
                </div>

                <div style={{
                  marginTop: 6, fontSize: 11.5, color: 'var(--fn-fg-faint)',
                  display: 'inline-flex', gap: 12,
                }}>
                  <span><Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Issued {a.issued}</span>
                  <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
                  <span><Icon d={I.clock} size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Deadline {a.deadline}</span>
                </div>

                {a.replacesOld && (
                  <div style={{
                    marginTop: 10, padding: '8px 12px', borderRadius: 6,
                    background: 'var(--fn-info-soft)',
                    border: '1px solid color-mix(in oklch, var(--fn-info) 20%, transparent)',
                    fontSize: 12, color: 'var(--fn-info-soft-fg)', lineHeight: 1.55,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Icon d={I.layers} size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{a.replacesOld}</span>
                  </div>
                )}

                <div style={{
                  marginTop: 12, fontSize: 12.5, color: 'var(--fn-fg-muted)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {a.preview}
                </div>

                {a.progress > 0 && (
                  <div style={{
                    marginTop: 12, padding: '8px 12px', borderRadius: 6,
                    background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Icon d={I.eye} size={12} style={{ color: 'var(--fn-fg-muted)' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', flex: 1 }}>
                      Started reading {a.started} · <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>{a.progress}%</strong> through
                    </span>
                    <div style={{ width: 80, height: 4, background: 'var(--fn-bg-inset)', borderRadius: 99 }}>
                      <div style={{ width: `${a.progress}%`, height: '100%', background: 'var(--fn-accent)', borderRadius: 99 }} />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <Button size="md" icon={I.eye}>{a.progress > 0 ? 'Resume reading' : 'Read & acknowledge'}</Button>
                  <Button variant="secondary" size="md" iconRight={I.arrowR}>Open in full view</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{
        marginTop: 16, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11.5, color: 'var(--fn-fg-muted)',
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
        Acknowledgment is permanent — once acknowledged, can't be reversed. If a document is updated, you'll need to acknowledge the new version.
      </div>
    </>
  );
}

function ReadingModal({ modalState = 'mid' }) {
  const progress = modalState === 'mid' ? 40 : 100;
  const canAck = modalState === 'bottom';

  return (
    <>
      <div style={{ padding: 28, opacity: 0.4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Required reading</h1>
        <div style={{ marginTop: 24, height: 200, background: 'var(--fn-bg-subtle)', borderRadius: 8 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.55)', zIndex: 50 }} />

      <div style={{
        position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
        bottom: 24, width: 820, zIndex: 51,
        background: 'var(--fn-bg-panel)', borderRadius: 12,
        boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4), 0 12px 24px -8px rgba(15, 17, 23, 0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.shield} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)' }}>Code of Conduct · v3.2</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
              Read fully — Acknowledge button unlocks at the bottom · 7 days remaining
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        {/* PDF body */}
        <div style={{
          flex: 1, overflow: 'auto', padding: 32, background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        }}>
          <div style={{
            width: 600, padding: '48px 56px', background: '#fff',
            border: '1px solid oklch(0.92 0.005 250)',
            boxShadow: '0 12px 28px -8px rgba(15, 17, 23, 0.12)',
            fontFamily: 'var(--fn-font-sans)', color: '#1a1a2e',
          }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Code of Conduct</h1>
            <div style={{ marginTop: 4, fontSize: 11, color: '#6e6e88' }}>Version 3.2 · effective 01 May 2026</div>
            <p style={{ marginTop: 22, fontSize: 12.5, color: '#1a1a2e', lineHeight: 1.7 }}>
              Futurenostics is committed to creating a workplace where everyone is treated with respect and dignity. This Code of Conduct sets out the standards we expect from each member of the team.
            </p>
            <h2 style={{ marginTop: 22, fontSize: 15, fontWeight: 700 }}>1. Professional behavior</h2>
            <p style={{ marginTop: 8, fontSize: 12.5, color: '#1a1a2e', lineHeight: 1.7 }}>
              Treat colleagues, clients, and partners with respect. Communicate clearly and honestly. Avoid behaviour that could be perceived as discriminatory or harassing in any form.
            </p>
            <h2 style={{ marginTop: 18, fontSize: 15, fontWeight: 700 }}>2. Confidentiality</h2>
            <p style={{ marginTop: 8, fontSize: 12.5, color: '#1a1a2e', lineHeight: 1.7 }}>
              Protect client and company information. Do not share access credentials. Sign NDAs as required for project work.
            </p>
            {canAck && (
              <>
                <h2 style={{ marginTop: 18, fontSize: 15, fontWeight: 700 }}>3. Conflicts of interest</h2>
                <p style={{ marginTop: 8, fontSize: 12.5, color: '#1a1a2e', lineHeight: 1.7 }}>
                  Disclose any external work or relationships that could conflict with your role. Speak to HR before accepting outside engagements.
                </p>
                <p style={{ marginTop: 22, fontSize: 11, color: '#6e6e88', fontStyle: 'italic' }}>End of document.</p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-panel)',
          display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0,
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--fn-fg-muted)', fontWeight: 600 }}>
                  {canAck ? 'Read to the end · button unlocked' : 'Scroll to the end to unlock'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: canAck ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{progress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--fn-bg-inset)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', width: `${progress}%`, borderRadius: 99,
                  background: canAck ? 'var(--fn-success)' : 'var(--fn-accent)',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          </div>

          {canAck && (
            <SheetField label="Add a note (optional)">
              <textarea
                rows={2}
                placeholder="Any thoughts or questions for HR…"
                style={{
                  width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 12.5,
                  fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                  background: 'var(--fn-bg-panel)',
                  border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                }}
              />
            </SheetField>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon d={I.shield} size={11} />
              Acknowledgment is permanent and audit-logged
            </span>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="sm">Close</Button>
            <Button
              size="md"
              icon={canAck ? I.check : I.lock}
              style={!canAck ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {canAck ? 'I acknowledge' : 'Read to unlock'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function RequiredReadingAcknowledged() {
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
          My space
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Required reading
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
          Documents you need to read and acknowledge.
        </p>
      </div>

      <Card padded={false} style={{
        marginBottom: 16,
        border: '1px solid color-mix(in oklch, var(--fn-success) 30%, transparent)',
        background: 'var(--fn-success-soft)',
      }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 99,
            background: 'var(--fn-success)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={I.check} size={16} stroke={2.5} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-success-soft-fg)' }}>Code of Conduct · acknowledged just now</div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-success-soft-fg)', opacity: 0.85 }}>15 May 2026, 14:42 PKT · receipt sent to your inbox</div>
          </div>
          <Button size="sm" variant="secondary" iconRight={I.arrowR}>View receipt</Button>
        </div>
      </Card>

      <Card padded={false}>
        <SectionHeader icon={I.check} title="You're all caught up" badge={<Badge tone="success" dot>0 pending</Badge>} padding="14px 18px 14px" />
        <div style={{ padding: '40px 24px 56px' }}>
          <EmptyState
            illustration={
              <div style={{
                width: 56, height: 56, borderRadius: 14, marginBottom: 14,
                background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.check} size={26} stroke={2.5} />
              </div>
            }
            title="Nothing left to read"
            body="When HR publishes a new policy or contract that needs your acknowledgment, it'll show up here."
            secondary={{ label: 'See past acknowledgments', icon: I.clock }}
          />
        </div>
      </Card>
    </>
  );
}

function RequiredReadingEmpty() {
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
          My space
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Required reading
        </h1>
      </div>
      <Card padded={false}>
        <div style={{ padding: '60px 28px' }}>
          <EmptyState
            illustration={
              <div style={{
                width: 56, height: 56, borderRadius: 14, marginBottom: 14,
                background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.check} size={26} stroke={2.5} />
              </div>
            }
            title="You're all caught up"
            body="When HR publishes a new policy or contract that needs your acknowledgment, it'll show up here."
            secondary={{ label: 'See past acknowledgments', icon: I.clock }}
          />
        </div>
      </Card>
    </>
  );
}

Object.assign(window, { RequiredReading });
