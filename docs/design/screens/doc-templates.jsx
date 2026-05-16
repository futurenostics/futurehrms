// Brief 13 — Document Templates list page

const DOC_TEMPLATES = {
  payslip: {
    name: 'Payslip', slug: 'payslip', hue: 175, icon: I.card,
    templates: [
      { id: 't-payslip-pkr', name: 'Monthly payslip · PKR', slug: 'payslip_pkr', engine: 'react', v: 'v3', updated: '12 May 2026', updatedAgo: '3 days ago', by: 'Eng team', byHue: 280, status: 'Active', docs: 1842 },
      { id: 't-payslip-usd', name: 'Monthly payslip · USD', slug: 'payslip_usd', engine: 'react', v: 'v2', updated: '01 Apr 2026', updatedAgo: '1 month ago', by: 'Eng team', byHue: 280, status: 'Active', docs: 412 },
    ],
  },
  salary_certificate: {
    name: 'Salary certificate', slug: 'salary_certificate', hue: 175, icon: I.shield,
    templates: [
      { id: 't-sc-bank', name: 'Salary certificate · for bank', slug: 'salary_cert_bank', engine: 'markdown', v: 'v3', updated: '08 May 2026', updatedAgo: '7 days ago', by: 'Asma Ali', byHue: 22, status: 'Active', docs: 87 },
      { id: 't-sc-visa', name: 'Salary certificate · for visa', slug: 'salary_cert_visa', engine: 'markdown', v: 'v1', updated: '02 May 2026', updatedAgo: '13 days ago', by: 'Asma Ali', byHue: 22, status: 'Draft', docs: 0, draft: true },
      { id: 't-sc-rental', name: 'Salary certificate · for rental', slug: 'salary_cert_rental', engine: 'markdown', v: 'v2', updated: '15 Apr 2026', updatedAgo: '1 month ago', by: 'Asma Ali', byHue: 22, status: 'Active', docs: 12 },
    ],
  },
  experience_letter: {
    name: 'Experience letter', slug: 'experience_letter', hue: 145, icon: I.flag,
    templates: [
      { id: 't-exp-std', name: 'Standard experience letter', slug: 'exp_letter_standard', engine: 'markdown', v: 'v4', updated: '20 Apr 2026', updatedAgo: '25 days ago', by: 'Asma Ali', byHue: 22, status: 'Active', docs: 87 },
      { id: 't-exp-relieving', name: 'Relieving + experience combined', slug: 'exp_letter_relieving', engine: 'markdown', v: 'v1', updated: '12 Mar 2026', updatedAgo: '2 months ago', by: 'Asma Ali', byHue: 22, status: 'Inactive', docs: 4 },
    ],
  },
  offer_letter: {
    name: 'Offer letter', slug: 'offer_letter', hue: 280, icon: I.send,
    templates: [
      { id: 't-offer-ft', name: 'Offer letter · full-time', slug: 'offer_letter_ft', engine: 'markdown', v: 'v5', updated: '05 May 2026', updatedAgo: '10 days ago', by: 'Asma Ali', byHue: 22, status: 'Active', docs: 84 },
      { id: 't-offer-contract', name: 'Offer letter · contractor', slug: 'offer_letter_contract', engine: 'markdown', v: 'v2', updated: '14 Apr 2026', updatedAgo: '1 month ago', by: 'Asma Ali', byHue: 22, status: 'Active', docs: 14 },
    ],
  },
  increment_letter: {
    name: 'Increment letter', slug: 'increment_letter', hue: 65, icon: I.arrowU,
    templates: [
      { id: 't-inc', name: 'Annual increment letter', slug: 'annual_increment', engine: 'react', v: 'v1', updated: '01 Apr 2026', updatedAgo: '1 month ago', by: 'Eng team', byHue: 280, status: 'Active', docs: 42 },
    ],
  },
};

function DocTemplatesList({ kebabOpen = null, emptyState = false, filterActive = false }) {
  const groups = emptyState
    ? { payslip: DOC_TEMPLATES.payslip, increment_letter: DOC_TEMPLATES.increment_letter }
    : DOC_TEMPLATES;

  return (
    <>
      <SettingsBreadcrumb section="Workflows & Automation" active="Document Templates" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Document templates
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 640, lineHeight: 1.55 }}>
            Templates produce documents from data. <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>System templates</strong> are code-based (designed by engineers). <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>Markdown templates</strong> can be edited here.
          </p>
        </div>
        <Button icon={I.plus}>Create Markdown template</Button>
      </div>

      {/* Filter bar */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Input icon={I.search} placeholder="Find by name or slug…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Category: All</ToolbarPill>
        <div style={{ display: 'flex', background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2, height: 32, alignItems: 'center' }}>
          {[
            { l: 'All', active: !filterActive },
            { l: 'React', active: false },
            { l: 'Markdown', active: filterActive },
          ].map(o => (
            <span key={o.l} style={{
              padding: '4px 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 4,
              background: o.active ? 'var(--fn-bg-panel)' : 'transparent',
              color: o.active ? 'var(--fn-fg)' : 'var(--fn-fg-faint)',
              boxShadow: o.active ? 'var(--fn-shadow-xs)' : 'none', cursor: 'pointer',
            }}>{o.l}</span>
          ))}
        </div>
        <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
        <div style={{ flex: 1 }} />
        {filterActive && (
          <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>Clear filters</span>
        )}
      </div>

      {filterActive && (
        <div style={{
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>Active:</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 4px 3px 10px',
            background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)',
            border: '1px solid color-mix(in oklch, var(--fn-accent) 25%, transparent)',
            borderRadius: 5, fontSize: 11.5, fontWeight: 500,
          }}>
            Engine: Markdown
            <Icon d={I.x} size={11} style={{ opacity: 0.7, cursor: 'pointer', marginLeft: 2, marginRight: 2 }} />
          </span>
        </div>
      )}

      {/* Grouped list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.values(groups).map(g => (
          <Card key={g.slug} padded={false}>
            <div style={{
              padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid var(--fn-divider)',
            }}>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)', transform: 'rotate(180deg)' }} />
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: `oklch(0.92 0.07 ${g.hue})`,
                color: `oklch(0.38 0.16 ${g.hue})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={g.icon} size={13} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)' }}>{g.name}</span>
              <Badge tone="neutral">{g.templates.length}</Badge>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>+ New template for this category</span>
            </div>

            {g.templates.map((t, i) => (
              <div key={t.id} style={{
                padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 16,
                borderBottom: i < g.templates.length - 1 ? '1px solid var(--fn-divider)' : 'none',
                background: kebabOpen === t.id ? 'var(--fn-bg-subtle)' : 'transparent',
                position: 'relative',
              }}>
                {/* Engine badge */}
                <EngineBadge engine={t.engine} />

                {/* Name + slug */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{t.name}</span>
                    {t.engine === 'react' && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--fn-bg-inset)', color: 'var(--fn-fg-faint)',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        <Icon d={I.lock} size={9} /> Code-owned
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)', marginTop: 2, fontFamily: 'var(--fn-font-mono)' }}>{t.slug}</div>
                </div>

                {/* Version chip */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
                  background: 'var(--fn-bg-subtle)',
                  border: '1px solid var(--fn-border)',
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--fn-font-mono)',
                  color: 'var(--fn-fg)',
                }}>
                  {t.v}
                  <Icon d={I.chev} size={9} style={{ color: 'var(--fn-fg-faint)' }} />
                </span>

                {/* Updated */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 180, flexShrink: 0 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 99,
                    background: `oklch(0.92 0.07 ${t.byHue})`,
                    color: `oklch(0.38 0.16 ${t.byHue})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9.5, fontWeight: 700,
                  }}>
                    {t.by.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--fn-fg)', fontWeight: 500 }}>{t.by}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{t.updatedAgo}</div>
                  </div>
                </div>

                {/* Status */}
                <div style={{ width: 90 }}>
                  <Badge tone={t.status === 'Active' ? 'success' : t.draft ? 'warning' : 'neutral'} dot>
                    {t.status}
                  </Badge>
                </div>

                {/* Docs count */}
                <div style={{ width: 110, textAlign: 'right' }}>
                  <span style={{
                    fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)',
                  }}>
                    {t.docs === 0 ? <span style={{ color: 'var(--fn-fg-faint)' }}>not used yet</span> : `${t.docs} generated`}
                  </span>
                </div>

                {/* Kebab */}
                <Icon d={I.more} size={16} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer', flexShrink: 0 }} />

                {kebabOpen === t.id && <ActionKebab engine={t.engine} status={t.status} />}
              </div>
            ))}
          </Card>
        ))}

        {emptyState && (
          <Card padded={false}>
            <div style={{ padding: '60px 28px' }}>
              <EmptyState
                icon={I.doc}
                title="No Markdown templates yet"
                body="System templates (payslips, increment letters) live in code. Create Markdown templates for letters HR will author and edit — salary certificates, offer letters, experience letters."
                primary={{ label: 'Create your first Markdown template', icon: I.plus }}
                secondary={{ label: 'Browse system templates', icon: I.eye }}
                helpers={
                  <span>
                    <strong style={{ fontWeight: 600 }}>Tip:</strong> Start with the seeded category that closest matches your letter — categories cascade visibility, expiry, and acknowledgment defaults.
                  </span>
                }
              />
            </div>
          </Card>
        )}
      </div>

      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.55,
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
        Disabling a template prevents <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>new</strong> document generation. Existing documents reference their frozen version and remain accessible.
      </div>
    </>
  );
}

function EngineBadge({ engine }) {
  if (engine === 'react') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 5, flexShrink: 0,
        background: 'oklch(0.95 0.04 245)',
        color: 'oklch(0.40 0.13 245)',
        border: '1px solid color-mix(in oklch, oklch(0.55 0.16 245) 25%, transparent)',
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em', fontFamily: 'var(--fn-font-mono)',
      }}>
        <Icon d="M16 18l6-6-6-6M8 6l-6 6 6 6" size={10} stroke={2.5} />
        REACT
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 5, flexShrink: 0,
      background: 'oklch(0.95 0.05 65)',
      color: 'oklch(0.44 0.10 70)',
      border: '1px solid color-mix(in oklch, oklch(0.55 0.16 65) 30%, transparent)',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em', fontFamily: 'var(--fn-font-mono)',
    }}>
      <Icon d={I.edit} size={10} stroke={2.5} />
      MARKDOWN
    </span>
  );
}

function ActionKebab({ engine, status }) {
  const items = engine === 'react'
    ? [
        { icon: I.eye, label: 'View definition', hint: 'React templates are code-based and edited by engineers' },
        { icon: I.zap, label: 'Test generation' },
        { icon: I.clock, label: 'Version history' },
        { divider: true },
        { icon: I.lock, label: 'Disable', danger: true, disabled: status !== 'Active' },
      ]
    : [
        { icon: I.edit, label: 'Edit' },
        { icon: I.zap, label: 'Test generation' },
        { icon: I.layers, label: 'Duplicate' },
        { icon: I.clock, label: 'Version history' },
        { divider: true },
        { icon: I.lock, label: 'Disable', danger: true, disabled: status !== 'Active' },
      ];
  return (
    <div style={{
      position: 'absolute', top: 50, right: 22, zIndex: 30, width: 240,
      background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)',
      borderRadius: 8, boxShadow: '0 16px 36px -8px rgba(15, 17, 23, 0.20), 0 6px 12px -4px rgba(15, 17, 23, 0.10)',
      padding: 4,
    }}>
      {items.map((item, i) => {
        if (item.divider) return <div key={i} style={{ height: 1, background: 'var(--fn-divider)', margin: '4px 6px' }} />;
        return (
          <div key={item.label} style={{
            padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10,
            borderRadius: 5, cursor: item.disabled ? 'not-allowed' : 'pointer',
            opacity: item.disabled ? 0.45 : 1,
            color: item.danger ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg)',
            background: 'transparent',
          }}>
            <Icon d={item.icon} size={13} style={{ color: item.danger ? 'var(--fn-danger-soft-fg)' : 'var(--fn-fg-muted)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.label}</div>
              {item.hint && (
                <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)', marginTop: 1, lineHeight: 1.4 }}>{item.hint}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { DocTemplatesList });
