// Brief 10 — Life Events (employee portal)

const LIFE_EVENTS = [
  {
    id: 'le-1', kind: 'wedding', title: 'Marriage',
    icon: 'M16.5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16.5 18a3 3 0 0 1 0-6M7.5 18a3 3 0 0 1 0-6M9 15h6',
    hue: 320, date: '15 Jun 2026', verified: '12 May 2026',
    status: 'Verified', tone: 'success',
    attachment: 'marriage-certificate.pdf', size: '1.2 MB',
    linked: { name: 'Marriage Leave', dates: '15 Jun – 20 Jun 2026', oneTime: true },
  },
  {
    id: 'le-2', kind: 'child_birth', title: 'Birth of child',
    icon: I.cake,
    hue: 175, date: '02 Aug 2026',
    relation: 'My second child', status: 'Pending verification', tone: 'warning',
    attachment: 'birth-cert-pending.jpg', size: '420 KB',
    sub: 'Submitted 14 May 2026 · awaiting HR',
  },
  {
    id: 'le-3', kind: 'family_death', title: 'Bereavement',
    icon: I.flag,
    hue: 200, date: '03 Apr 2026',
    relation: 'Parent', status: 'Verified', tone: 'success',
    verified: '04 Apr 2026',
    sensitive: true,
    linked: { name: 'Bereavement Leave', dates: '03 Apr – 05 Apr 2026' },
  },
];

function LifeEventsPortal({ emptyState = false, registerOpen = false, rejected = false, sensitiveOpen = false }) {
  const events = rejected
    ? [{
        id: 'le-r', kind: 'wedding', title: 'Marriage',
        icon: 'M16.5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        hue: 320, date: '12 Mar 2026',
        status: 'Rejected', tone: 'danger',
        rejectionReason: 'Marriage certificate is illegible — please upload a clearer scan.',
        rejectedBy: 'Asma Ali', rejectedAt: '13 Mar 2026',
      }]
    : LIFE_EVENTS;

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--fn-fg-faint)', fontWeight: 600, marginBottom: 8 }}>
          My space · My profile
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
              Life events
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 580, lineHeight: 1.55 }}>
              Register significant life events to unlock related leave types. Event details are visible only to you and HR — your manager only sees the approved leave dates.
            </p>
          </div>
          <Button icon={I.plus}>Register event</Button>
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{
        marginBottom: 18, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-icon-tile)', border: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-muted)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--fn-border)',
        }}>
          <Icon d={I.shield} size={13} />
        </span>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--fn-fg-muted)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Privacy:</strong> Only HR Admin and you can see these details. Attachments are stored encrypted with restricted access.
        </div>
      </div>

      {emptyState ? (
        <Card padded={false}>
          <div style={{ padding: '60px 28px' }}>
            <EmptyState
              icon={I.flag}
              title="No life events registered yet"
              body="You'll need to register events like marriage or birth before applying for related leaves. Once verified, the matching leave type unlocks."
              primary={{ label: 'Register your first event', icon: I.plus }}
              secondary={{ label: 'Which leaves need events?', icon: I.eye }}
            />
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(e => <LifeEventCard key={e.id} event={e} />)}
        </div>
      )}

      {registerOpen && <RegisterEventModal sensitive={sensitiveOpen} />}
    </>
  );
}

function LifeEventCard({ event }) {
  return (
    <Card padded={false}>
      <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Icon */}
        <span style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: `oklch(0.92 0.07 ${event.hue})`,
          color: `oklch(0.38 0.16 ${event.hue})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={event.icon} size={20} stroke={1.8} />
        </span>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)', letterSpacing: '-0.015em' }}>
              {event.title}
            </span>
            <Badge tone={event.tone} dot>{event.status}</Badge>
            {event.linked?.oneTime && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '1px 7px', borderRadius: 4,
                background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
                fontSize: 10.5, fontWeight: 600,
              }}>
                <Icon d={I.lock} size={9} /> Used · one-time-lifetime
              </span>
            )}
            {event.sensitive && (
              <span style={{
                fontSize: 10.5, padding: '1px 7px', borderRadius: 4,
                background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <Icon d={I.shield} size={9} /> HR + you only
              </span>
            )}
          </div>

          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={12} style={{ color: 'var(--fn-fg-faint)' }} />
              <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>{event.date}</span>
            </span>
            {event.relation && (
              <>
                <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
                <span>Relation: <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>{event.relation}</strong></span>
              </>
            )}
            {event.verified && (
              <>
                <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
                <span>Verified <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>{event.verified}</span></span>
              </>
            )}
            {event.sub && (
              <>
                <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
                <span style={{ fontStyle: 'italic' }}>{event.sub}</span>
              </>
            )}
          </div>

          {/* Attachment */}
          {event.attachment && (
            <div style={{
              marginTop: 12, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 9,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 6,
            }}>
              <span style={{
                width: 24, height: 28, borderRadius: 4, flexShrink: 0,
                background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-muted)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--fn-border-strong)',
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em',
              }}>
                {event.attachment.split('.').pop().toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fn-fg)' }}>{event.attachment}</div>
                <div style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{event.size} · encrypted</div>
              </div>
              <Icon d={I.download} size={12} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer', marginLeft: 6 }} />
            </div>
          )}

          {/* Rejection */}
          {event.rejectionReason && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-danger-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={13} stroke={2} style={{ color: 'var(--fn-danger-soft-fg)', marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-danger-soft-fg)' }}>
                  Rejected by {event.rejectedBy} · {event.rejectedAt}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fn-danger-soft-fg)', marginTop: 3, lineHeight: 1.5 }}>
                  {event.rejectionReason}
                </div>
              </div>
              <Button size="sm" variant="secondary" icon={I.edit}>Resubmit</Button>
            </div>
          )}

          {/* Linked leave */}
          {event.linked && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--fn-accent-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-accent) 22%, transparent)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 5,
                background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon d={I.check} size={11} stroke={2.5} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)' }}>
                  Used for <strong style={{ fontWeight: 700 }}>{event.linked.name}</strong> · {event.linked.dates}
                </div>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>View leave →</span>
            </div>
          )}
        </div>

        <Icon d={I.more} size={16} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer', flexShrink: 0 }} />
      </div>
    </Card>
  );
}

function RegisterEventModal({ sensitive }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.45)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 540, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.flag} size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Register life event</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                HR will verify within 2 business days · only visible to HR + you
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sensitive && (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--fn-icon-tile)',
              border: '1px solid var(--fn-border)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Icon d={I.shield} size={14} style={{ color: 'var(--fn-fg-muted)', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', lineHeight: 1.55 }}>
                We're sorry for your loss. This information is visible only to HR and is used solely to process bereavement leave. Take your time.
              </span>
            </div>
          )}

          <SheetField label="Event kind">
            <DropdownChip value={sensitive ? 'Family bereavement' : 'Child birth'} icon={sensitive ? I.flag : I.cake} hue={sensitive ? 200 : 175} />
          </SheetField>

          <SheetField label="Event date">
            <Input
              defaultValue={sensitive ? '03 Apr 2026' : '02 Aug 2026'}
              icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
              style={{ height: 40 }}
            />
          </SheetField>

          {sensitive && (
            <SheetField label="Relation to you">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {['Spouse', 'Parent', 'Sibling', 'Child', 'In-law', 'Other'].map((r, i) => (
                  <button key={r} style={{
                    padding: '8px 10px', fontSize: 12, fontWeight: 500,
                    background: i === 1 ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
                    color: i === 1 ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
                    border: '1px solid ' + (i === 1 ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: i === 1 ? 600 : 500,
                  }}>{r}</button>
                ))}
              </div>
            </SheetField>
          )}

          <SheetField
            label="Supporting document"
            hint="Stored encrypted with restricted access. Required to unlock matching leave types."
          >
            <div style={{
              padding: '14px 16px', borderRadius: 6,
              background: 'var(--fn-bg-subtle)',
              border: '1px dashed var(--fn-border-strong)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-muted)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--fn-border-strong)',
              }}>
                <Icon d={I.upload} size={13} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>
                  Drop {sensitive ? 'death certificate or relation proof' : 'birth certificate or hospital slip'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 1 }}>PNG, JPG, PDF · up to 10 MB · encrypted at rest</div>
              </div>
            </div>
          </SheetField>

          <SheetField label="Note (optional)">
            <textarea
              rows={2}
              placeholder="Anything HR should know…"
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </SheetField>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon d={I.shield} size={11} /> HR + you only
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm" icon={I.send}>Submit for verification</Button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { LifeEventsPortal });
