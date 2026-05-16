import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../events/event-bus.service';

/**
 * Cross-cutting subscriber that turns domain events into TimelineEntry
 * rows on the affected employee. The Employees module is the first
 * producer; future modules (commissions, leave, evaluations, …) will
 * emit their own `<module>.*.<verb>` events and this same subscriber
 * (or a sibling) records them under the same employee's timeline.
 *
 * The timeline is module-scoped via `TimelineEntry.module`, so the FE
 * can filter or color-code by source.
 */
@Injectable()
export class TimelineSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(TimelineSubscriber.name);

  constructor(private readonly bus: EventBusService) {}

  onApplicationBootstrap(): void {
    this.bus.on('employee.created', (e) => this.handleCreated(e));
    this.bus.on('employee.status.changed', (e) => this.handleStatusChanged(e));
    this.bus.on('employee.salary.updated', (e) => this.handleSalaryUpdated(e));
    this.bus.on('employee.manager.changed', (e) => this.handleManagerChanged(e));
    this.bus.on('employee.document.uploaded', (e) => this.handleDocumentUploaded(e));
    this.bus.on('employee.deleted', (e) => this.handleDeleted(e));
  }

  private async handleCreated(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      employeeId: string;
      eid: string;
      fullName: string;
      departmentId: string;
      designationId: string;
      joinDate: string;
    };
    const [dept, design] = await Promise.all([
      prisma.department.findUnique({ where: { id: p.departmentId } }),
      prisma.designation.findUnique({ where: { id: p.designationId } }),
    ]);
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.created',
      title: `Joined as ${design?.name ?? 'an employee'}${dept ? ` in ${dept.name}` : ''}`,
      occurredAt: new Date(p.joinDate),
      details: { eid: p.eid, departmentName: dept?.name, designationName: design?.name },
      createdById: event.actorId,
    });
  }

  private async handleStatusChanged(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      employeeId: string;
      fromStatusName?: string;
      toStatusName?: string;
      fromStatusId: string;
      toStatusId: string;
      effectiveDate: string;
    };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.status.changed',
      title: `Status changed${p.fromStatusName ? ` from ${p.fromStatusName}` : ''} to ${p.toStatusName ?? 'a new status'}`,
      occurredAt: new Date(p.effectiveDate),
      details: p as unknown as Record<string, unknown>,
      createdById: event.actorId,
    });
  }

  private async handleSalaryUpdated(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      employeeId: string;
      oldSalaryPkr: number | null;
      newSalaryPkr: number;
      effectiveDate: string;
    };
    const oldFmt = p.oldSalaryPkr !== null ? formatPkr(p.oldSalaryPkr) : '—';
    const newFmt = formatPkr(p.newSalaryPkr);
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.salary.updated',
      title: `Salary updated from ${oldFmt} to ${newFmt}`,
      occurredAt: new Date(p.effectiveDate),
      details: p as unknown as Record<string, unknown>,
      createdById: event.actorId,
    });
  }

  private async handleManagerChanged(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      employeeId: string;
      oldManagerId: string | null;
      newManagerId: string | null;
    };
    const ids = [p.oldManagerId, p.newManagerId].filter((x): x is string => Boolean(x));
    const managers = ids.length
      ? await prisma.employee.findMany({
          where: { id: { in: ids } },
          select: { id: true, fullName: true },
        })
      : [];
    const byId = new Map(managers.map((m) => [m.id, m.fullName]));
    const fromName = p.oldManagerId
      ? (byId.get(p.oldManagerId) ?? 'previous manager')
      : 'no manager';
    const toName = p.newManagerId ? (byId.get(p.newManagerId) ?? 'a new manager') : 'no manager';
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.manager.changed',
      title: `Manager changed from ${fromName} to ${toName}`,
      occurredAt: new Date(),
      details: { fromName, toName, ...p } as Record<string, unknown>,
      createdById: event.actorId,
    });
  }

  private async handleDocumentUploaded(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as { employeeId: string; documentId: string; kind: string };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.document.uploaded',
      title: `Document uploaded: ${p.kind}`,
      occurredAt: new Date(),
      details: p as unknown as Record<string, unknown>,
      createdById: event.actorId,
    });
  }

  private async handleDeleted(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as { employeeId: string };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'employee.deleted',
      title: 'Employee record archived',
      occurredAt: new Date(),
      details: { archived: true } as Record<string, unknown>,
      createdById: event.actorId,
    });
  }

  private async write(input: {
    employeeId: string;
    eventType: string;
    title: string;
    occurredAt: Date;
    details: Record<string, unknown> | null;
    createdById: string | undefined;
  }): Promise<void> {
    try {
      await prisma.timelineEntry.create({
        data: {
          employeeId: input.employeeId,
          eventType: input.eventType,
          module: 'employees',
          title: input.title,
          details: (input.details ?? {}) as never,
          occurredAt: input.occurredAt,
          createdById: input.createdById ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write timeline entry for ${input.employeeId} (${input.eventType}): ${(err as Error).message}`,
      );
    }
  }
}

function formatPkr(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}
