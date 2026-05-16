// Brief 18 — Upload + Generate flows (Sheets)

function UploadOrGenerateSheet({ flow = 'upload', state = 'filled' }) {
  return (
    <>
      {/* Page backdrop peek */}
      <div style={{ padding: 28, opacity: 0.55 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Documents</h1>
        <div style={{ marginTop: 24, height: 200, background: 'var(--fn-bg-subtle)', borderRadius: 8 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />

      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 620, zIndex: 51,
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
            <Icon d={flow === 'upload' ? I.upload : I.zap} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {flow === 'upload' ? 'Upload document' : 'Generate · Salary certificate · for bank'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              {flow === 'upload'
                ? 'Attach an existing file with the right metadata'
                : 'Renders a new PDF from current Employee data · ready to email or sign'}
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        {state === 'success' ? (
          <SuccessScreen flow={flow} />
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            {flow === 'upload' ? <UploadBody state={state} /> : <GenerateBody />}
          </div>
        )}

        {state !== 'success' && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
            background: 'var(--fn-bg-subtle)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon d={I.shield} size={11} />
              {flow === 'upload' ? 'Checksum verified · stored encrypted' : 'Variables resolve from current Employee data'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button size="sm" icon={flow === 'upload' ? I.upload : I.zap}>
                {flow === 'upload' ? 'Upload document' : (state === 'generating' ? 'Generating…' : 'Generate document')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function UploadBody({ state }) {
  const fileSelected = state !== 'empty';
  const hasError = state === 'error';
  const hasDuplicate = state === 'duplicate';

  return (
    <>
      <SheetField label="File">
        {fileSelected ? (
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: hasError ? 'var(--fn-danger-soft)' : 'var(--fn-bg-subtle)',
            border: '1px solid ' + (hasError ? 'color-mix(in oklch, var(--fn-danger) 30%, transparent)' : 'var(--fn-border)'),
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              width: 32, height: 40, borderRadius: 5, flexShrink: 0,
              background: 'oklch(0.94 0.04 22)', color: 'oklch(0.45 0.13 25)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid color-mix(in oklch, oklch(0.55 0.16 22) 25%, transparent)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
            }}>PDF</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>cnic-bilal-rauf-updated.pdf</div>
              <div style={{ fontSize: 11, color: hasError ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>
                {hasError ? 'File too large · 28.4 MB exceeds 25 MB limit' : '1.2 MB · PDF · checksum b3a3...c19f'}
              </div>
            </div>
            <Button size="sm" variant="secondary" icon={I.upload}>Replace</Button>
          </div>
        ) : (
          <div style={{
            padding: 22, borderRadius: 8,
            background: 'var(--fn-bg-subtle)',
            border: '2px dashed var(--fn-border-strong)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            textAlign: 'center',
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-muted)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--fn-border-strong)',
            }}>
              <Icon d={I.upload} size={15} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Drop a file or click to browse</div>
            <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>PDF, JPG, PNG, DOCX · up to 25 MB</div>
          </div>
        )}
      </SheetField>

      {!fileSelected ? null : (
        <>
          <div style={{ height: 18 }} />

          {hasDuplicate && (
            <div style={{
              marginBottom: 18, padding: '12px 14px', borderRadius: 8,
              background: 'var(--fn-warning-soft)',
              border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.55 }}>
                <strong style={{ fontWeight: 700 }}>Bilal Rauf already has an active CNIC document.</strong> Do you want to replace it?
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <Button size="sm" icon={I.upload} style={{ height: 26 }}>Replace existing</Button>
                  <Button size="sm" variant="secondary" style={{ height: 26 }}>Keep both</Button>
                </div>
              </div>
            </div>
          )}

          <SheetField label="Entity" hint="Pre-filled from the Employee profile where you started">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 6,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 5,
                background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>BR</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Bilal Rauf</div>
                <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>Sr. Engineer · EMP-0042</div>
              </div>
              <Icon d={I.lock} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Category" hint="Defaults below auto-fill from the category">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, cursor: 'pointer',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 5,
                background: 'oklch(0.92 0.07 22)', color: 'oklch(0.38 0.16 22)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={I.shield} size={12} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>CNIC</span>
              <div style={{ flex: 1 }} />
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Title">
            <Input defaultValue="CNIC · updated 2024 scan" style={{ height: 40 }} />
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Description (optional)">
            <textarea
              rows={2}
              placeholder="Anything useful — front + back, replaces 2014 scan, etc."
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                background: 'var(--fn-bg-panel)',
                border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
              }}
            />
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Tags (optional)">
            <div style={{
              padding: '8px 10px', minHeight: 40,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11.5, padding: '2px 4px 2px 8px', borderRadius: 4, background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                updated <Icon d={I.x} size={10} style={{ opacity: 0.7, cursor: 'pointer', marginRight: 2 }} />
              </span>
              <span style={{ fontSize: 11.5, padding: '2px 4px 2px 8px', borderRadius: 4, background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                2024 <Icon d={I.x} size={10} style={{ opacity: 0.7, cursor: 'pointer', marginRight: 2 }} />
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontStyle: 'italic' }}>Type to add…</span>
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SheetField label="Issued">
              <Input defaultValue="14 Feb 2024" icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" style={{ height: 38 }} />
            </SheetField>
            <SheetField
              label="Expiry"
              hint={<span><strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Tip:</strong> CNICs typically expire after 10 years</span>}
            >
              <Input defaultValue="14 Feb 2034" icon="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" style={{ height: 38 }} suffix={
                <span style={{ fontSize: 10, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, fontFamily: 'var(--fn-font-mono)' }}>+10y</span>
              } />
            </SheetField>
          </div>

          <div style={{ height: 14 }} />

          <SheetField label="Visibility" hint="Pre-filled from category default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <VisCard label="HR only · Restricted" sub="Default for CNIC · all views audit-logged" active />
              <VisCard label="HR + Employee" sub="Employee can see their own copy" />
              <span style={{ fontSize: 10, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>Show all 4 visibility levels</span>
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <div style={{
            padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Requires acknowledgment</div>
              <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Pre-filled from category · CNIC defaults to off</div>
            </div>
            <Toggle on={false} />
          </div>
        </>
      )}
    </>
  );
}

function GenerateBody() {
  return (
    <>
      {/* Target */}
      <SheetField label="Target employee" hint="Pre-filled from where you started · click to change">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 6,
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 5,
            background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>BR</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Bilal Rauf</div>
            <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>Sr. Engineer · EMP-0042 · Engineering</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Change</span>
        </div>
      </SheetField>

      <div style={{ height: 18 }} />

      {/* Auto-filled variables */}
      <SheetField
        label="Auto-filled variables"
        hint="Read-only · these resolve from the Employee profile. Fix data there if anything's wrong."
      >
        <div style={{
          padding: '4px 0', borderRadius: 6,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
        }}>
          {[
            { k: 'employee.fullName', v: 'Bilal Rauf', src: 'Employee data' },
            { k: 'employee.designation', v: 'Sr. Engineer', src: 'Employee data' },
            { k: 'employee.salaryPkr', v: 'PKR 285,000', src: 'Salary History' },
            { k: 'employee.joinDate', v: '12 Aug 2023', src: 'Employee data' },
            { k: 'today', v: '15 May 2026', src: 'System' },
          ].map((v, i, arr) => (
            <div key={v.k} style={{
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: i < arr.length - 1 ? '1px dashed var(--fn-border)' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11, color: 'var(--fn-fg-muted)', flexShrink: 0, minWidth: 140 }}>
                {'{{' + v.k + '}}'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fn-fg)', flex: 1 }}>{v.v}</span>
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                background: 'var(--fn-bg-panel)', color: 'var(--fn-fg-faint)',
                border: '1px solid var(--fn-border)',
              }}>
                from {v.src}
              </span>
            </div>
          ))}
        </div>
      </SheetField>

      <div style={{ height: 18 }} />

      {/* Manual variables */}
      <SheetField label="Manual fields" hint="Required by this template · the rest comes from data above">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ManualInput label="Signatory name" hint="Name of the person signing this certificate" value="Asma Ali" required />
          <ManualInput label="Signatory title" hint="e.g. 'Head of People, CEO'" value="Head of People" required />
          <ManualInput label="Validity (months)" hint="Defaults to 6 if blank" value="6" type="number" />
          <ManualInput label="Recipient bank (optional)" hint="e.g. 'Habib Bank Limited'" value="Habib Bank Limited" />
        </div>
      </SheetField>

      <div style={{ height: 18 }} />

      {/* Auto-generated values */}
      <SheetField label="Auto-generated">
        <div style={{
          padding: '8px 12px', borderRadius: 6,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon d={I.zap} size={13} style={{ color: 'var(--fn-fg-muted)' }} />
          <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 11.5, color: 'var(--fn-fg)' }}>SC-2026-0142</span>
          <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>· assigned at generation</span>
        </div>
      </SheetField>

      <div style={{ height: 18 }} />

      {/* Live preview */}
      <SheetField label="Preview">
        <div style={{
          padding: 12, borderRadius: 8,
          background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <div style={{
            width: 80, height: 100, borderRadius: 4,
            background: '#fff', border: '1px solid oklch(0.92 0.005 250)',
            boxShadow: 'var(--fn-shadow-xs)', flexShrink: 0,
            padding: 8, fontSize: 4, lineHeight: 1.4, color: '#1a1a2e',
            overflow: 'hidden',
          }}>
            <div style={{ fontSize: 6, fontWeight: 700, marginBottom: 4 }}>Salary Certificate</div>
            <div style={{ height: 1, background: '#ddd', marginBottom: 4 }} />
            <div style={{ fontSize: 4.5, lineHeight: 1.5 }}>
              This is to certify that Bilal Rauf is employed with Futurenostics Private Limited as a Sr. Engineer...
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Live preview ready</div>
            <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2, lineHeight: 1.55 }}>
              Re-renders as you edit manual fields · ~500ms debounce. Click to open full preview.
            </div>
          </div>
          <Icon d={I.eye} size={13} style={{ color: 'var(--fn-accent-soft-fg)' }} />
        </div>
      </SheetField>

      <div style={{ height: 18 }} />

      {/* Output settings */}
      <SheetField label="Output settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SheetField label="Title">
            <Input defaultValue="Salary certificate · Bilal Rauf · for HBL · May 2026" style={{ height: 38 }} />
          </SheetField>
          <SheetField label="Tags">
            <Input defaultValue="" placeholder="bank, loan, hbl…" style={{ height: 38 }} />
          </SheetField>
        </div>
      </SheetField>

      <div style={{ height: 14 }} />

      <SheetField label="After generation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CheckRow label="Email PDF to employee" sub="bilal.rauf@futurenostics.com" checked />
          <CheckRow label="Send for signature" sub="E-signature available in a later release" disabled />
          <CheckRow label="Require acknowledgment" sub="Default from category · off for salary certs" />
        </div>
      </SheetField>
    </>
  );
}

function ManualInput({ label, hint, value, required, type }) {
  return (
    <div style={{
      padding: 12, borderRadius: 6,
      background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-fg)' }}>{label}</span>
        {required && <Badge tone="warning">Required</Badge>}
        {type === 'number' && <Badge tone="neutral">number</Badge>}
      </div>
      <Input defaultValue={value} style={{ height: 36, background: 'var(--fn-bg-panel)' }} />
      <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 5 }}>{hint}</div>
    </div>
  );
}

function CheckRow({ label, sub, checked, disabled }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6,
      background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: checked ? 'var(--fn-accent)' : 'var(--fn-bg-panel)',
        border: '1.5px solid ' + (checked ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Icon d={I.check} size={11} stroke={3} style={{ color: '#fff' }} />}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{sub}</div>
      </div>
    </label>
  );
}

function SuccessScreen({ flow }) {
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
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fn-fg)' }}>
        {flow === 'upload' ? 'Uploaded' : 'Document generated'}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fn-fg-muted)', maxWidth: 360, lineHeight: 1.55 }}>
        {flow === 'upload'
          ? <>The file is stored encrypted and linked to <strong style={{ fontWeight: 700, color: 'var(--fn-fg)' }}>Bilal Rauf</strong>.</>
          : <><strong style={{ fontWeight: 700, color: 'var(--fn-fg)' }}>Salary certificate · for HBL</strong> created · <span style={{ fontFamily: 'var(--fn-font-mono)' }}>SC-2026-0142</span> · emailed to Bilal.</>}
      </div>
      <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
        <Button size="md" iconRight={I.arrowR}>Open document</Button>
        <Button variant="secondary" size="md">
          {flow === 'upload' ? 'Upload another' : 'Generate another'}
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { UploadOrGenerateSheet });
