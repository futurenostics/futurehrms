// Brief 11 — Approval inbox row variants
// Showcases all approval kinds in a unified inbox

const KIND_META = {
  'commission.run': { label: 'Commission', hue: 280 },
  'payroll.run': { label: 'Payroll Run', hue: 280 },
  'overtime.request': { label: 'Overtime', hue: 65 },
  'leave.request': { label: 'Leave', hue: 245 },
  'leave.eligibility_event': { label: 'Life Event', hue: 320 },
  'attendance.correction': { label: 'Attendance', hue: 175 },
};

const INBOX = [
  {
    id: 'app-1', kind: 'payroll.run', complex: true,
    requester: 'Asma Ali', requesterRole: 'HR Admin', requesterHue: 22, requesterInitials: 'AA',
    title: 'May 2026 PKR Payroll Run',
    sub: '28 employees · Net total PKR 5,892,140',
    meta: '12 OT entries included · 2 entries held',
    when: '15 min ago', overdue: false,
  },
  {
    id: 'app-2', kind: 'overtime.request', dot: 175,
    requester: 'Bilal Rauf', requesterRole: 'Sr. Engineer', requesterHue: 280, requesterInitials: 'BR',
    title: 'Logged 6 hours of Weekend Work',
    sub: 'Saturday, 17 May 2026 · Project GreenLeaf',
    meta: 'Estimated PKR 10,227 · Paid via PKR Payroll',
    when: '2 hours ago',
  },
  {
    id: 'app-3', kind: 'leave.eligibility_event', dot: 320,
    requester: 'Faraz Iqbal', requesterRole: 'Engineer', requesterHue: 200, requesterInitials: 'FI',
    title: 'Registered Wedding event',
    sub: '15 Jun 2026 · Marriage certificate attached',
    meta: 'Will unlock: Marriage Leave (5 days, one-time)',
    when: '5 hours ago',
  },
  {
    id: 'app-4', kind: 'leave.request', dot: 245,
    requester: 'Maira Khan', requesterRole: 'BD Associate', requesterHue: 145, requesterInitials: 'MK',
    title: 'Annual leave · 3 days',
    sub: '22 May – 24 May 2026 · "Family wedding in Lahore"',
    meta: 'Balance after: 8/14 days · no overlapping requests',
    when: '1 day ago',
  },
  {
    id: 'app-5', kind: 'overtime.request', dot: 65, overdue: true,
    requester: 'Omar Sheikh', requesterRole: 'Sr. Engineer', requesterHue: 175, requesterInitials: 'OS',
    title: 'Logged 4 hours of Project Emergency',
    sub: 'Thursday, 14 May 2026 · Acme client incident · post-hoc',
    meta: 'Estimated $98.00 · Paid via Payoneer · attachment included',
    when: '3 days ago', overdueBy: '1 day past SLA',
  },
  {
    id: 'app-6', kind: 'commission.run', complex: true,
    requester: 'Asma Ali', requesterRole: 'HR Admin', requesterHue: 22, requesterInitials: 'AA',
    title: 'May 2026 Payoneer Run',
    sub: '18 USD recipients · Total $48,214.50',
    meta: '23 projects · 1 carry-forward · 4 USD-routed OT entries',
    when: '4 hours ago',
  },
  {
    id: 'app-7', kind: 'attendance.correction', dot: 175,
    requester: 'Hassan Tariq', requesterRole: 'Engineer', requesterHue: 22, requesterInitials: 'HT',
    title: 'Mark 08 May as present (not absent)',
    sub: 'Worked from home — VPN connection logged in attendance system',
    when: 'yesterday',
  },
];

function ApprovalInboxRows({ rejectPopover = false, hover = false }) {
  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
          Approvals
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)' }}>
          Items waiting on your decision. Complex kinds require individual review — simple ones can be approved in bulk.
        </p>
      </div>

      {/* Kind filter chips */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fn-fg-faint)', marginRight: 4 }}>
          Filter by:
        </span>
        {[
          { l: 'All', n: INBOX.length, active: true },
          { l: 'Overtime', n: 2, hue: 65 },
          { l: 'Leave', n: 1, hue: 245 },
          { l: 'Life events', n: 1, hue: 320 },
          { l: 'Payroll', n: 1, hue: 280 },
          { l: 'Commission', n: 1, hue: 280 },
          { l: 'Attendance', n: 1, hue: 175 },
        ].map(f => (
          <button key={f.l} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            background: f.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-subtle)',
            color: f.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
            border: '1px solid ' + (f.active ? 'color-mix(in oklch, var(--fn-accent) 28%, transparent)' : 'var(--fn-border)'),
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {f.hue != null && <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${f.hue})` }} />}
            {f.l}
            <span style={{ color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', fontSize: 11 }}>{f.n}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      <div style={{
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px', fontSize: 12.5, color: 'var(--fn-fg-muted)',
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4,
          border: '1.5px solid var(--fn-border-strong)', background: 'var(--fn-bg-panel)',
        }} />
        <span>Select all</span>
        <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
        <span>5 simple items can be bulk-approved · 2 complex items need individual review</span>
        <div style={{ flex: 1 }} />
        <ToolbarPill iconRight={I.chev} small>Oldest first</ToolbarPill>
      </div>

      {/* Rows */}
      <Card padded={false}>
        {INBOX.map((item, i) => (
          <InboxRow
            key={item.id}
            item={item}
            last={i === INBOX.length - 1}
            hoverActive={hover && i === 1}
          />
        ))}
      </Card>

      {rejectPopover && <RejectReasonPopover />}
    </>
  );
}

function InboxRow({ item, last, hoverActive }) {
  const kind = KIND_META[item.kind];
  const complex = item.complex;

  return (
    <div style={{
      padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: last ? 'none' : '1px solid var(--fn-divider)',
      background: hoverActive ? 'var(--fn-bg-subtle)' : 'transparent',
      position: 'relative',
    }}>
      {/* Checkbox */}
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        border: '1.5px solid var(--fn-border-strong)',
        background: 'var(--fn-bg-panel)',
        opacity: complex ? 0.4 : 1, cursor: complex ? 'not-allowed' : 'pointer',
      }} title={complex ? 'This approval requires individual review' : undefined} />

      {/* Avatar */}
      <span style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `oklch(0.92 0.07 ${item.requesterHue})`,
        color: `oklch(0.38 0.16 ${item.requesterHue})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12.5, fontWeight: 600,
      }}>
        {item.requesterInitials}
      </span>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {item.dot != null && <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(0.55 0.16 ${item.dot})`, flexShrink: 0 }} />}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{item.title}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '1px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
            background: `oklch(0.94 0.04 ${kind.hue})`,
            color: `oklch(0.38 0.13 ${kind.hue})`,
            border: `1px solid color-mix(in oklch, oklch(0.55 0.16 ${kind.hue}) 22%, transparent)`,
          }}>
            {kind.label}
          </span>
          {item.overdue && (
            <Badge tone="danger">
              <Icon d={I.clock} size={9} /> Overdue · {item.overdueBy}
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{item.requester}</span>
          <span style={{ color: 'var(--fn-fg-faint)' }}> · {item.requesterRole} · </span>
          {item.sub}
        </div>
        {item.meta && (
          <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 3 }}>{item.meta}</div>
        )}
      </div>

      {/* Time */}
      <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', flexShrink: 0, width: 80, textAlign: 'right' }}>
        Requested<br />
        <span style={{ color: 'var(--fn-fg-muted)' }}>{item.when}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {complex ? (
          <Button size="sm" iconRight={I.arrowR}>Review & approve</Button>
        ) : (
          <>
            <Button variant="secondary" size="sm">Reject</Button>
            <Button size="sm" icon={I.check}>Approve</Button>
          </>
        )}
      </div>
    </div>
  );
}

function RejectReasonPopover() {
  return (
    <div style={{
      position: 'absolute', top: 480, right: 80, zIndex: 50, width: 320,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.25), 0 6px 12px -4px rgba(15, 17, 23, 0.12)',
    }}>
      <div style={{
        padding: '12px 16px 10px', borderBottom: '1px solid var(--fn-divider)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={I.x} size={13} />
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Reject this request</div>
          <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Bilal Rauf · Weekend OT · 6h</div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <SheetField label="Reason (required)" hint="The employee will see this. Be specific.">
          <textarea
            rows={3}
            placeholder="e.g. The Saturday work wasn't pre-approved and the project lead has no record of the emergency."
            style={{
              width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 12.5,
              fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
              background: 'var(--fn-bg-panel)',
              border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
            }}
          />
        </SheetField>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fn-fg-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon d={I.shield} size={11} />
          Logged in audit as <span style={{ fontFamily: 'var(--fn-font-mono)' }}>overtime.request.rejected</span>
        </div>
      </div>
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button variant="danger" size="sm" icon={I.x}>Reject request</Button>
      </div>
    </div>
  );
}

Object.assign(window, { ApprovalInboxRows });
