'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  contractTypeSchema,
  employeeCreateSchema,
  type EmployeeCreateInput,
  type EmployeePublic,
} from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateEmployee, useReferences, useUpdateEmployee } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';

const CONTRACT_OPTIONS = contractTypeSchema.options;
const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  /** Pre-populated values when editing. */
  employee?: EmployeePublic;
}

export function EmployeeForm({ mode, employee }: EmployeeFormProps) {
  const router = useRouter();
  const perms = usePermissions();
  const refs = useReferences();

  const canEditSalary = perms.has('employees:change_salary');

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(employee?.id ?? '');

  const defaultValues: EmployeeCreateInput =
    mode === 'edit' && employee
      ? toDefaults(employee)
      : {
          fullName: '',
          email: '',
          phone: null,
          dateOfBirth: null,
          gender: null,
          cnic: null,
          joinDate: new Date(),
          departmentId: '',
          designationId: '',
          statusId: '',
          contractType: 'FullTime',
          managerId: null,
          salaryPkr: null,
          salaryProcessedExternally: false,
          hasPayoneer: false,
          payoneerAccountId: null,
          internshipEndDate: null,
          probationEndDate: null,
          biannualReviewEnabled: false,
          annualReviewEnabled: true,
          emergencyContact: null,
        };

  const form = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const departmentId = form.watch('departmentId');
  const filteredDesignations = React.useMemo(() => {
    if (!refs.data) return [];
    return refs.data.designations.filter((d) => d.departmentId === departmentId);
  }, [refs.data, departmentId]);

  async function onSubmit(values: EmployeeCreateInput) {
    try {
      const result =
        mode === 'create'
          ? await createMutation.mutateAsync(values)
          : await updateMutation.mutateAsync(values);
      toast.success(mode === 'create' ? 'Employee created.' : 'Employee updated.');
      router.push(`/employees/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="gap-fn-6 flex flex-col">
        <Section title="Personal information">
          <GridTwo>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Full name
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Asma Ali" autoComplete="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="asma.ali@futurenostics.com"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="+92 300 1234567"
                      autoComplete="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={dateValue(field.value)}
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v === '' ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g.value || 'none'} value={g.value || 'none'}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNIC</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="12345-1234567-1"
                      className="tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </GridTwo>
        </Section>

        <Section title="Employment details">
          <GridTwo>
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Department
                    <RequiredMark />
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      // Reset designation when dept changes since options are filtered.
                      form.setValue('designationId', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {refs.data?.departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Designation
                    <RequiredMark />
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!departmentId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            departmentId ? 'Pick a designation' : 'Pick a department first'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredDesignations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="statusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Status
                    <RequiredMark />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {refs.data?.statuses
                        .filter((s) => s.slug !== 'terminated')
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contract type
                    <RequiredMark />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTRACT_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Join date
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={dateValue(field.value)}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probationEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Probation end</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={dateValue(field.value)}
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </GridTwo>
        </Section>

        {canEditSalary && mode === 'create' && (
          <Section title="Compensation">
            <GridTwo>
              <FormField
                control={form.control}
                name="salaryPkr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting salary (PKR)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[,\s]/g, '');
                          field.onChange(raw === '' ? null : Number(raw));
                        }}
                        placeholder="e.g. 150000"
                        className="tabular-nums"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasPayoneer"
                render={({ field }) => (
                  <FormItem className="gap-fn-2 pt-fn-7 flex items-center">
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <FormLabel className="!mt-0">Has Payoneer account</FormLabel>
                  </FormItem>
                )}
              />
            </GridTwo>
          </Section>
        )}

        <div className="border-fn-divider gap-fn-2 pt-fn-4 flex items-center justify-end border-t">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create employee'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border">
      <h2 className="text-fn-fg mb-fn-4 font-fn-semibold tracking-fn-tight text-[14px]">{title}</h2>
      {children}
    </div>
  );
}

function GridTwo({ children }: { children: React.ReactNode }) {
  return <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-2">{children}</div>;
}

function RequiredMark() {
  return <span className="text-fn-danger ml-fn-0_5">*</span>;
}

function dateValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toDefaults(employee: EmployeePublic): EmployeeCreateInput {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
    gender: employee.gender,
    cnic: null, // never round-trip the masked CNIC — leave blank to preserve existing
    joinDate: new Date(employee.joinDate),
    departmentId: employee.department.id,
    designationId: employee.designation.id,
    statusId: employee.status.id,
    contractType: employee.contractType,
    managerId: employee.manager?.id ?? null,
    salaryPkr: employee.salaryPkr ?? null,
    salaryProcessedExternally: employee.salaryProcessedExternally ?? false,
    hasPayoneer: employee.hasPayoneer,
    payoneerAccountId: employee.payoneerAccountId ?? null,
    internshipEndDate: employee.internshipEndDate ? new Date(employee.internshipEndDate) : null,
    probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate) : null,
    biannualReviewEnabled: false,
    annualReviewEnabled: true,
    emergencyContact: employee.emergencyContact ?? null,
  };
}
