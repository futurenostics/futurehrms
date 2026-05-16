// Brief 14 — Markdown template editor
// Full-page editor with split editor/preview + variable picker + validation
// NOTE: the actual Markdown editor in production is a CodeMirror 6 component.
// Here it's a styled mockup of what the user sees.

const MD_BODY = [
  { line: 1, content: '# Salary Certificate', kind: 'h1' },
  { line: 2, content: '' },
  { line: 3, content: '**Reference:** {{document.referenceNumber}}', kind: 'p' },
  { line: 4, content: '**Issued:** {{today}}' },
  { line: 5, content: '' },
  { line: 6, content: 'To whom it may concern,' },
  { line: 7, content: '' },
  { line: 8, content: 'This is to certify that **{{employee.fullName}}** (Employee ID' },
  { line: 9, content: '{{employee.eid}}) is employed with Futurenostics Private Limited as' },
  { line: 10, content: 'a **{{employee.designation}}** in our **{{employee.department}}**' },
  { line: 11, content: 'department since {{employee.joinDate}}.' },
  { line: 12, content: '' },
  { line: 13, content: 'Their current gross monthly salary is **PKR' },
  { line: 14, content: '{{employee.salaryPkr}}**.' },
  { line: 15, content: '' },
  { line: 16, content: 'This letter is issued at the employee\'s request and is valid' },
  { line: 17, content: 'for {{validityMonths}} months from the date of issue.', error: 'validityMonths' },
  { line: 18, content: '' },
  { line: 19, content: 'For questions, contact us at {{organization.hrEmail}}.' },
  { line: 20, content: '' },
  { line: 21, content: '---' },
  { line: 22, content: '' },
  { line: 23, content: '{{signatoryName}}', kind: 'p' },
  { line: 24, content: '{{signatoryTitle}}' },
  { line: 25, content: 'Futurenostics Private Limited' },
];

function MdEditor({ state = 'valid' }) {
  const showErrors = state === 'errors';
  const showVarPicker = state === 'var_picker';
  const showSettings = state === 'settings';
  const showSampleData = state === 'sample_data';
  const showHistory = state === 'history';
  const showValidation = state === 'errors';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 980 }}>
      {/* TOP BAR */}
      <div style={{
        height: 56, padding: '0 20px', flexShrink: 0,
        background: 'var(--fn-bg-panel)', borderBottom: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fn-fg-muted)', border: '1px solid var(--fn-border)',
        }}>
          <Icon d={I.chevL} size={14} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>Templates</span>
        <Icon d={I.chevR} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        <div style={{
          padding: '5px 10px', borderRadius: 6,
          background: 'var(--fn-bg-subtle)',
          border: '1px dashed var(--fn-border-strong)',
          fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
        }}>
          Salary certificate · for bank
        </div>
        <EngineBadge engine="markdown" />
        <Badge tone={showHistory ? 'neutral' : 'success'} dot>{showHistory ? 'v2 · read-only' : 'Draft · v4'}</Badge>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 6, cursor: 'pointer',
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--fn-font-mono)',
        }}>
          {showHistory ? 'v2 (1 May)' : 'v3 (active)'} <Icon d={I.chev} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
        </span>

        <div style={{ flex: 1 }} />

        <Button variant="secondary" size="sm" icon={I.zap}>Test</Button>
        <Button variant="secondary" size="sm">Save as draft</Button>
        <Button size="sm" icon={I.check}>Save as new version</Button>
      </div>

      {/* MAIN SPLIT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 720 }}>
        {/* LEFT — Editor */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--fn-border)', position: 'relative' }}>
          {/* Editor header */}
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--fn-divider)',
            background: 'var(--fn-bg-panel)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 6 }}>
              {['Body', 'Settings', 'Variables'].map((t, i) => {
                const active = (i === 0 && !showSettings) || (i === 1 && showSettings);
                return (
                  <span key={t} style={{
                    padding: '5px 11px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                    background: active ? 'var(--fn-bg-panel)' : 'transparent',
                    color: active ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
                    boxShadow: active ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer',
                  }}>{t}</span>
                );
              })}
            </div>

            <div style={{ height: 18, borderLeft: '1px solid var(--fn-divider)' }} />

            {/* Format toolbar */}
            <div style={{ display: 'flex', gap: 2 }}>
              {[
                { d: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z', t: 'B' },
                { d: 'M19 4h-9M14 20H5M15 4L9 20', t: 'I' },
                { d: 'M4 12h16M4 18h16M4 6h16', t: '☰' },
              ].map((b, i) => (
                <span key={i} style={{
                  width: 28, height: 28, borderRadius: 5, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--fn-fg-muted)', fontSize: 13, fontWeight: 700,
                }}>{b.t}</span>
              ))}
              {['H1', 'H2'].map(t => (
                <span key={t} style={{
                  height: 28, padding: '0 8px', borderRadius: 5, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center',
                  color: 'var(--fn-fg-muted)', fontSize: 11, fontWeight: 700,
                }}>{t}</span>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            <Button size="sm" variant="secondary" icon={I.plus} style={{ height: 28 }}>Insert variable</Button>
          </div>

          {/* Editor body or settings */}
          {showSettings ? (
            <EditorSettings />
          ) : showHistory ? (
            <EditorWithHistory />
          ) : (
            <EditorBody showErrors={showErrors} />
          )}

          {showVarPicker && <VariablePickerPopover />}
        </div>

        {/* RIGHT — Preview */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', background: 'var(--fn-bg-subtle)' }}>
          {/* Preview header */}
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--fn-divider)',
            background: 'var(--fn-bg-panel)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            position: 'relative',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)',
              fontSize: 12,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
              }}>BR</span>
              <span style={{ fontWeight: 500 }}>Bilal Rauf</span>
              <span style={{ color: 'var(--fn-fg-faint)' }}>· sample</span>
              <Icon d={I.chev} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
            </span>

            <div style={{ height: 18, borderLeft: '1px solid var(--fn-divider)' }} />

            {/* Zoom */}
            <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 5, padding: 1, alignItems: 'center' }}>
              <span style={{ width: 24, height: 22, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>−</span>
              <span style={{ padding: '0 8px', fontSize: 11, fontWeight: 600, color: 'var(--fn-fg)', fontFamily: 'var(--fn-font-mono)' }}>100%</span>
              <span style={{ width: 24, height: 22, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>+</span>
            </div>

            <ToolbarPill small icon={I.eye}>Fit width</ToolbarPill>

            <div style={{ flex: 1 }} />

            <span style={{
              fontSize: 11, color: 'var(--fn-fg-faint)',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99, background: 'var(--fn-success)',
              }} />
              Synced
            </span>

            <ToolbarPill small icon={I.download}>PDF</ToolbarPill>

            {showSampleData && <SampleDataDropdown />}
          </div>

          {/* Preview body */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '24px',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          }}>
            <PaperPreview showErrors={showErrors} />
          </div>
        </div>
      </div>

      {/* VALIDATION DRAWER */}
      {showValidation && <ValidationDrawer />}

      {/* BOTTOM BAR */}
      <div style={{
        height: 44, padding: '0 20px', flexShrink: 0,
        background: 'var(--fn-bg-panel)', borderTop: '1px solid var(--fn-border)',
        display: 'flex', alignItems: 'center', gap: 14,
        fontSize: 11.5, color: 'var(--fn-fg-muted)',
      }}>
        {showErrors ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
            fontSize: 11.5, fontWeight: 600,
          }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={11} stroke={2} />
            2 unresolved placeholders · jump to first
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 5,
            background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
            fontSize: 11.5, fontWeight: 600,
          }}>
            <Icon d={I.check} size={11} stroke={2.5} />
            All placeholders resolve
          </span>
        )}
        <div style={{ height: 18, borderLeft: '1px solid var(--fn-divider)' }} />
        <span style={{ fontFamily: 'var(--fn-font-mono)' }}>Line 14, Col 6 · 187 words · 1.2 KB</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--fn-font-mono)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: state === 'errors' ? 'var(--fn-warning)' : 'var(--fn-success)' }} />
          {state === 'errors' ? 'Unsaved changes' : 'Saved 2s ago'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Auto-save to local backup every 30s</span>
      </div>
    </div>
  );
}

function EditorBody({ showErrors }) {
  return (
    <div style={{
      flex: 1, overflow: 'auto', padding: '14px 0',
      background: 'var(--fn-bg-panel)',
      fontFamily: 'var(--fn-font-mono)', fontSize: 13, lineHeight: 1.7,
    }}>
      {MD_BODY.map(line => {
        const text = renderMdLine(line.content, showErrors);
        return (
          <div key={line.line} style={{
            display: 'flex', minHeight: 22,
            background: line.error && showErrors ? 'color-mix(in oklch, var(--fn-danger-soft) 60%, transparent)' : 'transparent',
          }}>
            <span style={{
              width: 44, paddingRight: 12, textAlign: 'right', flexShrink: 0,
              color: 'var(--fn-fg-faint)', fontSize: 11, fontVariantNumeric: 'tabular-nums',
              borderRight: '1px solid var(--fn-divider)', marginRight: 12,
            }}>{line.line}</span>
            <span style={{
              flex: 1, color: 'var(--fn-fg)', whiteSpace: 'pre-wrap', paddingRight: 14,
            }}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderMdLine(content, showErrors) {
  // Split on {{...}} and # / ** markers
  const parts = [];
  let remaining = content;
  let idx = 0;
  const regex = /\{\{([^}]+)\}\}|^(#{1,3}\s.+)$|(\*\*[^*]+\*\*)/;
  let lastIdx = 0;
  let m;
  // Simpler approach: iterate
  const tokens = [];
  let i = 0;
  while (i < content.length) {
    if (content[i] === '{' && content[i + 1] === '{') {
      const end = content.indexOf('}}', i);
      if (end !== -1) {
        const varName = content.slice(i + 2, end);
        const isError = showErrors && (varName === 'validityMonths' || varName === 'signatoryTitle');
        tokens.push({ kind: 'var', text: '{{' + varName + '}}', error: isError });
        i = end + 2;
        continue;
      }
    }
    if (content[i] === '*' && content[i + 1] === '*') {
      const end = content.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ kind: 'bold', text: content.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
    }
    if (i === 0 && content.startsWith('#')) {
      const space = content.indexOf(' ');
      tokens.push({ kind: 'heading', text: content.slice(0, space + 1) });
      i = space + 1;
      continue;
    }
    if (i === 0 && content === '---') {
      tokens.push({ kind: 'hr', text: '---' });
      i = 3;
      continue;
    }
    // Plain text run
    let j = i;
    while (j < content.length && content[j] !== '{' && content[j] !== '*') j++;
    if (j > i) {
      tokens.push({ kind: 'text', text: content.slice(i, j) });
      i = j;
    } else {
      i++;
    }
  }
  return tokens.map((t, k) => {
    if (t.kind === 'var') {
      return (
        <span key={k} style={{
          color: t.error ? 'var(--fn-danger-soft-fg)' : 'var(--fn-accent-soft-fg)',
          background: t.error ? 'color-mix(in oklch, var(--fn-danger-soft) 80%, transparent)' : 'var(--fn-accent-soft)',
          padding: '0 4px', borderRadius: 3, fontWeight: 600,
          borderBottom: t.error ? '2px wavy var(--fn-danger)' : 'none',
          textDecoration: t.error ? 'underline wavy var(--fn-danger)' : 'none',
          textDecorationSkipInk: 'none',
        }}>{t.text}</span>
      );
    }
    if (t.kind === 'bold') {
      return <span key={k} style={{ color: 'var(--fn-fg)', fontWeight: 700 }}>{t.text}</span>;
    }
    if (t.kind === 'heading') {
      return <span key={k} style={{ color: 'oklch(0.55 0.16 280)', fontWeight: 700 }}>{t.text}</span>;
    }
    if (t.kind === 'hr') {
      return <span key={k} style={{ color: 'var(--fn-fg-faint)' }}>{t.text}</span>;
    }
    return <span key={k}>{t.text}</span>;
  });
}

function PaperPreview({ showErrors }) {
  return (
    <div style={{
      width: 480, padding: '48px 52px', background: '#fff',
      border: '1px solid oklch(0.92 0.005 250)',
      boxShadow: '0 12px 28px -8px rgba(15, 17, 23, 0.12), 0 4px 8px -2px rgba(15, 17, 23, 0.06)',
      fontFamily: 'var(--fn-font-sans)', color: '#1a1a2e',
      minHeight: 600,
    }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a2e' }}>
        Salary Certificate
      </h1>
      <div style={{ marginTop: 16, fontSize: 12, color: '#3a3a55', lineHeight: 1.7 }}>
        <div><strong style={{ fontWeight: 700 }}>Reference:</strong> SC-2026-0142</div>
        <div><strong style={{ fontWeight: 700 }}>Issued:</strong> 15 May 2026</div>
      </div>
      <p style={{ marginTop: 18, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        To whom it may concern,
      </p>
      <p style={{ marginTop: 14, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        This is to certify that <strong style={{ fontWeight: 700 }}>Bilal Rauf</strong> (Employee ID EMP-0042) is employed with Futurenostics Private Limited as a <strong style={{ fontWeight: 700 }}>Senior Software Engineer</strong> in our <strong style={{ fontWeight: 700 }}>Engineering</strong> department since 12 August 2023.
      </p>
      <p style={{ marginTop: 14, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        Their current gross monthly salary is <strong style={{ fontWeight: 700 }}>PKR 200,000</strong>.
      </p>
      <p style={{ marginTop: 14, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        This letter is issued at the employee's request and is valid for{' '}
        {showErrors ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '0 6px', borderRadius: 3, fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, fontWeight: 600,
            background: 'oklch(0.94 0.04 22)', color: 'oklch(0.45 0.13 25)',
            border: '1px dashed oklch(0.65 0.18 22)',
          }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={9} />
            {'{{validityMonths}}'}
          </span>
        ) : '6'} months from the date of issue.
      </p>
      <p style={{ marginTop: 14, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        For questions, contact us at hr@futurenostics.com.
      </p>
      <hr style={{ marginTop: 22, border: 'none', borderTop: '1px solid oklch(0.90 0.005 250)' }} />
      <p style={{ marginTop: 22, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
        Asma Ali<br />
        {showErrors ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '0 6px', borderRadius: 3, fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, fontWeight: 600,
            background: 'oklch(0.94 0.04 22)', color: 'oklch(0.45 0.13 25)',
            border: '1px dashed oklch(0.65 0.18 22)',
          }}>{'{{signatoryTitle}}'}</span>
        ) : 'Head of People'}<br />
        Futurenostics Private Limited
      </p>
    </div>
  );
}

function VariablePickerPopover() {
  const groups = [
    { name: 'Employee fields', icon: I.user, hue: 280, vars: [
      { k: 'employee.fullName', t: 'string' },
      { k: 'employee.eid', t: 'string' },
      { k: 'employee.email', t: 'string' },
      { k: 'employee.designation', t: 'string' },
      { k: 'employee.department', t: 'string' },
      { k: 'employee.joinDate', t: 'date' },
      { k: 'employee.salaryPkr', t: 'currency' },
    ]},
    { name: 'Organization', icon: I.building, hue: 145, vars: [
      { k: 'organization.legalName', t: 'string' },
      { k: 'organization.hrEmail', t: 'string' },
      { k: 'organization.ntn', t: 'string' },
    ]},
    { name: 'Today', icon: I.clock, hue: 175, vars: [
      { k: 'today', t: 'date' },
      { k: 'today.year', t: 'number' },
    ]},
    { name: 'Manual variables', icon: I.edit, hue: 65, vars: [
      { k: 'signatoryName', t: 'string · manual' },
      { k: 'signatoryTitle', t: 'string · manual' },
      { k: 'validityMonths', t: 'number · manual' },
    ]},
    { name: 'Auto-generated', icon: I.zap, hue: 22, vars: [
      { k: 'document.referenceNumber', t: 'auto' },
      { k: 'document.qrCode', t: 'auto' },
    ]},
  ];
  return (
    <div style={{
      position: 'absolute', top: 50, right: 16, zIndex: 30, width: 340,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.20), 0 6px 12px -4px rgba(15, 17, 23, 0.10)',
      maxHeight: 540, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--fn-divider)' }}>
        <Input icon={I.search} placeholder="Search variables…" style={{ height: 32 }} />
      </div>
      <div style={{ overflow: 'auto', padding: '8px 6px' }}>
        {groups.map(g => (
          <div key={g.name} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
              fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--fn-fg-faint)',
            }}>
              <Icon d={g.icon} size={11} style={{ color: `oklch(0.55 0.16 ${g.hue})` }} />
              {g.name}
            </div>
            {g.vars.map(v => (
              <div key={v.k} style={{
                padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: v.k === 'employee.fullName' ? 'var(--fn-accent-soft)' : 'transparent',
              }}>
                <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, fontWeight: 500, color: v.k === 'employee.fullName' ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>
                  {'{{' + v.k + '}}'}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>{v.t}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleDataDropdown() {
  const people = [
    { name: 'Synthetic sample', sub: 'placeholder data · default', hue: 250, synth: true },
    { name: 'Bilal Rauf', sub: 'Sr. Engineer · EMP-0042', hue: 280, selected: true },
    { name: 'Sana Lateef', sub: 'BD Lead · EMP-0019', hue: 175 },
    { name: 'Maira Khan', sub: 'BD Associate · EMP-0061', hue: 145 },
    { name: 'Talha Mansoor', sub: 'BD Manager · EMP-0033', hue: 65 },
  ];
  return (
    <div style={{
      position: 'absolute', top: 48, left: 16, zIndex: 30, width: 280,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 10, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.20), 0 6px 12px -4px rgba(15, 17, 23, 0.10)',
    }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--fn-divider)' }}>
        <Input icon={I.search} placeholder="Find employee…" style={{ height: 30 }} />
      </div>
      <div style={{ padding: 4, maxHeight: 280, overflow: 'auto' }}>
        {people.map(p => (
          <div key={p.name} style={{
            padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 9,
            background: p.selected ? 'var(--fn-accent-soft)' : 'transparent',
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: 5, flexShrink: 0,
              background: p.synth ? 'var(--fn-bg-inset)' : `oklch(0.92 0.07 ${p.hue})`,
              color: p.synth ? 'var(--fn-fg-faint)' : `oklch(0.38 0.16 ${p.hue})`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {p.synth ? '?' : p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.selected ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--fn-fg-faint)' }}>{p.sub}</div>
            </div>
            {p.selected && <Icon d={I.check} size={11} stroke={3} style={{ color: 'var(--fn-accent-soft-fg)' }} />}
          </div>
        ))}
      </div>
      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--fn-divider)',
        background: 'var(--fn-bg-subtle)', fontSize: 10.5, color: 'var(--fn-fg-faint)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon d={I.shield} size={10} /> Preview only · never generates a real document
      </div>
    </div>
  );
}

function EditorSettings() {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--fn-bg-panel)' }}>
      <LtSection title="Manual variables" icon={I.edit}>
        <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginBottom: 12, lineHeight: 1.55 }}>
          When a generator uses this template, these fields show up as inputs. Set the label + helper text users will see.
        </div>
        <ManualVar name="signatoryName" label="Signatory name" hint="Name of the person signing this certificate" required />
        <ManualVar name="signatoryTitle" label="Signatory title" hint="e.g. Head of People, CEO" required />
        <ManualVar name="validityMonths" label="Validity (months)" hint="Defaults to 6 if left blank" type="number" />
        <button style={{
          marginTop: 8, padding: '8px 12px', width: '100%',
          background: 'transparent', border: '1px dashed var(--fn-border-strong)',
          borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12, fontWeight: 500, color: 'var(--fn-fg-muted)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon d={I.plus} size={11} /> Add manual variable
        </button>
      </LtSection>

      <LtSection title="Page settings" icon={I.doc}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SheetField label="Page size"><DropdownChip value="A4 · 210 × 297mm" /></SheetField>
          <SheetField label="Orientation"><DropdownChip value="Portrait" /></SheetField>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <SheetField label="Top"><Input defaultValue="20" suffix={<span style={{ fontSize: 10, color: 'var(--fn-fg-faint)' }}>mm</span>} style={{ height: 34 }} /></SheetField>
          <SheetField label="Right"><Input defaultValue="20" suffix={<span style={{ fontSize: 10, color: 'var(--fn-fg-faint)' }}>mm</span>} style={{ height: 34 }} /></SheetField>
          <SheetField label="Bottom"><Input defaultValue="20" suffix={<span style={{ fontSize: 10, color: 'var(--fn-fg-faint)' }}>mm</span>} style={{ height: 34 }} /></SheetField>
          <SheetField label="Left"><Input defaultValue="20" suffix={<span style={{ fontSize: 10, color: 'var(--fn-fg-faint)' }}>mm</span>} style={{ height: 34 }} /></SheetField>
        </div>
        <div style={{ height: 12 }} />
        <ToggleRow label="Render company header on every page" hint="Logo + address strip" on />
        <div style={{ height: 8 }} />
        <ToggleRow label="Render signature block" hint="Pulls signatoryName + signatoryTitle from manual variables" on />
      </LtSection>
    </div>
  );
}

function ManualVar({ name, label, hint, required, type = 'string' }) {
  return (
    <div style={{
      padding: 12, marginBottom: 8, borderRadius: 8,
      background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, padding: '2px 7px', borderRadius: 4,
          background: 'oklch(0.95 0.05 65)', color: 'oklch(0.44 0.10 70)', fontWeight: 600,
        }}>{name}</span>
        {required && <Badge tone="warning">Required</Badge>}
        <Badge tone="neutral">{type}</Badge>
        <div style={{ flex: 1 }} />
        <Icon d={I.edit} size={12} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
        <Icon d={I.trash} size={12} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fn-fg)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--fn-fg-faint)' }}>{hint}</div>
    </div>
  );
}

function EditorWithHistory() {
  return (
    <>
      <div style={{
        padding: '10px 14px',
        background: 'var(--fn-warning-soft)',
        borderBottom: '1px solid color-mix(in oklch, var(--fn-warning) 30%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon d={I.lock} size={13} style={{ color: 'var(--fn-warning-soft-fg)' }} />
        <span style={{ fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
          Viewing version 2 (1 May 2026). Read-only.
          <span style={{ marginLeft: 6, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Switch to active version</span> or
          <span style={{ marginLeft: 4, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>duplicate this version</span>.
        </span>
      </div>
      <EditorBody showErrors={false} />
    </>
  );
}

function ValidationDrawer() {
  return (
    <div style={{
      position: 'absolute', right: 0, top: 56, bottom: 44, width: 340, zIndex: 25,
      background: 'var(--fn-bg-panel)',
      borderLeft: '1px solid var(--fn-border)',
      boxShadow: '-20px 0 40px -16px rgba(15, 17, 23, 0.18)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--fn-divider)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={13} stroke={2} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>2 unresolved placeholders</div>
          <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Fix or remove before saving as a new version</div>
        </div>
        <Icon d={I.x} size={14} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {[
          {
            line: 17, placeholder: 'validityMonths',
            error: 'Not declared as a manual variable',
            fix: "Add 'validityMonths' to Manual variables in Settings",
          },
          {
            line: 24, placeholder: 'signatoryTitle',
            error: 'Did you mean signatoryRole?',
            fix: "Rename to 'signatoryRole' to match the manual variable name",
          },
        ].map((e, i) => (
          <div key={i} style={{
            padding: 12, marginBottom: 10, borderRadius: 8,
            background: 'var(--fn-danger-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: 'var(--fn-bg-panel)', color: 'var(--fn-danger-soft-fg)',
                fontFamily: 'var(--fn-font-mono)',
              }}>Line {e.line}</span>
              <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--fn-danger-soft-fg)' }}>
                {'{{' + e.placeholder + '}}'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fn-danger-soft-fg)', fontWeight: 500 }}>{e.error}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fn-danger-soft-fg)', opacity: 0.85, lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 700 }}>Fix:</strong> {e.fix}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <Button size="sm" variant="secondary" iconRight={I.arrowR} style={{ height: 26 }}>Jump to line</Button>
              <Button size="sm" variant="secondary" icon={I.zap} style={{ height: 26 }}>Quick fix</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MdEditor });
