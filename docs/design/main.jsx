// Main app — wraps each screen in a fixed-size frame and lays them out on the canvas.
// Theme + accent come from useTweaks; each artboard re-uses the AppShell.

const DESKTOP = { w: 1440, h: 1200 };
const DESKTOP_TALL = { w: 1440, h: 1500 };
const LOGIN = { w: 1280, h: 800 };
const MODAL = { w: 1100, h: 740 };

// Wrap a screen in a fixed-size frame so the AppShell renders at desktop dims
// regardless of artboard scaling.
function Frame({ width, height, theme = 'light', accent = 65, children }) {
  const vars = fnVars(theme, accent);
  return (
    <div style={{
      width, minHeight: height, ...vars,
      fontFamily: 'var(--fn-font-sans)', position: 'relative',
    }}>
      {children}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks({
    theme: 'light',          // 'light' | 'dark'
    accentHue: 280,          // indigo-violet default
  });

  const accentSwatches = [
    { hue: 280, name: 'Violet' },
    { hue: 255, name: 'Indigo' },
    { hue: 230, name: 'Blue' },
    { hue: 175, name: 'Mint' },
    { hue: 145, name: 'Emerald' },
    { hue: 22, name: 'Coral' },
  ];

  // Frame helper bound to current theme/accent
  const F = ({ width, height, children }) => (
    <Frame width={width} height={height} theme={t.theme} accent={t.accentHue}>{children}</Frame>
  );

  const StdTopbar = ({ crumbs, active }) => (
    <Topbar crumbs={crumbs} currency="USD" />
  );

  return (
    <>
      <DesignCanvas>
        <DCSection id="overview" title="Futurenostics HRMS" subtitle="Phase 0 + Phase 1 + Phase 2 + Phase 3 screen set · Warm amber, distinctive type, balanced density">

          <DCArtboard id="login" label="00 · Sign in" width={LOGIN.w} height={LOGIN.h}>
            <F width={LOGIN.w} height={LOGIN.h}>
              <LoginScreen />
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="dashboards" title="Dashboards" subtitle="Two takes — HR's task-led view, Management's financial editorial view">

          <DCArtboard id="dash-hr" label="01 · HR Dashboard" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="dashboard" topbar={<Topbar crumbs={['Workspace', 'Dashboard']} currency="USD" />} user={{ name: 'Asma Ali', role: 'HR Admin' }}>
                <HRDashboard currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="dash-mgmt" label="02 · Management dashboard" width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
              <AppShell active="dashboard" topbar={<Topbar crumbs={['Workspace', 'Management']} currency="USD" />} user={{ name: 'Faisal Anwar', role: 'CEO' }}>
                <MgmtDashboard currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="dash-hr-rail" label="03 · HR dashboard · rail sidebar variant" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="dashboard" sidebarVariant="rail" topbar={<Topbar crumbs={['Dashboard']} currency="USD" />} user={{ name: 'Asma Ali', role: 'HR Admin' }}>
                <HRDashboard currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="hrcore" title="HR Core" subtitle="People directory, profile, and bulk import">

          <DCArtboard id="emp-list" label="04 · Employees · list" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees']} currency="PKR" />}>
                <EmployeesList currency="PKR" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="emp-profile" label="05 · Employee profile · Timeline tab" width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees', 'Bilal Rauf']} currency="USD" />}>
                <EmployeeProfile currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="emp-csv" label="06 · Bulk CSV import" width={DESKTOP.w} height={DESKTOP.h + 80}>
            <F width={DESKTOP.w} height={DESKTOP.h + 80}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees', 'Import']} currency="USD" />}>
                <CSVImport />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="org-chart" label="07 · Org chart · interactive" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="org" topbar={<Topbar crumbs={['HR Core', 'Org chart']} currency="USD" />}>
                <OrgChart />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="commissions" title="Commission & Payroll" subtitle="Projects → monthly processing → approve & disburse → versioned rules">

          <DCArtboard id="projects" label="07 · Projects · all categories" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="projects" topbar={<Topbar crumbs={['Commissions', 'Projects']} currency="USD" />}>
                <ProjectsList currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="project-form" label="08 · New project + live commission preview" width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
              <AppShell active="projects" topbar={<Topbar crumbs={['Commissions', 'Projects', 'New']} currency="USD" />}>
                <ProjectForm currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="categories" label="09 · Project categories · manage taxonomy" width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
              <AppShell active="projects" topbar={<Topbar crumbs={['Commissions', 'Projects', 'Categories']} currency="USD" />}>
                <ProjectCategories currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="processing" label="09 · Monthly processing · External tab" width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
              <AppShell active="processing" topbar={<Topbar crumbs={['Commissions', 'Monthly Processing', 'May 2026']} currency="USD" />}>
                <MonthlyProcessing currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="approve" label="10 · Approve & lock confirmation" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="approvals" topbar={<Topbar crumbs={['Commissions', 'Approvals', 'May 2026']} currency="USD" />}>
                <div style={{ position: 'relative' }}>
                  <ApproveDisburse currency="USD" />
                </div>
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="rules" label="11 · Commission rules · versioned" width={DESKTOP.w} height={DESKTOP.h + 60}>
            <F width={DESKTOP.w} height={DESKTOP.h + 60}>
              <AppShell active="rules" topbar={<Topbar crumbs={['Commissions', 'Rules']} currency="USD" />}>
                <CommissionRules />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="rule-form" label="12 · New commission rule + live preview" width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
              <AppShell active="rules" topbar={<Topbar crumbs={['Commissions', 'Rules', 'New']} currency="USD" />}>
                <CommissionRuleForm currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="reminders" title="Reminders & Reviews" subtitle="Lifecycle reminder engine + evaluation flow">

          <DCArtboard id="hr-rules" label="12 · Reminder rules + scheduler" width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
              <AppShell active="hr-rules" topbar={<Topbar crumbs={['Reminders', 'Rules']} currency="USD" />}>
                <HRRules />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="evals" label="13 · Evaluations · in-flight + reviewer form" width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 80}>
              <AppShell active="evaluations" topbar={<Topbar crumbs={['Reminders', 'Evaluations']} currency="USD" />}>
                <Evaluations />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="portal" title="Self-Service Portal" subtitle="What an employee sees — softer, person-first">

          <DCArtboard id="portal" label="14 · Employee portal" width={DESKTOP.w} height={DESKTOP_TALL.h + 800}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 800}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <EmployeePortal currency="USD" />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="settings" title="Settings" subtitle="Manifest-driven roles & permissions">

          <DCArtboard id="roles" label="15 · Roles & permissions" width={DESKTOP.w} height={DESKTOP_TALL.h + 60}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 60}>
              <AppShell active="roles" topbar={<Topbar crumbs={['Settings', 'Roles & permissions']} currency="USD" />}>
                <RolesPermissions />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="states" title="Empty states & skeletons" subtitle="Patterns every async surface uses on first paint and zero-data conditions">

          <DCArtboard id="states" label="16 · Empty states & loading skeletons" width={DESKTOP.w} height={DESKTOP_TALL.h + 900}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 900}>
              <AppShell active="dashboard" topbar={<Topbar crumbs={['Design system', 'States']} currency="USD" />}>
                <StatesShowcase />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="overtime" title="Overtime · Addendum 2" subtitle="OT module — independent of commissions, routes to PKR Payroll / USD Payoneer / Comp-Off Leave">

          <DCArtboard id="ot-types" label="17 · Overtime Types · list" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Overtime Types']} currency="USD" />}>
                <OvertimeTypes />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-types-edit" label="18 · Overtime Types · edit dialog" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Overtime Types']} currency="USD" />}>
                <OvertimeTypes openEdit />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-types-empty" label="19 · Overtime Types · empty state" width={DESKTOP.w} height={DESKTOP.h - 200}>
            <F width={DESKTOP.w} height={DESKTOP.h - 200}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Overtime Types']} currency="USD" />}>
                <OvertimeTypes emptyState />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-rules-list" label="20 · Overtime Rules · grouped list" width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Overtime Rules']} currency="USD" />}>
                <OvertimeRules />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-rules-edit" label="21 · Overtime Rules · editor sheet (overlap warning + live preview)" width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Overtime Rules']} currency="USD" />}>
                <OvertimeRules openEditor />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-log-pkr" label="22 · Log overtime · pre-approval + PKR Payroll" width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime', 'New']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LogOvertimePortal />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-log-compoff" label="23 · Log overtime · Comp-Off preview" width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime', 'New']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LogOvertimePortal channel="comp_off_leave" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-log-posthoc" label="24 · Log overtime · post-hoc claim" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime', 'New']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LogOvertimePortal mode="post_hoc" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-log-submitted" label="25 · Log overtime · submitted" width={DESKTOP.w} height={DESKTOP_TALL.h - 400}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 400}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime', 'New']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LogOvertimePortal state="submitted" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-my" label="26 · My overtime · requests + entries" width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <MyOvertimePortal />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-my-empty" label="27 · My overtime · empty state" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Overtime']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <MyOvertimePortal emptyState />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-entries" label="28 · Overtime entries · admin" width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Overtime', 'Entries']} currency="USD" />}>
                <OvertimeEntriesAdmin />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-entries-selected" label="29 · Overtime entries · bulk selection" width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Overtime', 'Entries']} currency="USD" />}>
                <OvertimeEntriesAdmin selected={3} />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="ot-entries-inspector" label="30 · Overtime entries · rule snapshot inspector" width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Overtime', 'Entries']} currency="USD" />}>
                <OvertimeEntriesAdmin withInspector />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="payroll" title="Payroll (PKR) · Addendum 2" subtitle="Monthly PKR salary disbursement — independent from the Payoneer run">

          <DCArtboard id="payroll-draft" label="31 · Payroll run · draft" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollRunDetail status="draft" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-override" label="32 · Payroll run · override popover" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollRunDetail status="draft" overrideOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-disburse" label="33 · Payroll run · approved + disburse modal" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 100}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollRunDetail status="approved" disburseOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bank-list" label="34 · Bank accounts · admin" width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bank accounts']} currency="PKR" />}>
                <BankAccountsAdmin />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bank-add" label="35 · Bank accounts · add (sheet)" width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bank accounts']} currency="PKR" />}>
                <BankAccountsAdmin addOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bank-verify" label="36 · Bank accounts · verify confirmation" width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bank accounts']} currency="PKR" />}>
                <BankAccountsAdmin verifyOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payslip-std" label="37 · Payslip PDF · standard (with OT)" width={720} height={1000}>
            <F width={720} height={1000}>
              <PayslipPDF variant="standard" />
            </F>
          </DCArtboard>

          <DCArtboard id="payslip-no-ot" label="38 · Payslip PDF · no overtime" width={720} height={1000}>
            <F width={720} height={1000}>
              <PayslipPDF variant="no_ot" />
            </F>
          </DCArtboard>

          <DCArtboard id="payslip-override" label="39 · Payslip PDF · with manual override" width={720} height={1000}>
            <F width={720} height={1000}>
              <PayslipPDF variant="override" />
            </F>
          </DCArtboard>

          <DCArtboard id="payslip-draft" label="40 · Payslip PDF · DRAFT watermark" width={720} height={1000}>
            <F width={720} height={1000}>
              <PayslipPDF variant="draft" />
            </F>
          </DCArtboard>

          <DCArtboard id="leave-list" label="41 · Leave types · list" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Leave Types']} currency="PKR" />}>
                <LeaveTypesEditor />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="leave-maternity" label="42 · Leave types · edit Maternity (all sections)" width={DESKTOP.w} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Leave Types']} currency="PKR" />}>
                <LeaveTypesEditor editing="maternity" sheetOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="leave-compoff" label="43 · Leave types · Comp-off (OT-managed)" width={DESKTOP.w} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Time & Attendance', 'Leave Types']} currency="PKR" />}>
                <LeaveTypesEditor editing="comp_off" sheetOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="life-events" label="44 · Life events · loaded" width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'My profile', 'Life events']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LifeEventsPortal />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="life-events-empty" label="45 · Life events · empty state" width={DESKTOP.w} height={DESKTOP.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP.h - 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'My profile', 'Life events']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LifeEventsPortal emptyState />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="life-events-register" label="46 · Life events · register modal" width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'My profile', 'Life events']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LifeEventsPortal registerOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="life-events-sensitive" label="47 · Life events · sensitive (bereavement)" width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'My profile', 'Life events']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LifeEventsPortal registerOpen sensitiveOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="life-events-rejected" label="48 · Life events · rejected event" width={DESKTOP.w} height={DESKTOP.h}>
            <F width={DESKTOP.w} height={DESKTOP.h}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'My profile', 'Life events']} currency="PKR" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <LifeEventsPortal rejected />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="approval-inbox" label="49 · Approval inbox · all kinds" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
              <AppShell active="approvals" topbar={<Topbar crumbs={['Approvals']} currency="USD" />}>
                <ApprovalInboxRows />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="approval-reject" label="50 · Approval inbox · reject popover" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
              <AppShell active="approvals" topbar={<Topbar crumbs={['Approvals']} currency="USD" />}>
                <ApprovalInboxRows rejectPopover />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="documents" title="Documents · Phase 9" subtitle="Categories drive defaults · templates drive generation · documents are the records">

          <DCArtboard id="doc-cats-emp" label="51 · Document categories · Employee tab" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Categories']} currency="USD" />}>
                <DocCategoriesSettings tab="employee" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-cats-edit-system" label="52 · Document categories · edit system category" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Categories']} currency="USD" />}>
                <DocCategoriesSettings tab="employee" editing="sal-cert" editingSystem />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-cats-project" label="53 · Document categories · Project tab" width={DESKTOP.w + 100} height={DESKTOP.h}>
            <F width={DESKTOP.w + 100} height={DESKTOP.h}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Categories']} currency="USD" />}>
                <DocCategoriesSettings tab="project" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-cats-vendor" label="54 · Document categories · Vendor (empty)" width={DESKTOP.w + 100} height={DESKTOP.h - 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Categories']} currency="USD" />}>
                <DocCategoriesSettings tab="vendor" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-templates" label="55 · Document templates · grouped list" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Templates']} currency="USD" />}>
                <DocTemplatesList />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-templates-kebab" label="56 · Document templates · React vs Markdown actions" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Templates']} currency="USD" />}>
                <DocTemplatesList kebabOpen="t-sc-bank" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-templates-filter" label="57 · Document templates · Markdown filter applied" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Templates']} currency="USD" />}>
                <DocTemplatesList filterActive />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-templates-empty" label="58 · Document templates · no Markdown yet" width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Workflows', 'Document Templates']} currency="USD" />}>
                <DocTemplatesList emptyState />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor" label="59 · Markdown template editor · populated + valid" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="valid" />
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor-errors" label="60 · Markdown editor · 2 unresolved placeholders + validation drawer" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="errors" />
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor-var" label="61 · Markdown editor · variable picker open" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="var_picker" />
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor-settings" label="62 · Markdown editor · Settings tab (manual vars + page)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="settings" />
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor-sample" label="63 · Markdown editor · sample-data picker" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="sample_data" />
            </F>
          </DCArtboard>

          <DCArtboard id="md-editor-history" label="64 · Markdown editor · viewing old version (read-only)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 200}>
              <MdEditor state="history" />
            </F>
          </DCArtboard>

          <DCArtboard id="emp-docs" label="65 · Employee profile · Documents tab (table)" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees', 'Bilal Rauf', 'Documents']} currency="PKR" />}>
                <EmpDocsTab view="table" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="emp-docs-generate" label="66 · Employee documents · Generate dropdown" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees', 'Bilal Rauf', 'Documents']} currency="PKR" />}>
                <EmpDocsTab view="table" generateOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="emp-docs-grid" label="67 · Employee documents · grid view" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="employees" topbar={<Topbar crumbs={['HR Core', 'Employees', 'Bilal Rauf', 'Documents']} currency="PKR" />}>
                <EmpDocsTab view="grid" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="emp-docs-manager" label="68 · Employee documents · manager view (restricted)" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="employees" topbar={<Topbar crumbs={['Team', 'Bilal Rauf', 'Documents']} currency="PKR" />}>
                <EmpDocsTab view="table" role="manager" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="docs-global" label="69 · Documents · global browser" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents']} currency="USD" />}>
                <GlobalDocsBrowser />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="docs-saved-view" label="70 · Global browser · saved view + filter chips" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents']} currency="USD" />}>
                <GlobalDocsBrowser savedView />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="docs-bulk" label="71 · Global browser · 4 selected (bulk action bar)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents']} currency="USD" />}>
                <GlobalDocsBrowser bulkSelected={4} />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="docs-missing" label="72 · Global browser · entities WITHOUT category mode" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents']} currency="USD" />}>
                <GlobalDocsBrowser mode="missing" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="docs-calendar" label="73 · Global browser · expiry calendar view" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 100}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents']} currency="USD" />}>
                <GlobalDocsBrowser calendar />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-detail" label="74 · Document detail · salary certificate" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents', 'Bilal Rauf']} currency="USD" />}>
                <DocDetailView variant="standard" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-detail-policy" label="75 · Document detail · policy with acknowledgments" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents', 'Code of Conduct']} currency="USD" />}>
                <DocDetailView variant="policy" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-detail-ack" label="76 · Document detail · own view, pending ack" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading', 'Code of conduct']} currency="USD" />}>
                <DocDetailView variant="own_pending" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-detail-replaced" label="77 · Document detail · replaced version" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents', 'Bilal Rauf']} currency="USD" />}>
                <DocDetailView variant="replaced" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-detail-expired" label="78 · Document detail · expired CNIC" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 100}>
              <AppShell active="docs" topbar={<Topbar crumbs={['Documents', 'Hassan Tariq']} currency="USD" />}>
                <DocDetailView variant="expired" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="doc-upload-empty" label="79 · Upload · empty (drop zone)" width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 200}>
              <UploadOrGenerateSheet flow="upload" state="empty" />
            </F>
          </DCArtboard>

          <DCArtboard id="doc-upload-filled" label="80 · Upload · file selected + defaults applied" width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
              <UploadOrGenerateSheet flow="upload" state="filled" />
            </F>
          </DCArtboard>

          <DCArtboard id="doc-upload-dup" label="81 · Upload · duplicate warning + size error" width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 200}>
              <UploadOrGenerateSheet flow="upload" state="duplicate" />
            </F>
          </DCArtboard>

          <DCArtboard id="doc-generate" label="82 · Generate · live preview + manual fields" width={DESKTOP.w} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 400}>
              <UploadOrGenerateSheet flow="generate" state="filled" />
            </F>
          </DCArtboard>

          <DCArtboard id="doc-generate-success" label="83 · Generate · success screen" width={DESKTOP.w} height={DESKTOP_TALL.h - 300}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h - 300}>
              <UploadOrGenerateSheet flow="generate" state="success" />
            </F>
          </DCArtboard>

          <DCArtboard id="req-reading-list" label="84 · Required reading · pending list (with overdue)" width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h + 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <RequiredReading />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="req-reading-mid" label="85 · Reading modal · 40% scrolled (button locked)" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <RequiredReading state="reading" modalState="mid" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="req-reading-bottom" label="86 · Reading modal · 100% scrolled (button unlocked + note)" width={DESKTOP.w} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w} height={DESKTOP_TALL.h}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <RequiredReading state="reading" modalState="bottom" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="req-reading-ack" label="87 · Required reading · just-acknowledged" width={DESKTOP.w} height={DESKTOP.h + 200}>
            <F width={DESKTOP.w} height={DESKTOP.h + 200}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <RequiredReading state="acknowledged" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="req-reading-empty" label="88 · Required reading · all caught up" width={DESKTOP.w} height={DESKTOP.h - 100}>
            <F width={DESKTOP.w} height={DESKTOP.h - 100}>
              <AppShell active="portal" topbar={<Topbar crumbs={['My space', 'Required reading']} currency="USD" />} user={{ name: 'Bilal Rauf', role: 'Sr. Engineer' }}>
                <RequiredReading empty />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>

        <DCSection id="phase10-tax" title="Phase 10 · FBR Income Tax" subtitle="Briefs 20 + 21 — slab editor and breakdown drawer">

          <DCArtboard id="tax-slabs-active" label="89 · FBR slabs · FY 2025-26 active (read-only)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Income Tax']} currency="PKR" />}>
                <FbrSlabsEditor fy="2025-26" mode="view" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-slabs-draft" label="90 · FBR slabs · FY 2026-27 draft (changed rates highlighted)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 900}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 900}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Income Tax']} currency="PKR" />}>
                <FbrSlabsEditor fy="2026-27" mode="edit" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-slabs-gap" label="91 · FBR slabs · validation error (gap)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Income Tax']} currency="PKR" />}>
                <FbrSlabsEditor fy="2026-27" mode="edit" gapError />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-slabs-impact" label="92 · FBR slabs · full impact drawer" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Income Tax']} currency="PKR" />}>
                <FbrSlabsEditor fy="2026-27" impactOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-slabs-activate" label="93 · FBR slabs · activate confirmation modal" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Income Tax']} currency="PKR" />}>
                <FbrSlabsEditor fy="2026-27" activateOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-breakdown-std" label="94 · Tax breakdown drawer · HR view (standard)" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 300}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 300}>
              <TaxBreakdownDrawer variant="hr" scenario="standard" />
            </F>
          </DCArtboard>

          <DCArtboard id="tax-breakdown-bonus" label="95 · Tax breakdown drawer · bonus catch-up" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 400}>
              <TaxBreakdownDrawer variant="hr" scenario="bonus" />
            </F>
          </DCArtboard>

          <DCArtboard id="tax-breakdown-emp" label="96 · Tax breakdown drawer · employee view (simplified)" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 200}>
              <TaxBreakdownDrawer variant="employee" scenario="bonus" />
            </F>
          </DCArtboard>

          <DCArtboard id="tax-breakdown-zero" label="97 · Tax breakdown · zero-tax slab employee" width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h}>
              <TaxBreakdownDrawer variant="hr" scenario="zero" />
            </F>
          </DCArtboard>

          <DCArtboard id="statutory" label="98 · EOBI + Provident Fund configuration" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 500}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 500}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Statutory Contributions']} currency="PKR" />}>
                <StatutoryConfig />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="gratuity" label="99 · Gratuity policy · active" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Gratuity']} currency="PKR" />}>
                <GratuityPolicy />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="gratuity-disabled" label="100 · Gratuity policy · disabled" width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 600}>
            <F width={DESKTOP.w + 100} height={DESKTOP_TALL.h + 600}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Compensation', 'Gratuity']} currency="PKR" />}>
                <GratuityPolicy disabled />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="advances" label="101 · Advances · admin list" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Advances']} currency="PKR" />}>
                <AdvancesAdmin />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="advances-detail" label="102 · Advances · detail drawer" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Advances']} currency="PKR" />}>
                <AdvancesAdmin detail="a3" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="advances-issue" label="103 · Advances · issue flow" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Advances']} currency="PKR" />}>
                <AdvancesAdmin issueOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="advances-overlimit" label="104 · Advances · over-limit attempt" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Advances']} currency="PKR" />}>
                <AdvancesAdmin issueOpen overLimit />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="loans-list" label="105 · Loans · admin list" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Loans']} currency="PKR" />}>
                <LoansAdmin />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="loans-detail" label="106 · Loan detail · amortization schedule" width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
            <F width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Loans', 'L-2025-042']} currency="PKR" />}>
                <LoansAdmin view="detail" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="loans-restructured" label="107 · Loan detail · restructured banner" width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
            <F width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Loans', 'L-2025-042']} currency="PKR" />}>
                <LoansAdmin view="detail" restructured />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="loans-issue" label="108 · Loan · issue flow with EMI calculator" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 300}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 300}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Loans']} currency="PKR" />}>
                <LoansAdmin issueOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="loans-prepay" label="109 · Loan · prepayment modeling" width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
            <F width={DESKTOP.w + 300} height={DESKTOP_TALL.h + 500}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Loans', 'L-2025-042']} currency="PKR" />}>
                <LoansAdmin view="detail" prepayOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bonus-awards" label="110 · Bonuses · awards tab" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bonuses']} currency="PKR" />}>
                <BonusesAdmin tab="awards" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bonus-types" label="111 · Bonuses · types tab" width={DESKTOP.w + 200} height={DESKTOP.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bonuses']} currency="PKR" />}>
                <BonusesAdmin tab="types" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bonus-single" label="112 · Bonuses · award single (with tax impact)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bonuses']} currency="PKR" />}>
                <BonusesAdmin tab="awards" flow="single" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="bonus-bulk" label="113 · Bonuses · bulk Eid award preview (step 5)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Bonuses', 'Bulk award']} currency="PKR" />}>
                <BonusesAdmin tab="awards" flow="bulk" step={5} />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-p10" label="114 · Payroll run · Phase 10 columns (tax/EOBI/PF/bonus/loans)" width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollPhase10 />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-p10-cols" label="115 · Payroll run · Columns popover" width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollPhase10 cols="popover" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-p10-entry" label="116 · Payroll run · entry detail drawer (Phase 10 cards)" width={DESKTOP.w + 400} height={DESKTOP_TALL.h + 400}>
            <F width={DESKTOP.w + 400} height={DESKTOP_TALL.h + 400}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollPhase10 entryOpen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-p10-comp-pass" label="117 · Pre-disbursement compliance · all checks passed" width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollPhase10 compliance="pass" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="payroll-p10-comp-fail" label="118 · Pre-disbursement compliance · 2 critical checks failed" width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 400} height={DESKTOP_TALL.h}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Runs', 'May 2026']} currency="PKR" />}>
                <PayrollPhase10 compliance="fail" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-cert-full" label="119 · Annual tax certificate · full-year (PDF)" width={720} height={1100}>
            <F width={720} height={1100}>
              <TaxCertificatePDF variant="fullYear" />
            </F>
          </DCArtboard>

          <DCArtboard id="tax-cert-partial" label="120 · Annual tax certificate · partial-year + additional tax" width={720} height={1100}>
            <F width={720} height={1100}>
              <TaxCertificatePDF variant="partial" />
            </F>
          </DCArtboard>

          <DCArtboard id="tax-cert-gen" label="121 · Tax certificates · bulk generation page" width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 100}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h - 100}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Year-End', 'Tax Certificates']} currency="PKR" />}>
                <TaxCertificateGen />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="tax-cert-gen-progress" label="122 · Tax certificates · bulk generation in progress" width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h}>
              <AppShell active="general" topbar={<Topbar crumbs={['Settings', 'Year-End', 'Tax Certificates']} currency="PKR" />}>
                <TaxCertificateGen progress />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="compliance-mixed" label="123 · Compliance dashboard · mixed status" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Compliance']} currency="PKR" />}>
                <ComplianceDashboard state="mixed" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="compliance-green" label="124 · Compliance dashboard · all green" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Compliance']} currency="PKR" />}>
                <ComplianceDashboard state="green" />
              </AppShell>
            </F>
          </DCArtboard>

          <DCArtboard id="compliance-audit" label="125 · Compliance dashboard · pre-audit (exports featured)" width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
            <F width={DESKTOP.w + 200} height={DESKTOP_TALL.h + 200}>
              <AppShell active="payroll" topbar={<Topbar crumbs={['Payroll', 'Compliance']} currency="PKR" />}>
                <ComplianceDashboard state="audit" />
              </AppShell>
            </F>
          </DCArtboard>

        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio label="Mode" value={t.theme} onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </TweakSection>
        <TweakSection title="Brand accent">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {accentSwatches.map(s => (
              <button key={s.hue} onClick={() => setTweak('accentHue', s.hue)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: 10, border: `1.5px solid ${t.accentHue === s.hue ? `oklch(0.65 0.14 ${s.hue})` : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 8, background: t.accentHue === s.hue ? `oklch(0.97 0.03 ${s.hue})` : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, background: `oklch(0.70 0.14 ${s.hue})` }} />
                <span style={{ fontSize: 11, fontWeight: 500 }}>{s.name}</span>
              </button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
