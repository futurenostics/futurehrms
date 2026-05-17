/**
 * Style-guide sections — Tier 5 compound primitives.
 *
 * Tabs (rebuild) + Alert, Progress, EmptyState (new).
 * Skeleton and Toast (sonner) stay as-is; documented inline below.
 */
'use client';

import * as React from 'react';
import { Mail, Plus, Users } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Spec } from './label';

export function TabsSection() {
  return (
    <div id="primitive-tabs" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Tabs
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Underline-style tab strip — matches the design's profile-page pattern. Active tab gets a
          2px fn-accent underline; inactive tabs sit at fn-fg-muted with hover→fn-fg.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-fn-fg text-fn-base">
            Overview panel content.
          </TabsContent>
          <TabsContent value="timeline" className="text-fn-fg text-fn-base">
            Timeline panel content.
          </TabsContent>
          <TabsContent value="documents" className="text-fn-fg text-fn-base">
            Documents panel content.
          </TabsContent>
          <TabsContent value="settings" className="text-fn-fg text-fn-base">
            Settings panel content.
          </TabsContent>
        </Tabs>
      </div>
      <Spec
        items={[
          ['list', 'inline-flex · border-b fn-divider · h-fn-9 · gap-fn-4'],
          ['trigger', 'text-fn-base · font-fn-medium · fn-fg-muted → fn-fg on hover'],
          ['active', '2px fn-accent border-b · text-fn-fg'],
          ['focus ring', '2px fn-accent · 2px offset on fn-bg'],
          ['behavior', 'Radix Tabs — left/right arrow nav, home/end jumps'],
        ]}
      />
    </div>
  );
}

export function AlertSection() {
  const [show, setShow] = React.useState(true);
  return (
    <div id="primitive-alert" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Alert / Banner
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Inline contextual message. The design's overlap-warning in the Overtime Rules editor is
          the reference. Used by the parked employee-sheet for audit-significant change banners
          (manager change → info; salary change → warning; duplicate email → danger).
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 p-fn-6 flex flex-col border">
        <Alert tone="info" title="Manager change creates a timeline entry">
          Visible to HR and the old + new managers. Audit-logged.
        </Alert>
        <Alert tone="success" title="Saved" />
        <Alert tone="warning" title="Salary changes require a reason">
          A SalaryHistory entry and audit-log entry are created on save.
        </Alert>
        <Alert tone="danger" title="An employee with this email already exists">
          <a className="underline" href="#">
            View employee →
          </a>
        </Alert>
        {show && (
          <Alert tone="info" title="Dismissible" onDismiss={() => setShow(false)}>
            Pass onDismiss to render the close X.
          </Alert>
        )}
      </div>
      <Spec
        items={[
          ['radius / padding', 'rounded-fn-md (10) · py-fn-3_5 px-fn-4 (14 / 16)'],
          ['tones', 'info · success · warning · danger'],
          ['bg / fg / border', 'fn-{tone}-soft + fn-{tone}-soft-fg + 1px fn-{tone}/35'],
          ['leading icon', '16×16 stroke-2, fn-{tone}-soft-fg, mt-fn-0_5 to baseline-align'],
          ['title', 'font-fn-semibold · same color as body'],
          ['body', 'text-fn-base-plus leading-fn-normal'],
          ['dismissible', 'pass onDismiss → X button right-aligned'],
        ]}
      />
    </div>
  );
}

export function ProgressSection() {
  const [value, setValue] = React.useState(40);
  return (
    <div id="primitive-progress" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Progress
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Linear progress bar. 3 sizes × 4 semantic tones. Used by import wizard step indicators and
          any percent-complete display (probation, internship duration, etc.).
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 p-fn-6 flex flex-col border">
        <div className="gap-fn-3 flex flex-col">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="gap-fn-2 flex items-center">
              <code className="text-fn-fg-muted text-fn-sm w-fn-7 font-mono">{size}</code>
              <Progress value={value} size={size} />
            </div>
          ))}
        </div>
        <div className="gap-fn-2 flex items-center">
          <code className="text-fn-fg-muted text-fn-sm w-fn-7 font-mono">accent</code>
          <Progress value={value} tone="accent" />
          <code className="text-fn-fg-muted text-fn-sm ml-fn-3 w-fn-7 font-mono">success</code>
          <Progress value={value} tone="success" />
        </div>
        <div className="gap-fn-2 flex items-center">
          <code className="text-fn-fg-muted text-fn-sm w-fn-7 font-mono">warning</code>
          <Progress value={value} tone="warning" />
          <code className="text-fn-fg-muted text-fn-sm ml-fn-3 w-fn-7 font-mono">danger</code>
          <Progress value={value} tone="danger" />
        </div>
        <div className="gap-fn-3 flex items-center">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-fn-12"
          />
          <span className="text-fn-fg-muted text-fn-sm-plus font-mono tabular-nums">{value}%</span>
        </div>
      </div>
      <Spec
        items={[
          ['track sizes', 'sm 4 · md 6 · lg 10'],
          ['track', 'bg-fn-bg-inset · rounded-fn-full'],
          ['fill tones', 'accent · success · warning · danger'],
          ['behavior', 'Radix Progress — aria-valuenow / valuemin / valuemax wired'],
        ]}
      />
    </div>
  );
}

export function EmptyStateSection() {
  return (
    <div id="primitive-empty-state" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          EmptyState
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Centered IconTile + title + description + optional actions. Used when a list/table/page
          has no data — composes the design's pattern from the screens that show empty cards.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <EmptyState
          icon={<Users />}
          title="No employees yet"
          description="Import a CSV or add the first employee manually. Both options live in the top-right."
          actions={
            <>
              <Button variant="secondary">
                <Mail /> Invite link
              </Button>
              <Button>
                <Plus /> New employee
              </Button>
            </>
          }
        />
      </div>
      <Spec
        items={[
          ['layout', 'centered column · py-fn-10 px-fn-4'],
          ['icon', '48 × 48 IconTile xl (default tone fn-accent)'],
          ['title', 'text-fn-lg-plus font-fn-semibold'],
          ['description', 'text-fn-base fn-fg-muted leading-fn-normal max-w-[420px]'],
          ['actions', 'gap-fn-2 row, 16px below description'],
        ]}
      />
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div id="primitive-skeleton" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Skeleton
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Loading placeholder. fn-bg-inset bg with pulse animation. Already lint-clean since the
          Reset (uses rounded-fn-sm + animate-pulse + bg-fn-bg-inset); no rebuild needed.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel gap-fn-3 p-fn-6 rounded-fn-xs flex flex-col border">
        <Skeleton className="h-fn-4 w-[80%]" />
        <Skeleton className="h-fn-4 w-[60%]" />
        <Skeleton className="h-fn-12 w-full" />
      </div>
      <Spec
        items={[
          ['bg', 'fn-bg-inset · rounded-fn-sm (default; override via className)'],
          ['animation', 'animate-pulse'],
          ['sizing', 'caller-driven via className (h-…, w-…, rounded-…)'],
        ]}
      />
    </div>
  );
}

export function ToastSection() {
  return (
    <div id="primitive-toast" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Toast
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          We use <code className="text-fn-fg font-mono">sonner</code> (already mounted in
          <code className="text-fn-fg font-mono"> components/ui/sonner.tsx</code>). Call
          <code className="text-fn-fg font-mono"> toast.success(&quot;Saved&quot;)</code> /
          <code className="text-fn-fg font-mono"> toast.error()</code> /
          <code className="text-fn-fg font-mono"> toast.info()</code> from anywhere. Styled to
          inherit the FN theme via the shadcn variable bridge.
        </p>
      </div>
      <Spec
        items={[
          ['library', 'sonner (singleton; mounted once at app root)'],
          ['variants', 'success · error · info · warning · loading + dismiss'],
          ['position', 'bottom-right by default; configurable per-toast'],
          ['style', 'inherits FN bg-panel / fg / shadow tokens via shadcn bridge'],
        ]}
      />
    </div>
  );
}
