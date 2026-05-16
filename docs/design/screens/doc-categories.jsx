// Brief 12 — Document Categories settings
// Settings → Workflows & Automation → Document Categories

const DOC_CATS = {
  employee: [
    { id: 'sal-cert', name: 'Salary certificate', slug: 'salary_certificate', icon: I.card, hue: 175, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 143 },
    { id: 'exp-letter', name: 'Experience letter', slug: 'experience_letter', icon: I.flag, hue: 145, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 87 },
    { id: 'offer', name: 'Offer letter', slug: 'offer_letter', icon: I.send, hue: 280, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 84 },
    { id: 'contract', name: 'Employment contract', slug: 'employment_contract', icon: I.doc, hue: 245, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: true, active: true, docs: 84 },
    { id: 'cnic', name: 'CNIC', slug: 'cnic', icon: I.shield, hue: 22, system: true, vis: 'HR only', expiry: '120 months', ack: false, active: true, docs: 81 },
    { id: 'payslip', name: 'Payslip', slug: 'payslip', icon: I.card, hue: 175, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 1842 },
    { id: 'increment', name: 'Increment letter', slug: 'increment_letter', icon: I.arrowU, hue: 145, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: true, active: true, docs: 42 },
    { id: 'bonus', name: 'Bonus letter', slug: 'bonus_letter', icon: I.zap, hue: 65, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 18 },
    { id: 'probation', name: 'Probation confirmation', slug: 'probation_confirmation', icon: I.check, hue: 175, system: true, vis: 'HR + Employee + Manager', expiry: 'Indefinite', ack: true, active: true, docs: 24 },
    { id: 'promotion', name: 'Promotion letter', slug: 'promotion_letter', icon: I.arrowU, hue: 280, system: true, vis: 'HR + Employee + Manager', expiry: 'Indefinite', ack: true, active: true, docs: 9 },
    { id: 'medical', name: 'Medical certificate', slug: 'medical_certificate', icon: I.shield, hue: 22, system: true, vis: 'Restricted (HR only)', expiry: 'Indefinite', ack: false, active: true, docs: 11, restricted: true },
    { id: 'resign', name: 'Resignation letter', slug: 'resignation_letter', icon: I.flag, hue: 22, system: true, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 6 },
    { id: 'noc', name: 'NOC (No objection)', slug: 'noc', icon: I.check, hue: 200, system: true, vis: 'HR + Employee', expiry: '6 months', ack: false, active: true, docs: 14 },
    { id: 'vaccine', name: 'Vaccination card', slug: 'vaccination_card', icon: I.shield, hue: 145, system: false, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: true, docs: 38 },
    { id: 'training', name: 'Training certificate', slug: 'training_cert', icon: I.star, hue: 280, system: false, vis: 'Org-wide', expiry: 'Indefinite', ack: false, active: true, docs: 22 },
    { id: 'legacy-id', name: 'Legacy company ID', slug: 'legacy_id_card', icon: I.user, hue: 65, system: false, vis: 'HR + Employee', expiry: 'Indefinite', ack: false, active: false, docs: 12 },
  ],
  project: [
    { id: 'mou', name: 'MOU', slug: 'mou', icon: I.doc, hue: 280, system: true, vis: 'Project members', expiry: 'Indefinite', ack: false, active: true, docs: 14 },
    { id: 'sow', name: 'Statement of work', slug: 'sow', icon: I.briefcase, hue: 175, system: true, vis: 'Project members', expiry: 'Indefinite', ack: false, active: true, docs: 23 },
    { id: 'nda', name: 'NDA', slug: 'nda', icon: I.lock, hue: 22, system: true, vis: 'Project members', expiry: '36 months', ack: true, active: true, docs: 19 },
    { id: 'invoice', name: 'Invoice', slug: 'invoice', icon: I.card, hue: 145, system: true, vis: 'Finance + Project', expiry: 'Indefinite', ack: false, active: true, docs: 312 },
  ],
  organization: [
    { id: 'policy', name: 'Policy document', slug: 'policy', icon: I.shield, hue: 280, system: true, vis: 'Org-wide', expiry: 'Indefinite', ack: true, active: true, docs: 18 },
    { id: 'handbook', name: 'Employee handbook', slug: 'handbook', icon: I.doc, hue: 245, system: true, vis: 'Org-wide', expiry: 'Indefinite', ack: true, active: true, docs: 3 },
  ],
  vendor: [],
};

function DocCategoriesSettings({ tab = 'employee', editing = null, editingSystem = false }) {
  const list = DOC_CATS[tab];
  const tabs = [
    { id: 'employee', label: 'Employee', count: DOC_CATS.employee.length },
    { id: 'project', label: 'Project', count: DOC_CATS.project.length },
    { id: 'organization', label: 'Organization', count: DOC_CATS.organization.length },
    { id: 'vendor', label: 'Vendor', count: DOC_CATS.vendor.length },
  ];
  const editCat = editing
    ? Object.values(DOC_CATS).flat().find(c => c.id === editing)
    : null;

  return (
    <>
      <SettingsBreadcrumb section="Workflows & Automation" active="Document Categories" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Document categories
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640, lineHeight: 1.55 }}>
            Define categories for employees, projects, and the organization. Categories set defaults for visibility, expiry, and acknowledgment.
          </p>
        </div>
        <Button icon={I.plus}>Add category</Button>
      </div>

      {/* Entity-type tabs */}
      <Card padded={false}>
        <div style={{
          padding: '14px 22px 0', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex' }}>
            {tabs.map(t => <TabPill key={t.id} label={t.label} count={t.count} active={t.id === tab} />)}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
            <ToolbarPill icon={I.filter} small>Status</ToolbarPill>
            <ToolbarPill iconRight={I.chev} small>Sort: name</ToolbarPill>
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{ padding: '60px 28px' }}>
            <EmptyState
              icon={I.doc}
              title={`No ${tab} categories yet`}
              body="Categories define the kinds of documents this entity can have, plus their default visibility, expiry, and acknowledgment rules."
              primary={{ label: 'Add your first category', icon: I.plus }}
            />
          </div>
        ) : (
          <DocCategoryTable list={list} editingId={editing} />
        )}
      </Card>

      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.55,
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
        Changing default visibility, expiry, or acknowledgment on a category <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>only affects new documents</strong> — existing ones keep their values.
      </div>

      {editing && <DocCategorySheet cat={editCat} system={editingSystem} />}
    </>
  );
}

function DocCategoryTable({ list, editingId }) {
  return (
    <InsetTable
      padding={14}
      cols={[
        { label: '', width: 40 },
        { label: 'Category' },
        { label: 'Slug', width: 160 },
        { label: 'Default visibility', width: 200 },
        { label: 'Expiry', width: 110 },
        { label: 'Ack', width: 60 },
        { label: 'Status', width: 100 },
        { label: 'Documents', align: 'right', width: 110 },
        { label: '', width: 36 },
      ]}
    >
      <tbody>
        {list.map((c, i) => (
          <InsetRow key={c.id} bordered={i < list.length - 1} highlight={c.id === editingId ? 'var(--fn-accent-soft)' : undefined}>
            <InsetCell first>
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: `oklch(0.92 0.07 ${c.hue})`,
                color: `oklch(0.38 0.16 ${c.hue})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={c.icon} size={13} />
              </span>
            </InsetCell>
            <InsetCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{c.name}</span>
                {c.system && <Badge tone="outline">System</Badge>}
                {c.restricted && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '1px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                    background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
                  }}>
                    <Icon d={I.lock} size={9} /> Restricted
                  </span>
                )}
              </div>
            </InsetCell>
            <InsetCell>
              <span style={{ fontSize: 11.5, padding: '2px 7px', borderRadius: 4, background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{c.slug}</span>
            </InsetCell>
            <InsetCell>
              <Badge tone={c.vis.includes('Restricted') ? 'danger' : c.vis.includes('Org-wide') ? 'info' : 'neutral'}>{c.vis}</Badge>
            </InsetCell>
            <InsetCell>
              <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{c.expiry}</span>
            </InsetCell>
            <InsetCell>
              {c.ack ? (
                <span style={{
                  width: 22, height: 22, borderRadius: 99,
                  background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon d={I.check} size={11} stroke={2.5} />
                </span>
              ) : <span style={{ color: 'var(--fn-fg-faint)' }}>—</span>}
            </InsetCell>
            <InsetCell>
              <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? 'Active' : 'Inactive'}</Badge>
            </InsetCell>
            <InsetCell align="right">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>
                {c.docs} docs
              </span>
            </InsetCell>
            <InsetCell last>
              <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
            </InsetCell>
          </InsetRow>
        ))}
      </tbody>
    </InsetTable>
  );
}

function DocCategorySheet({ cat, system }) {
  if (!cat) return null;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 600, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: `oklch(0.92 0.07 ${cat.hue})`, color: `oklch(0.38 0.16 ${cat.hue})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={cat.icon} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Edit · {cat.name}</div>
              {system && <Badge tone="outline">System</Badge>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              {system
                ? 'System category — slug is locked, can be disabled but not deleted'
                : 'Changes only affect new documents · existing keep their values'}
            </div>
          </div>
          <Icon d={I.x} size={16} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          <LtSection title="Basics" icon={I.layers}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <SheetField label="Name">
                <Input defaultValue={cat.name} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Slug" hint={system ? 'Locked for system categories' : 'Auto-derived from name'}>
                <Input defaultValue={cat.slug} style={{ height: 38, fontFamily: 'var(--fn-font-mono)' }} suffix={
                  system ? <Icon d={I.lock} size={12} style={{ color: 'var(--fn-fg-faint)' }} /> : <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>auto</span>
                } />
              </SheetField>
            </div>
            <div style={{ height: 12 }} />
            <SheetField label="Description">
              <textarea
                rows={2}
                defaultValue="Issued to confirm an employee's salary for visa, bank loans, or rental applications."
                style={{
                  width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                  fontFamily: 'inherit', color: 'var(--fn-fg)', lineHeight: 1.5,
                  background: 'var(--fn-bg-panel)',
                  border: '1px solid var(--fn-border-strong)', borderRadius: 6, outline: 'none',
                }}
              />
            </SheetField>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Entity type" hint={system ? 'Locked' : 'Cannot change after creation'}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', height: 38,
                  background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)', borderRadius: 6,
                  color: 'var(--fn-fg-muted)',
                }}>
                  <Icon d={I.user} size={13} />
                  <span style={{ fontSize: 13 }}>Employee</span>
                  <div style={{ flex: 1 }} />
                  <Icon d={I.lock} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
                </div>
              </SheetField>
              <SheetField label="Color">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[22, 65, 145, 175, 200, 245, 280, 320].map(h => {
                    const active = h === cat.hue;
                    return (
                      <button key={h} style={{
                        width: 28, height: 28, padding: 0,
                        background: `oklch(0.55 0.16 ${h})`,
                        border: '2px solid ' + (active ? 'var(--fn-fg)' : 'var(--fn-bg-panel)'),
                        outline: active ? '1px solid var(--fn-accent)' : 'none', outlineOffset: 2,
                        borderRadius: 6, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <Icon d={I.check} size={12} stroke={3} style={{ color: '#fff' }} />}
                      </button>
                    );
                  })}
                </div>
              </SheetField>
            </div>
          </LtSection>

          <LtSection title="Defaults" icon={I.shield}>
            <SheetField label="Default visibility" hint="Who can see new documents in this category by default. Editable per-document.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <VisCard label="HR + Employee" sub="Standard for personal documents — payslips, contracts, letters" active />
                <VisCard label="HR + Employee + Manager" sub="Also visible to the employee's direct manager" />
                <VisCard label="Org-wide" sub="Anyone in the company can read" />
                <VisCard label="Restricted (HR only)" sub="Sensitive — medical, legal, family · access is audit-logged" />
              </div>
            </SheetField>
            <div style={{ height: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SheetField label="Default expiry" hint="Months until expiry · leave blank for indefinite">
                <Input defaultValue="—" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>months</span>} style={{ height: 38 }} />
              </SheetField>
              <SheetField label="Default retention" hint="How long after expiry before auto-archive">
                <Input defaultValue="—" suffix={<span style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>months</span>} style={{ height: 38 }} />
              </SheetField>
            </div>
            <div style={{ height: 12 }} />
            <ToggleRow label="Requires acknowledgment" hint="Recipient must explicitly acknowledge — policies, contracts, increment letters." on={cat.ack} />
          </LtSection>

          <LtSection title="Status" icon={I.check}>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-fg)' }}>Active</div>
                <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                  New documents can be created in this category.
                </div>
              </div>
              <Toggle on={cat.active} />
            </div>

            {cat.docs > 0 && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 6,
                background: 'var(--fn-warning-soft)',
                border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={13} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 2 }} />
                <span style={{ fontSize: 12, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 700 }}>{cat.docs} documents</strong> use this category. Disabling won't affect them — but no new documents can be created here.
                </span>
              </div>
            )}
          </LtSection>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {system ? (
              <>
                <Icon d={I.lock} size={11} />
                System category · cannot be deleted
              </>
            ) : (
              <>
                <Icon d={I.shield} size={11} />
                Changes audit-logged
              </>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm" icon={I.check}>Save changes</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function VisCard({ label, sub, active }) {
  return (
    <label style={{
      padding: '10px 12px', borderRadius: 6,
      background: active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
      border: '1.5px solid ' + (active ? 'color-mix(in oklch, var(--fn-accent) 35%, transparent)' : 'var(--fn-border-strong)'),
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 99, flexShrink: 0,
        border: '2px solid ' + (active ? 'var(--fn-accent)' : 'var(--fn-border-strong)'),
        background: active ? 'var(--fn-accent)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 3px var(--fn-bg-panel)' : 'none',
      }} />
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2 }}>{sub}</div>
      </div>
    </label>
  );
}

Object.assign(window, { DocCategoriesSettings });
