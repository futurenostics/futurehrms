// Employees List — directory of all employees
function EmployeesList({ currency = 'USD' }) {
  const employees = [
  { eid: 'EMP-0042', name: 'Bilal Rauf', email: 'bilal.r@futurenostics.com', dept: 'Engineering', desig: 'Sr. Engineer', status: 'Permanent', join: '12 Aug 2023', sal: 285000, contract: 'Full-time', payoneer: true, hue: 280 },
  { eid: 'EMP-0061', name: 'Maira Khan', email: 'maira.k@futurenostics.com', dept: 'Business Dev', desig: 'BD Associate', status: 'Permanent', join: '03 Feb 2024', sal: 195000, contract: 'Full-time', payoneer: true, hue: 145 },
  { eid: 'EMP-0073', name: 'Hassan Tariq', email: 'hassan.t@futurenostics.com', dept: 'Engineering', desig: 'Engineer', status: 'Probation', join: '18 Feb 2026', sal: 165000, contract: 'Full-time', payoneer: false, hue: 22 },
  { eid: 'EMP-0028', name: 'Asma Ali', email: 'asma.a@futurenostics.com', dept: 'HR & People', desig: 'HR Admin', status: 'Permanent', join: '01 Jun 2022', sal: 245000, contract: 'Full-time', payoneer: false, hue: 245 },
  { eid: 'EMP-0055', name: 'Omar Sheikh', email: 'omar.s@futurenostics.com', dept: 'Engineering', desig: 'Sr. Engineer', status: 'Permanent', join: '26 May 2023', sal: 295000, contract: 'Full-time', payoneer: true, hue: 175 },
  { eid: 'EMP-0082', name: 'Zoya Pervez', email: 'zoya.p@futurenostics.com', dept: 'Operations', desig: 'Ops Intern', status: 'Intern', join: '24 Feb 2026', sal: 45000, contract: 'Intern', payoneer: false, hue: 320 },
  { eid: 'EMP-0033', name: 'Talha Mansoor', email: 'talha.m@futurenostics.com', dept: 'Business Dev', desig: 'BD Manager', status: 'Permanent', join: '15 Mar 2023', sal: 320000, contract: 'Full-time', payoneer: true, hue: 200 },
  { eid: 'EMP-0019', name: 'Sana Lateef', email: 'sana.l@futurenostics.com', dept: 'Business Dev', desig: 'BD Lead', status: 'Permanent', join: '07 Sep 2022', sal: 265000, contract: 'Full-time', payoneer: true, hue: 65 },
  { eid: 'EMP-0067', name: 'Faraz Iqbal', email: 'faraz.i@futurenostics.com', dept: 'Engineering', desig: 'Engineer', status: 'Permanent', join: '11 Nov 2023', sal: 215000, contract: 'Full-time', payoneer: false, hue: 280 },
  { eid: 'EMP-0049', name: 'Ayesha Imran', email: 'ayesha.i@futurenostics.com', dept: 'HR & People', desig: 'HR Coordinator', status: 'Probation', join: '27 Feb 2026', sal: 145000, contract: 'Full-time', payoneer: false, hue: 22 },
  { eid: 'EMP-0014', name: 'Daniyal Ahmed', email: 'daniyal.a@futurenostics.com', dept: 'Operations', desig: 'Ops Lead', status: 'Permanent', join: '04 Apr 2022', sal: 235000, contract: 'Full-time', payoneer: false, hue: 145 },
  { eid: 'EMP-0078', name: 'Rabia Nasir', email: 'rabia.n@futurenostics.com', dept: 'Engineering', desig: 'Engineer', status: 'Contractor', join: '01 Jan 2026', sal: 200000, contract: 'Contractor', payoneer: true, hue: 175 }];

  const statusTone = {
    Permanent: 'success', Probation: 'warning', Intern: 'info', Contractor: 'accent', 'On Leave': 'neutral', Terminated: 'danger'
  };

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Employees
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)' }}>
            84 people across 4 departments. Manage profiles, salaries, and lifecycle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToolbarPill icon={I.upload}>Import CSV</ToolbarPill>
          <ToolbarPill icon={I.download}>Export</ToolbarPill>
          <Button icon={I.plus}>New employee</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPI icon={I.users} label="Total headcount" value="84" delta="7.2%" deltaTrend="up" />
        <KPI icon={I.user} label="New this month" value="6" delta="50%" deltaTrend="up" />
        <KPI icon={I.clock} label="On probation" value="7" delta="2 close this wk" deltaTone="warning" deltaTrend="up" />
        <KPI icon={I.clock} label="Avg tenure" value="2.4y" delta="49% > 3y" deltaTone="success" deltaTrend="up" />
      </div>

      {/* Table card */}
      <Card padded={false}>
        {/* Toolbar */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--fn-divider)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, maxWidth: 340 }}>
            <Input icon={I.search} placeholder="Search by name, email, EID…" />
          </div>
          <div style={{ height: 24, borderLeft: '1px solid var(--fn-divider)', margin: '0 4px' }} />
          {[
          { l: 'Department', v: 'Engineering', active: true },
          { l: 'Status', v: 'Probation', active: true },
          { l: 'Contract', v: 'All' },
          ].map((f) =>
            <button key={f.l} style={{
              height: 34, padding: '0 12px', fontSize: 13, fontWeight: 500,
              color: f.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-muted)',
              background: f.active ? 'var(--fn-accent-soft)' : 'var(--fn-bg-panel)',
              border: '1px solid ' + (f.active ? 'color-mix(in oklch, var(--fn-accent) 30%, transparent)' : 'var(--fn-border-strong)'),
              borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ color: f.active ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg-faint)', fontWeight: 500 }}>{f.l}</span>
              <span>{f.v}</span>
              <Icon d={I.chev} size={12} />
            </button>
          )}
          <span style={{ fontSize: 12.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>
            Clear (2)
          </span>

          <div style={{ flex: 1 }} />
          <ToolbarPill icon={I.filter} small>More filters</ToolbarPill>
          {/* View toggle */}
          <div style={{
            display: 'flex', background: 'var(--fn-bg-subtle)',
            border: '1px solid var(--fn-border-strong)', borderRadius: 6, padding: 2,
          }}>
            <span style={{
              padding: '5px 9px', background: 'var(--fn-bg-panel)', borderRadius: 4,
              boxShadow: 'var(--fn-shadow-xs)', color: 'var(--fn-fg)',
              display: 'inline-flex', alignItems: 'center',
            }}>
              <Icon d={I.list} size={14} />
            </span>
            <span style={{ padding: '5px 9px', color: 'var(--fn-fg-faint)', display: 'inline-flex', alignItems: 'center' }}>
              <Icon d={I.layers} size={14} />
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '8px 14px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 48 }} />
              <col />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={9} style={{ padding: 0 }}>
                  <div style={{ background: 'var(--fn-bg-subtle)', borderRadius: 8, marginTop: 4 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: 48 }} />
                        <col />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 110 }} />
                        <col style={{ width: 36 }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td style={{ padding: '12px 0 12px 18px' }}>
                            <CheckSquare />
                          </td>
                          <ThCol>Employee</ThCol>
                          <ThCol>EID</ThCol>
                          <ThCol>Department</ThCol>
                          <ThCol>Designation</ThCol>
                          <ThCol>Status</ThCol>
                          <ThCol sortable>Join date</ThCol>
                          <ThCol align="right">Salary / mo</ThCol>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) =>
                <tr key={e.eid}>
                  <Td first><CheckSquare /></Td>
                  <Td bordered={i < employees.length - 1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: `oklch(0.92 0.07 ${e.hue})`, color: `oklch(0.38 0.15 ${e.hue})`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.02em',
                      }}>
                        {e.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>{e.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)' }}>
                          {e.email}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td bordered={i < employees.length - 1}>
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 12, color: 'var(--fn-fg-muted)' }}>{e.eid}</span>
                  </Td>
                  <Td bordered={i < employees.length - 1}>
                    <span style={{ color: 'var(--fn-fg-muted)' }}>{e.dept}</span>
                  </Td>
                  <Td bordered={i < employees.length - 1}>
                    <span style={{ color: 'var(--fn-fg-muted)' }}>{e.desig}</span>
                  </Td>
                  <Td bordered={i < employees.length - 1}>
                    <Badge tone={statusTone[e.status]} dot>{e.status}</Badge>
                  </Td>
                  <Td bordered={i < employees.length - 1}>
                    <span style={{ color: 'var(--fn-fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{e.join}</span>
                  </Td>
                  <Td bordered={i < employees.length - 1} align="right">
                    <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', fontWeight: 500 }}>
                      {currency === 'USD'
                        ? fmtUSD(e.sal / 278.5)
                        : new Intl.NumberFormat('en-PK').format(e.sal)}
                    </span>
                    {e.payoneer && (
                      <div style={{ fontSize: 10.5, color: 'var(--fn-success-soft-fg)', marginTop: 2, fontWeight: 500 }}>
                        Payoneer linked
                      </div>
                    )}
                  </Td>
                  <Td bordered={i < employees.length - 1} last>
                    <Icon d={I.more} size={16} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--fn-divider)', fontSize: 13, color: 'var(--fn-fg-muted)',
        }}>
          <div>Showing <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>1–{employees.length}</strong> of 84</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button style={pageBtnStyle(false)}>
              <Icon d={I.chevL} size={13} /> Prev
            </button>
            {['1', '2', '3', '…', '7'].map((p, i) =>
              <span key={i} style={pageNumStyle(p === '1')}>{p}</span>
            )}
            <button style={pageBtnStyle(false)}>
              Next <Icon d={I.chevR} size={13} />
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

function ThCol({ children, align = 'left', sortable }) {
  return (
    <td style={{
      textAlign: align, padding: '12px 12px',
      fontWeight: 500, fontSize: 11, color: 'var(--fn-fg-muted)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {children}
        {sortable && <Icon d={I.arrowD} size={11} style={{ opacity: 0.6 }} />}
      </span>
    </td>
  );
}

function Td({ children, bordered, align = 'left', first, last }) {
  return (
    <td style={{
      padding: first ? '12px 0 12px 18px' : last ? '12px 14px 12px 4px' : '12px 12px',
      textAlign: align,
      borderBottom: bordered ? '1px solid var(--fn-divider)' : 'none',
      verticalAlign: 'middle',
    }}>
      {children}
    </td>
  );
}

function pageBtnStyle() {
  return {
    height: 30, padding: '0 10px', fontSize: 12.5, fontWeight: 500,
    color: 'var(--fn-fg-muted)', background: 'transparent', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  };
}

function pageNumStyle(active) {
  return {
    width: 30, height: 30, fontSize: 12.5,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
    background: active ? 'var(--fn-accent)' : 'transparent',
    color: active ? 'var(--fn-accent-fg)' : 'var(--fn-fg-muted)',
    fontWeight: active ? 600 : 500, cursor: 'pointer',
  };
}

// CSV Import wizard — friendly preview step
function CSVImport() {
  const ready = [
    { row: 1, name: 'Hira Aslam', email: 'hira.a@futurenostics.com', dept: 'Engineering', desig: 'Engineer', sal: 185000 },
    { row: 2, name: 'Awais Mahmood', email: 'awais.m@futurenostics.com', dept: 'Business Dev', desig: 'BD Associate', sal: 175000 },
    { row: 4, name: 'Imran Aziz', email: 'imran.a@futurenostics.com', dept: 'Operations', desig: 'Ops Coord', sal: 165000 },
    { row: 6, name: 'Komal Rashid', email: 'komal.r@futurenostics.com', dept: 'Engineering', desig: 'Engineer', sal: 175000 },
    { row: 7, name: 'Yousef Khan', email: 'yousef.k@futurenostics.com', dept: 'Business Dev', desig: 'BD Lead', sal: 235000 },
  ];

  const errors = [
    {
      row: 3, name: 'Saba Iqbal', email: 'saba.i@futurenostics.com',
      fields: [
        { col: 'Designation', value: 'Engr.', issue: 'Not in your list', suggestion: 'Engineer', resolved: false },
        { col: 'Salary PKR', value: 'NaN', issue: 'Not a number', suggestion: null, resolved: false },
      ],
    },
    {
      row: 5, name: 'Ayesha K.', email: 'asma.a@futurenostics.com',
      fields: [
        { col: 'Email', value: 'asma.a@futurenostics.com', issue: 'Already exists', existing: 'EMP-0028 · Asma Ali', suggestion: null, resolved: false },
      ],
    },
  ];

  return (
    <>
      {/* Lightweight header — one line, no stepper boxes */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fn-fg-muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>← Back to employees</span>
            <span style={{ color: 'var(--fn-fg-faint)' }}>·</span>
            <span>Step 3 of 4</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fn-fg)' }}>
            Review before importing
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fn-fg-muted)', maxWidth: 560 }}>
            We parsed 7 employees from your file. 5 are good to go — fix or skip the other 2 to continue.
          </p>
        </div>
      </div>

      {/* Inline progress strip — thin, clear */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18,
      }}>
        {['Upload', 'Map columns', 'Review', 'Confirm'].map((s, i) => {
          const state = i < 2 ? 'done' : i === 2 ? 'active' : 'pending';
          return (
            <React.Fragment key={s}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px 6px 6px',
                background: state === 'active' ? 'var(--fn-accent-soft)' : 'transparent',
                borderRadius: 99,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: state === 'done' ? 'var(--fn-success)' : state === 'active' ? 'var(--fn-accent)' : 'transparent',
                  border: state === 'pending' ? '1.5px solid var(--fn-border-strong)' : 'none',
                  color: state === 'pending' ? 'var(--fn-fg-faint)' : '#fff',
                }}>
                  {state === 'done' ? <Icon d={I.check} size={11} stroke={3} /> : i + 1}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: state === 'active' ? 600 : 500,
                  color: state === 'pending' ? 'var(--fn-fg-faint)' : state === 'active' ? 'var(--fn-accent-soft-fg)' : 'var(--fn-fg)',
                }}>{s}</span>
              </div>
              {i < 3 && <div style={{ width: 24, height: 2, background: i < 2 ? 'var(--fn-success)' : 'var(--fn-border)', borderRadius: 99 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* File summary card — friendly */}
      <Card padded={false} style={{ marginBottom: 18 }}>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* CSV file tile */}
          <div style={{
            width: 56, height: 64, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(140deg, oklch(0.94 0.04 175) 0%, oklch(0.92 0.06 280) 100%)',
            border: '1px solid var(--fn-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <span style={{
              position: 'absolute', bottom: 6, left: 4, right: 4,
              padding: '2px 0', borderRadius: 3,
              fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textAlign: 'center',
              color: '#fff', background: 'oklch(0.55 0.18 280)',
            }}>CSV</span>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" size={26} style={{ color: 'oklch(0.45 0.16 280)', marginTop: -8 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)' }}>new_hires_may.csv</div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 4, display: 'flex', gap: 14 }}>
              <span>12 KB</span>
              <span>·</span>
              <span>7 rows parsed</span>
              <span>·</span>
              <span>Uploaded 2 min ago by Asma Ali</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={I.upload}>Re-upload</Button>
        </div>

        {/* Status strip */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--fn-divider)' }}>
          <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--fn-success-soft)',
              color: 'var(--fn-success-soft-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.check} size={16} stroke={2.5} />
            </span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>5 ready</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 3 }}>Will be created on confirm</div>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--fn-divider)' }} />
          <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--fn-danger-soft)',
              color: 'var(--fn-danger-soft-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={16} stroke={2} />
            </span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fn-fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>2 need attention</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 3 }}>Fix below, or skip them</div>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--fn-divider)' }} />
          <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--fn-icon-tile)',
              color: 'var(--fn-icon-tile-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.shield} size={16} />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fn-fg)' }}>All-or-nothing import</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 3 }}>Rolls back if any row fails</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Errors — prominent, fixable inline */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fn-fg)' }}>
              Fix these to continue
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)', marginTop: 2 }}>
              2 rows have issues. Pick a fix from the suggestions, or skip the row.
            </div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>Skip all errors</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errors.map(e => (
            <Card key={e.row} padded={false} style={{ border: '1px solid color-mix(in oklch, var(--fn-danger) 25%, transparent)', background: 'color-mix(in oklch, var(--fn-danger-soft) 60%, var(--fn-bg-panel))' }}>
              <div style={{ padding: '14px 18px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--fn-danger-soft)', color: 'var(--fn-danger-soft-fg)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--fn-font-mono)', flexShrink: 0,
                }}>{e.row.toString().padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fn-fg)' }}>{e.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--fn-fg-muted)', fontFamily: 'var(--fn-font-mono)' }}>· {e.email}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fn-fg-faint)', marginTop: 2 }}>
                    {e.fields.length} {e.fields.length === 1 ? 'issue' : 'issues'} to resolve
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={I.edit}>Edit row</Button>
                <Button size="sm" variant="secondary" icon={I.x}>Skip</Button>
              </div>

              <div style={{ borderTop: '1px solid color-mix(in oklch, var(--fn-danger) 18%, transparent)' }}>
                {e.fields.map((f, fi) => (
                  <div key={fi} style={{
                    padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    borderTop: fi > 0 ? '1px solid color-mix(in oklch, var(--fn-danger) 12%, transparent)' : 'none',
                  }}>
                    <div style={{ width: 110, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fn-fg-faint)' }}>
                      {f.col}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontFamily: 'var(--fn-font-mono)', fontSize: 12.5,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'var(--fn-bg-panel)', border: '1px solid color-mix(in oklch, var(--fn-danger) 30%, transparent)',
                        color: 'var(--fn-danger-soft-fg)', fontWeight: 500, textDecoration: 'line-through',
                      }}>"{f.value}"</span>
                      <span style={{ fontSize: 12.5, color: 'var(--fn-fg-muted)' }}>{f.issue}</span>
                      {f.existing && (
                        <span style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)' }}>(matches {f.existing})</span>
                      )}
                    </div>
                    {f.suggestion && (
                      <button style={{
                        height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600,
                        background: 'var(--fn-bg-panel)', color: 'var(--fn-fg)',
                        border: '1px solid var(--fn-border-strong)', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        <Icon d="M2 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" size={12} />
                        Use "{f.suggestion}"
                      </button>
                    )}
                    <button style={{
                      height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600,
                      background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Fix manually</button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Ready rows — clean preview list */}
      <Card padded={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fn-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7, background: 'var(--fn-success-soft)',
              color: 'var(--fn-success-soft-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={I.check} size={14} stroke={2.5} />
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ready to import</div>
              <div style={{ fontSize: 12, color: 'var(--fn-fg-muted)', marginTop: 1 }}>5 rows passed all validations</div>
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--fn-accent-soft-fg)', fontWeight: 600, cursor: 'pointer' }}>
            Collapse
          </span>
        </div>

        <InsetTable
          padding={14}
          cols={[
            { label: 'Row', width: 70 },
            { label: 'Name & email' },
            { label: 'Department', width: 160 },
            { label: 'Designation', width: 160 },
            { label: 'Salary / mo', align: 'right', width: 140 },
          ]}
        >
          <tbody>
            {ready.map((r, i) => (
              <InsetRow key={r.row} bordered={i < ready.length - 1}>
                <InsetCell first>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', color: 'var(--fn-fg-faint)', fontSize: 11.5 }}>
                    {r.row.toString().padStart(2, '0')}
                  </span>
                </InsetCell>
                <InsetCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={r.name} size={26} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--fn-fg)' }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fn-fg-faint)', fontFamily: 'var(--fn-font-mono)', marginTop: 1 }}>{r.email}</div>
                    </div>
                  </div>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)' }}>{r.dept}</span>
                </InsetCell>
                <InsetCell>
                  <span style={{ color: 'var(--fn-fg-muted)' }}>{r.desig}</span>
                </InsetCell>
                <InsetCell align="right" last>
                  <span style={{ fontFamily: 'var(--fn-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--fn-fg)', fontWeight: 600 }}>
                    ₨{new Intl.NumberFormat('en-PK').format(r.sal)}
                  </span>
                </InsetCell>
              </InsetRow>
            ))}
          </tbody>
        </InsetTable>
        <div style={{ height: 14 }} />
      </Card>

      {/* Sticky-ish action bar at bottom */}
      <div style={{
        marginTop: 22, padding: '14px 20px',
        background: 'var(--fn-bg-panel)', border: '1px solid var(--fn-border)', borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--fn-shadow-sm)',
      }}>
        <Icon d={I.shield} size={16} style={{ color: 'var(--fn-fg-muted)' }} />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fn-fg-muted)' }}>
          Continuing will import <strong style={{ color: 'var(--fn-fg)', fontWeight: 600 }}>5 employees</strong>. The 2 errored rows will be skipped unless you fix them above.
        </div>
        <Button variant="ghost">Cancel</Button>
        <Button variant="secondary" icon={I.chevL}>Back</Button>
        <Button iconRight={I.arrowR}>Continue with 5 rows</Button>
      </div>
    </>
  );
}

Object.assign(window, { EmployeesList, CSVImport });