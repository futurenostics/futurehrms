/**
 * Style-guide sections — Tier 6 (Form composition) + Tier 7 (Table).
 *
 * Both small, batched in one file as the final Sub-phase B
 * deliverable. After this commit the style guide is feature-
 * complete and every primitive in components/ui/ is verified.
 */
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusPill } from '@/components/employees/status-pill';
import { Spec } from './label';

export function FormSection() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: '' },
    mode: 'onBlur',
  });
  return (
    <div id="primitive-form" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Form composition
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          react-hook-form bridge. <code className="text-fn-fg font-mono">Form</code> wraps a RHF{' '}
          <code className="text-fn-fg font-mono">useForm()</code> instance; FormField / FormItem /
          FormLabel / FormControl / FormDescription / FormMessage compose a single field with
          correct ARIA wiring (label-for, describedby, invalid).
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <Form {...form}>
          <form
            className="gap-fn-4 flex max-w-[420px] flex-col"
            onSubmit={form.handleSubmit(() => {})}
          >
            <FormField
              control={form.control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/, message: 'Enter a valid email' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormDescription>We never share this address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit (try empty)</Button>
          </form>
        </Form>
      </div>
      <Spec
        items={[
          ['Form', 'thin alias for RHF FormProvider'],
          ['FormField', 'Controller wrapper + name → context for sub-components'],
          ['FormItem', 'space-y-fn-1_5 column for label/control/desc/message'],
          ['FormLabel', 'reuses ui/Label primitive · text-fn-danger when field has error'],
          [
            'FormControl',
            'Radix Slot · wires id / aria-describedby / aria-invalid to the inner input',
          ],
          ['FormDescription', 'text-fn-base-lo fn-fg-muted'],
          [
            'FormMessage',
            'text-fn-base-lo fn-danger font-fn-medium · auto-renders RHF error.message',
          ],
        ]}
      />
    </div>
  );
}

const TABLE_ROWS = [
  {
    eid: 'EMP-0042',
    name: 'Bilal Rauf',
    dept: 'Engineering',
    status: { slug: 'permanent', name: 'Permanent' } as const,
  },
  {
    eid: 'EMP-0073',
    name: 'Hassan Tariq',
    dept: 'Engineering',
    status: { slug: 'probation', name: 'Probation' } as const,
  },
  {
    eid: 'EMP-0028',
    name: 'Asma Ali',
    dept: 'HR & People',
    status: { slug: 'permanent', name: 'Permanent' } as const,
  },
  {
    eid: 'EMP-0082',
    name: 'Zoya Pervez',
    dept: 'Operations',
    status: { slug: 'intern', name: 'Intern' } as const,
  },
];

export function TableSection() {
  return (
    <div id="primitive-table" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Table
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Inset-style table — the design's primary list pattern (employees list, projects list,
          payouts run). Header row sits on bg-fn-bg-subtle; cells get a 1px fn-divider between rows
          (none on the last row); rows tint to bg-fn-bg-subtle on hover.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>EID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TABLE_ROWS.map((r) => (
              <TableRow key={r.eid}>
                <TableCell className="text-fn-fg font-fn-semibold">{r.name}</TableCell>
                <TableCell className="text-fn-fg-muted font-mono">{r.eid}</TableCell>
                <TableCell className="text-fn-fg-muted">{r.dept}</TableCell>
                <TableCell>
                  <StatusPill status={r.status} dot />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Spec
        items={[
          ['table', 'w-full · text-fn-base (13)'],
          ['header bg', 'fn-bg-subtle · sticky-top z-1 with 1px fn-divider'],
          [
            'head cell',
            'h-fn-9 px-fn-3 text-fn-sm fn-fg-faint font-fn-semibold uppercase tracking-fn-uppercase-tight',
          ],
          [
            'row',
            'border-b fn-divider · hover bg-fn-bg-subtle · selected bg-fn-bg-inset · last:border-0',
          ],
          ['cell', 'px-fn-3 py-fn-2_5 align-middle'],
          ['caption', 'text-fn-base-lo fn-fg-muted · mt-fn-4'],
          [
            'employees-list inset pattern',
            'wraps Table in rounded-fn-xs panel with overflow-hidden',
          ],
        ]}
      />
    </div>
  );
}
