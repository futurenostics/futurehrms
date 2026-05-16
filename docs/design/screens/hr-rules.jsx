// HR Reminder Rules + Scheduler view
function HRRules() {
  const rules = [
    { event: 'Probation end', dept: 'Engineering', lead: 14, recipients: 'HR · Direct manager', emailTpl: 'probation-end-eng', active: true, color: 'oklch(0.70 0.14 65)', triggers: 7 },
    { event: 'Probation end', dept: 'Business Dev', lead: 14, recipients: 'HR · BD Manager', emailTpl: 'probation-end-bd', active: true, color: 'oklch(0.70 0.14 65)', triggers: 3 },
    { event: 'Internship end', dept: 'All', lead: 14, recipients: 'HR · Direct manager', emailTpl: 'internship-end', active: true, color: 'oklch(0.62 0.11 200)', triggers: 2 },
    { event: 'Annual review', dept: 'All', lead: 21, recipients: 'HR · Manager · Employee', emailTpl: 'annual-review-notice', active: true, color: 'oklch(0.60 0.12 280)', triggers: 4 },
    { event: 'Biannual review', dept: 'Engineering', lead: 14, recipients: 'HR · Direct manager', emailTpl: 'biannual-review', active: true, color: 'oklch(0.60 0.12 280)', triggers: 0, conditional: 'Only if biannualReviewEnabled = true' },
    { event: 'Birthday', dept: 'All', lead: 0, recipients: 'HR · #general', emailTpl: 'birthday-email', active: true, color: 'oklch(0.62 0.11 145)', triggers: 6 },
    { event: 'Work anniversary', dept: 'All', lead: 0, recipients: 'HR · Direct manager', emailTpl: 'anniversary', active: true, color: 'oklch(0.62 0.11 145)', triggers: 5 },
    { event: 'Custom — visa renewal', dept: 'Engineering', lead: 60, recipients: 'HR · Employee', emailTpl: 'visa-renewal', active: false, color: 'oklch(0.70 0.14 65)', triggers: 0 },
  ];

  // Mini timeline showing next 30 days
  const today = 15;
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = i + 1;
    const events = [];
    if (date === 16) events.push({ t: 'Birthday', c: 'oklch(0.62 0.11 145)' });
    if (date === 18) events.push({ t: 'Probation end', c: 'oklch(0.70 0.14 65)' });
    if (date === 21) events.push({ t: 'Annual review', c: 'oklch(0.60 0.12 280)' });
    if (date === 24) events.push({ t: 'Internship end', c: 'oklch(0.62 0.11 200)' });
    if (date === 26) events.push({ t: 'Anniversary', c: 'oklch(0.62 0.11 145)' });
    if (date === 27) events.push({ t: 'Probation end', c: 'oklch(0.70 0.14 65)' });
    if (date === 30) events.push({ t: 'Birthday', c: 'oklch(0.62 0.11 145)' });
    return { date, events, isToday: date === today };
  });

  return (
    <>
      <PageHeader
        title="Reminder rules"
        subtitle="Per-department lifecycle reminders. Scheduler runs daily at 06:00 Asia/Karachi and dispatches emails through React Email templates."
        actions={<>
          <Button variant="secondary" icon={I.layers}>Duplicate from…</Button>
          <Button icon={I.plus}>New rule</Button>
        </>}
      />

      {/* Scheduler status bar */}
      <Card padded={false} style={{ marginBottom: 20, background: 'var(--fn-fg)', borderColor: 'var(--fn-fg)', color: 'var(--fn-fg-invert)' }}>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 6, background: 'var(--fn-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={I.clock} size={18} style={{ color: 'var(--fn-accent-fg)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Reminder scheduler</div>
            <div style={{ marginTop: 2, fontSize: 16, fontWeight: 500 }}>
              Next run: <span style={{ fontFamily: 'var(--fn-font-mono)' }}>Saturday 16 May · 06:00 PKT</span> · in 16h 22m
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            {[
              { l: 'Last dispatched', v: 'today · 06:00' },
              { l: 'Emails sent (7d)', v: '47' },
              { l: 'Retries pending', v: '0' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 10.5, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.l}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--fn-font-mono)', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              </div>
            ))}
          </div>
          <Button variant="dark" style={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.18)', color: 'inherit' }} icon={I.send}>Dry run</Button>
        </div>
      </Card>

      {/* 30-day calendar strip */}
      <Card padded={false} style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Next 30 days · scheduled triggers</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>14 events queued · May 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--fn-fg-muted)', alignItems: 'center' }}>
            {[
              { c: 'oklch(0.70 0.14 65)', l: 'Probation' },
              { c: 'oklch(0.62 0.11 200)', l: 'Internship' },
              { c: 'oklch(0.60 0.12 280)', l: 'Review' },
              { c: 'oklch(0.62 0.11 145)', l: 'Anniversary / Birthday' },
            ].map(g => <span key={g.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dot color={g.c} /> {g.l}</span>)}
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 3 }}>
            {days.map(d => (
              <div key={d.date} style={{
                aspectRatio: '1 / 1.4', borderRadius: 6, position: 'relative',
                border: d.isToday ? '1.5px solid var(--fn-accent)' : '1px solid var(--fn-divider)',
                background: d.isToday ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
                padding: '4px 4px 0', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 9.5, color: d.isToday ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', fontWeight: d.isToday ? 700 : 400 }}>
                  {d.date.toString().padStart(2, '0')}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                  {d.events.map((e, i) => (
                    <div key={i} style={{ height: 4, borderRadius: 99, background: e.c }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Rule library</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button size="sm" variant="ghost">All ({rules.length})</Button>
            <Button size="sm" variant="soft">Active ({rules.filter(r => r.active).length})</Button>
            <Button size="sm" variant="ghost">By dept ▾</Button>
          </div>
        </div>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Event' },
            { label: 'Dept', width: 130 },
            { label: 'Lead time', width: 110 },
            { label: 'Recipients', width: 200 },
            { label: 'Email template', width: 180 },
            { label: 'Triggers (30d)', align: 'right', width: 120 },
            { label: 'State', width: 130 },
          ]}
        >
          <tbody>
            {rules.map((r, i) => (
              <InsetRow key={i} bordered={i < rules.length - 1}>
                <InsetCell first>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: `${r.color}22`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color }} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.event}</div>
                      {r.conditional && <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>{r.conditional}</div>}
                    </div>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)' }}>{r.dept}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {r.lead === 0 ? 'on day' : `${r.lead}d before`}
                  </span>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)', fontSize: 12 }}>{r.recipients}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, color: 'var(--fn-fg-muted)', padding: '2px 6px', background: 'var(--fn-bg-inset)', borderRadius: 4 }}>
                    {r.emailTpl}.tsx
                  </span>
                </InsetCell>
                <InsetCell align="right">
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{r.triggers}</span>
                </InsetCell>
                <InsetCell last>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 4px 2px 10px',
                    background: r.active ? 'var(--fn-success-soft)' : 'var(--fn-bg-inset)',
                    color: r.active ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg-muted)',
                    borderRadius: 99, fontSize: 11.5, fontWeight: 500,
                  }}>
                    {r.active ? 'On' : 'Off'}
                    <span style={{
                      width: 26, height: 14, background: r.active ? 'var(--fn-success)' : 'var(--fn-fg-faint)',
                      borderRadius: 99, position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute', top: 1, left: r.active ? 13 : 1, width: 12, height: 12,
                        background: '#fff', borderRadius: 99, transition: 'left 0.2s',
                      }} />
                    </span>
                  </span>
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

// Evaluations — template list + an open evaluation form (manager view via magic link)
function Evaluations() {
  return (
    <>
      <PageHeader
        title="Performance evaluations"
        subtitle="4 in flight · 1 due in 3 days. Managers receive a magic-link to fill the form — no login needed."
        actions={<>
          <Button variant="secondary" icon={I.doc}>Templates</Button>
          <Button icon={I.send}>Send evaluation</Button>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
        {/* Left — instances list */}
        <Card padded={false}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Active evaluations</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="sm" variant="soft">In flight (4)</Button>
              <Button size="sm" variant="ghost">Submitted (28)</Button>
            </div>
          </div>
          {[
            { name: 'Hassan Tariq', tpl: 'End-of-probation · Eng', rev: 'Bilal Rauf', sent: '12 May', due: '18 May', state: 'Awaiting', progress: 0, active: true },
            { name: 'Zoya Pervez', tpl: 'Internship close-out', rev: 'Asma Ali', sent: '11 May', due: '24 May', state: 'In progress', progress: 60 },
            { name: 'Bilal Rauf', tpl: 'Annual review · Eng', rev: 'Talha Mansoor', sent: '10 May', due: '21 May', state: 'Awaiting', progress: 0 },
            { name: 'Ayesha Imran', tpl: 'End-of-probation · HR', rev: 'Asma Ali', sent: '08 May', due: '27 May', state: 'In progress', progress: 35 },
          ].map((e, i) => (
            <div key={i} style={{
              padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--fn-divider)' : 'none',
              background: e.active ? 'var(--fn-accent-soft)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={e.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: e.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{e.name}</div>
                  <div style={{ fontSize: 11.5, color: e.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)', opacity: e.active ? 0.85 : 1 }}>{e.tpl}</div>
                </div>
                <Badge tone={e.state === 'In progress' ? 'info' : 'warning'} dot>{e.state}</Badge>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
                <span>Reviewer: <span style={{ color: 'var(--fn-fg)', fontWeight: 500 }}>{e.rev}</span></span>
                <span>Sent {e.sent}</span>
                <span style={{ color: 'var(--fn-danger-soft-fg)' }}>Due {e.due}</span>
              </div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'var(--fn-bg-inset)' }}>
                <div style={{ height: '100%', width: `${e.progress}%`, background: 'var(--fn-accent)', borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Right — open evaluation form preview */}
        <Card padded={false}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Hassan Tariq · End-of-probation</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Reviewer view · magic link · expires 18 May 23:59</div>
            </div>
            <Badge tone="warning" dot>Awaiting</Badge>
          </div>
          <div style={{ padding: 20, maxHeight: 540, overflowY: 'auto' }}>
            <div style={{
              padding: '10px 12px', background: 'var(--fn-accent-soft)', borderRadius: 7,
              fontSize: 12, color: 'var(--fn-accent-soft-fg)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon d={I.lock} size={14} />
              Signed-in as Bilal Rauf via magic link · session ends on submit
            </div>

            <FormGroup2 label="Overall performance during probation">
              <RatingPicker value={4} />
            </FormGroup2>

            <FormGroup2 label="Technical proficiency" hint="Engineering depth, code quality, problem-solving">
              <RatingPicker value={4} />
            </FormGroup2>

            <FormGroup2 label="Team collaboration">
              <RatingPicker value={5} />
            </FormGroup2>

            <FormGroup2 label="Recommend for permanent role?">
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { l: 'Yes — promote', tone: 'success', active: true },
                  { l: 'Extend probation', tone: 'warning' },
                  { l: 'Do not retain', tone: 'danger' },
                ].map(o => (
                  <span key={o.l} style={{
                    padding: '8px 14px', fontSize: 12.5, borderRadius: 7,
                    background: o.active ? `var(--fn-${o.tone}-soft)` : 'var(--fn-bg-panel)',
                    color: o.active ? `var(--fn-${o.tone}-soft-fg)` : 'var(--fn-fg-muted)',
                    border: `1px solid ${o.active ? `var(--fn-${o.tone})` : 'var(--fn-border-strong)'}`,
                    fontWeight: o.active ? 600 : 500, cursor: 'pointer',
                  }}>{o.l}</span>
                ))}
              </div>
            </FormGroup2>

            <FormGroup2 label="Strengths observed" hint="Free text · markdown supported">
              <textarea rows={3} style={{
                width: '100%', resize: 'vertical', padding: 10, fontSize: 13, fontFamily: 'inherit',
                color: 'var(--fn-fg)', background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 7, outline: 'none',
              }} defaultValue="Strong ramp on the codebase — shipped 4 PRs in week 1. Asks clarifying questions early, communicates blockers in stand-up." />
            </FormGroup2>

            <FormGroup2 label="Areas to develop">
              <textarea rows={3} style={{
                width: '100%', resize: 'vertical', padding: 10, fontSize: 13, fontFamily: 'inherit',
                color: 'var(--fn-fg)', background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 7, outline: 'none',
              }} placeholder="Optional…" />
            </FormGroup2>
          </div>
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--fn-divider)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--fn-bg-subtle)', borderRadius: '0 0 6px 6px',
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>
              Saved 12s ago · auto-saves every 10s
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="ghost">Save & close</Button>
              <Button size="sm" iconRight={I.check}>Submit evaluation</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function FormGroup2({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 4, color: 'var(--fn-fg)' }}>{label}</label>
      {hint && <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}

function RatingPicker({ value = 0, max = 5 }) {
  const labels = ['Below', 'Developing', 'On track', 'Strong', 'Exceeds'];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          flex: 1, padding: '12px 8px', borderRadius: 7,
          background: i < value ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
          border: i < value ? '1px solid var(--fn-accent)' : '1px solid var(--fn-border-strong)',
          textAlign: 'center', cursor: 'pointer',
        }}>
          <div style={{
            fontFamily: 'var(--fn-font-display)', fontSize: 22, fontWeight: 600,
            color: i < value ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)',
            lineHeight: 1, letterSpacing: '-0.02em',
          }}>{i + 1}</div>
          <div style={{ marginTop: 4, fontSize: 10.5, color: i < value ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)', fontWeight: i + 1 === value ? 600 : 400 }}>
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { HRRules, Evaluations });
