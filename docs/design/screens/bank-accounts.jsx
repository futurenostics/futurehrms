// Brief 7 — Bank Accounts admin page

const BANKS = {
  hbl: { name: 'HBL', hue: 145 },
  ubl: { name: 'UBL', hue: 22 },
  meezan: { name: 'Meezan Bank', hue: 145 },
  scb: { name: 'Standard Chartered', hue: 200 },
  faysal: { name: 'Faysal Bank', hue: 280 },
};

const BANK_ACCOUNTS = [
  { eid: 'EMP-0042', name: 'Bilal Rauf', role: 'Sr. Engineer', hue: 280, bank: 'hbl', title: 'Bilal Rauf', last4: '4218', iban: '****8821', verified: '12 Aug 2023', active: true, updated: '2 mo ago', revealed: false },
  { eid: 'EMP-0019', name: 'Sana Lateef', role: 'BD Lead', hue: 175, bank: 'ubl', title: 'Sana Lateef', last4: '9047', iban: '****3104', verified: '07 Sep 2022', active: true, updated: '6 mo ago', revealed: false },
  { eid: 'EMP-0055', name: 'Omar Sheikh', role: 'Sr. Engineer', hue: 175, bank: 'meezan', title: 'M. Omar Sheikh', last4: '1623', iban: '****5571', verified: '26 May 2023', active: true, updated: '14 mo ago', revealed: false },
  { eid: 'EMP-0033', name: 'Talha Mansoor', role: 'BD Manager', hue: 65, bank: 'scb', title: 'Talha Mansoor', last4: '7890', iban: '****0042', verified: 'Pending', active: true, updated: '3 days ago', pending: true, revealed: false },
  { eid: 'EMP-0061', name: 'Maira Khan', role: 'BD Associate', hue: 145, bank: 'hbl', title: 'Maira Khan', last4: '5512', iban: '****7748', verified: '03 Feb 2024', active: true, updated: '1 mo ago', revealed: false },
  { eid: 'EMP-0073', name: 'Hassan Tariq', role: 'Engineer', hue: 22, bank: 'faysal', title: 'Hassan Tariq', last4: '0934', iban: '****2210', verified: 'Pending', active: true, updated: '8 days ago', pending: true, revealed: false },
  { eid: 'EMP-0014', name: 'Daniyal Ahmed', role: 'Ops Lead', hue: 280, bank: null, title: null, last4: null, iban: null, verified: null, active: false, updated: null, missing: true },
  { eid: 'EMP-0067', name: 'Faraz Iqbal', role: 'Engineer', hue: 200, bank: 'ubl', title: 'Faraz Iqbal', last4: '6601', iban: '****8893', verified: '11 Nov 2023', active: true, updated: '7 mo ago', revealed: true },
];

function BankAccountsAdmin({ addOpen = false, verifyOpen = false }) {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Bank accounts
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)', maxWidth: 620 }}>
            Employee bank accounts used for PKR salary disbursement. Account numbers are encrypted at rest — every full-number view is audit-logged.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.upload}>Import</ToolbarPill>
          <Button icon={I.plus}>Add account</Button>
        </div>
      </div>

      {/* Missing-accounts banner */}
      <div style={{
        marginBottom: 14, padding: '12px 14px', borderRadius: 8,
        background: 'var(--fn-warning-soft)',
        border: '1px solid color-mix(in oklch, var(--fn-warning) 28%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Icon
          d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          size={16} stroke={2} style={{ color: 'var(--fn-warning-soft-fg)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
          <strong style={{ fontWeight: 700 }}>2 employees don't have bank accounts on file.</strong> They can't be included in the next payroll run until a verified account is added.
        </div>
        <Button variant="secondary" size="sm" iconRight={I.arrowR}>View missing</Button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <KPI icon={I.check} label="Verified accounts" value="78" sub="of 84 employees" deltaTone="success" info={false} />
        <KPI icon={I.clock} label="Pending verification" value="4" sub="awaiting HR check" deltaTone="warning" info={false} />
        <KPI icon={I.card} label="Missing accounts" value="2" sub="blocks payroll run" deltaTone="danger" info={false} />
        <KPI icon={I.lock} label="Inactive" value="0" sub="manually disabled" info={false} />
      </div>

      {/* Filter bar */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', background: 'var(--fn-bg-panel)',
        border: '1px solid var(--fn-border)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Input icon={I.search} placeholder="Find by employee, EID, bank…" style={{ height: 32, flex: 1, maxWidth: 280 }} />
        <ToolbarPill iconRight={I.chev} small>Status: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Bank: All</ToolbarPill>
        <ToolbarPill iconRight={I.chev} small>Verification: All</ToolbarPill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fn-fg-faint)' }}>{BANK_ACCOUNTS.length} of 84 employees</span>
      </div>

      {/* Reveal toast (for revealed row) */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', borderRadius: 8,
        background: 'oklch(0.97 0.02 280)',
        border: '1px solid color-mix(in oklch, var(--fn-accent) 35%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--fn-accent-soft)', color: 'var(--fn-accent-soft-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon d={I.eye} size={14} />
        </span>
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fn-accent-soft-fg)' }}>
          Revealing <strong style={{ fontWeight: 700, color: 'var(--fn-fg)' }}>Faraz Iqbal's</strong> account number — auto-masks in <span style={{ fontFamily: 'var(--fn-font-mono)', fontWeight: 700, color: 'var(--fn-fg)' }}>7s</span>. Logged in audit as <span style={{ fontFamily: 'var(--fn-font-mono)' }}>bank.account.viewed</span>.
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>Mask now</span>
      </div>

      {/* Table */}
      <Card padded={false}>
        <InsetTable
          padding={14}
          cols={[
            { label: 'Employee' },
            { label: 'Bank', width: 170 },
            { label: 'Account title', width: 160 },
            { label: 'Account number', width: 170 },
            { label: 'IBAN', width: 130 },
            { label: 'Verification', width: 140 },
            { label: 'Updated', width: 110 },
            { label: '', width: 110 },
          ]}
        >
          <tbody>
            {BANK_ACCOUNTS.map((a, i) => {
              if (a.missing) {
                return (
                  <InsetRow key={i} bordered={i < BANK_ACCOUNTS.length - 1} highlight="var(--fn-warning-soft)">
                    <InsetCell first>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: `oklch(0.92 0.07 ${a.hue})`,
                          color: `oklch(0.38 0.16 ${a.hue})`,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {a.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </span>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{a.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{a.role} · {a.eid}</div>
                        </div>
                      </div>
                    </InsetCell>
                    <InsetCell colSpan={6}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        fontSize: 12, color: 'var(--fn-warning-soft-fg)', fontStyle: 'italic',
                      }}>
                        <Icon
                          d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                          size={12} stroke={2}
                        />
                        No bank account on file — can't be paid via PKR payroll
                      </span>
                    </InsetCell>
                    <InsetCell last align="right">
                      <Button variant="secondary" size="sm" icon={I.plus} style={{ height: 26 }}>Add account</Button>
                    </InsetCell>
                  </InsetRow>
                );
              }
              const bank = BANKS[a.bank];
              return (
                <InsetRow
                  key={i}
                  bordered={i < BANK_ACCOUNTS.length - 1}
                  highlight={a.revealed ? 'oklch(0.97 0.02 280)' : undefined}
                >
                  <InsetCell first>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: `oklch(0.92 0.07 ${a.hue})`,
                        color: `oklch(0.38 0.16 ${a.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {a.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-fg)' }}>{a.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--fn-fg-faint)' }}>{a.role} · {a.eid}</div>
                      </div>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: `oklch(0.92 0.07 ${bank.hue})`,
                        color: `oklch(0.38 0.16 ${bank.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                      }}>
                        {bank.name.replace(/[a-z\s]/g, '').slice(0, 3) || bank.name.slice(0, 3)}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fn-fg)' }}>{bank.name}</span>
                    </div>
                  </InsetCell>
                  <InsetCell>
                    <span style={{ fontSize: 12.5, color: 'var(--fn-fg)' }}>{a.title}</span>
                  </InsetCell>
                  <InsetCell>
                    {a.revealed ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--fn-font-mono)', fontSize: 12.5, fontWeight: 600,
                          color: 'var(--fn-fg)',
                          padding: '2px 8px', borderRadius: 4,
                          background: 'var(--fn-accent-soft)',
                          border: '1px solid color-mix(in oklch, var(--fn-accent) 35%, transparent)',
                          letterSpacing: '0.02em',
                        }}>
                          0102-1098-{a.last4}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--fn-accent-soft-fg)', fontFamily: 'var(--fn-font-mono)', fontWeight: 600 }}>7s</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--fn-font-mono)', fontSize: 12.5,
                          color: 'var(--fn-fg-muted)', letterSpacing: '0.05em',
                        }}>
                          •••• •••• {a.last4}
                        </span>
                        <span style={{
                          fontSize: 11, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          <Icon d={I.eye} size={11} /> Show
                        </span>
                      </span>
                    )}
                  </InsetCell>
                  <InsetCell>
                    <span style={{
                      fontFamily: 'var(--fn-font-mono)', fontSize: 12,
                      color: 'var(--fn-fg-muted)', letterSpacing: '0.04em',
                    }}>{a.iban}</span>
                  </InsetCell>
                  <InsetCell>
                    {a.pending ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Badge tone="warning" dot>Pending</Badge>
                        <span style={{ fontSize: 11, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer', fontWeight: 600 }}>Verify</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 99,
                          background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon d={I.check} size={10} stroke={3} />
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>{a.verified}</span>
                      </span>
                    )}
                  </InsetCell>
                  <InsetCell>
                    <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>{a.updated}</span>
                  </InsetCell>
                  <InsetCell last align="right">
                    <Icon d={I.more} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                  </InsetCell>
                </InsetRow>
              );
            })}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'var(--fn-bg-panel)', border: '1px dashed var(--fn-border-strong)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11.5, color: 'var(--fn-fg-muted)', lineHeight: 1.5,
      }}>
        <Icon d={I.shield} size={13} style={{ color: 'var(--fn-fg-faint)', flexShrink: 0 }} />
        <span>
          Account numbers and IBANs are encrypted at rest with <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>AES-256-GCM</span>. The UI never bulk-exports raw numbers — every reveal is logged with timestamp, user, and IP.
        </span>
      </div>

      {addOpen && <AddAccountSheet />}
      {verifyOpen && <VerifyModal />}
    </>
  );
}

function AddAccountSheet() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.40)', zIndex: 50,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 540, zIndex: 51,
        background: 'var(--fn-bg-panel)',
        boxShadow: '-30px 0 60px -20px rgba(15, 17, 23, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon d={I.card} size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fn-fg)' }}>Add bank account</div>
            <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
              The account will be created in pending status — verify it separately before the next payroll.
            </div>
          </div>
          <Icon d={I.x} size={15} style={{ color: 'var(--fn-fg-muted)', cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <SheetField label="Employee">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.16 280)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
              }}>DA</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Daniyal Ahmed</div>
                <div style={{ fontSize: 11, color: 'var(--fn-fg-faint)' }}>Ops Lead · EMP-0014</div>
              </div>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Bank">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', height: 42,
              background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border-strong)', borderRadius: 6,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'oklch(0.92 0.07 145)', color: 'oklch(0.38 0.16 145)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
              }}>HBL</span>
              <span style={{ fontSize: 13, flex: 1 }}>Habib Bank Limited (HBL)</span>
              <Icon d={I.chev} size={13} style={{ color: 'var(--fn-fg-faint)' }} />
            </div>
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Account title" hint="Must match the name on the actual bank account exactly.">
            <Input placeholder="As printed on bank statement" style={{ height: 40 }} />
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField
            label="Account number"
            hint={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon d={I.lock} size={11} style={{ color: 'var(--fn-fg-faint)' }} />
                Stored encrypted (AES-256-GCM). Masked everywhere except this field while you type.
              </span>
            }
          >
            <Input
              type="password"
              placeholder="•••• •••• ••••"
              style={{ height: 40, fontFamily: 'var(--fn-font-mono)', fontSize: 13, letterSpacing: '0.05em' }}
              suffix={<Icon d={I.eye} size={13} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />}
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5, color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: '1.5px solid var(--fn-border-strong)', background: 'var(--fn-bg-panel)',
                display: 'inline-block',
              }} />
              Show while typing
            </label>
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="IBAN" hint="Optional but recommended — required by some banks for bulk transfers.">
            <Input
              type="password"
              placeholder="PK•• •••• •••• •••• •••• ••••"
              style={{ height: 40, fontFamily: 'var(--fn-font-mono)', fontSize: 13, letterSpacing: '0.05em' }}
              suffix={<Icon d={I.eye} size={13} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />}
            />
          </SheetField>

          <div style={{ height: 14 }} />

          <SheetField label="Branch code">
            <Input placeholder="e.g. 0102" style={{ height: 40, fontFamily: 'var(--fn-font-mono)', letterSpacing: '0.04em' }} />
          </SheetField>

          <div style={{
            marginTop: 18, padding: '12px 14px', borderRadius: 8,
            background: 'var(--fn-warning-soft)',
            border: '1px solid color-mix(in oklch, var(--fn-warning) 25%, transparent)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Icon
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              size={14} stroke={2}
              style={{ color: 'var(--fn-warning-soft-fg)', marginTop: 1, flexShrink: 0 }}
            />
            <span style={{ fontSize: 11.5, color: 'var(--fn-warning-soft-fg)', lineHeight: 1.5 }}>
              Adding an account does <strong style={{ fontWeight: 700 }}>not</strong> verify it. HR Admin must verify against a source document (CNIC, contract, bank letter) before the account can be used in a payroll run.
            </span>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--fn-divider)',
          background: 'var(--fn-bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.check}>Save · pending verification</Button>
        </div>
      </div>
    </>
  );
}

function VerifyModal() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 16, 38, 0.45)', zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51,
        width: 460, background: 'var(--fn-bg-panel)',
        borderRadius: 12, boxShadow: '0 30px 60px -20px rgba(15, 17, 23, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--fn-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--fn-success-soft)', color: 'var(--fn-success-soft-fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.shield} size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Verify bank account</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 2 }}>Talha Mansoor · Standard Chartered ····7890</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 13, color: 'var(--fn-fg-muted)', lineHeight: 1.55, marginBottom: 14 }}>
            Confirm you've matched the account details against a source document for this employee. This action is audit-logged.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Matched CNIC card scan in employee profile', checked: true },
              { l: 'Account title matches employee\'s legal name', checked: true },
              { l: 'Saw a bank letter or statement', checked: false },
            ].map((c, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 6,
                background: c.checked ? 'var(--fn-success-soft)' : 'var(--fn-bg-subtle)',
                border: '1px solid ' + (c.checked ? 'color-mix(in oklch, var(--fn-success) 25%, transparent)' : 'var(--fn-border)'),
                cursor: 'pointer',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: c.checked ? 'var(--fn-success)' : 'var(--fn-bg-panel)',
                  border: '1.5px solid ' + (c.checked ? 'var(--fn-success)' : 'var(--fn-border-strong)'),
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {c.checked && <Icon d={I.check} size={11} stroke={3} style={{ color: '#fff' }} />}
                </span>
                <span style={{
                  fontSize: 12.5, color: c.checked ? 'var(--fn-success-soft-fg)' : 'var(--fn-fg-muted)',
                  fontWeight: c.checked ? 500 : 400,
                }}>{c.l}</span>
              </label>
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 6,
            background: 'var(--fn-bg-subtle)', border: '1px solid var(--fn-border)',
            fontSize: 11.5, color: 'var(--fn-fg-muted)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon d={I.shield} size={11} />
            Logged as <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg)' }}>bank.account.verified</span> by Asma Ali · 15 May 2026 14:32 PKT
          </div>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--fn-divider)', background: 'var(--fn-bg-subtle)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm" icon={I.check}>Mark as verified</Button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { BankAccountsAdmin });
