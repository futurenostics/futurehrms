/**
 * Reminder tasks — read + lifecycle (complete / cancel).
 *
 * The scheduler opens tasks and drives follow-ups; this service backs
 * the HR "pending tasks" queue and the acknowledgment step. Completing
 * a task stops the follow-up loop and logs an acknowledgment (audit +
 * `reminder.task.completed`).
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import type {
  ReminderTaskCompleteInput,
  ReminderTaskCancelInput,
  ReminderTaskListQuery,
  ReminderTaskListResponse,
  ReminderTaskPublic,
  ReminderTaskStatus,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';

type TaskRow = Prisma.ReminderTaskGetPayload<{ include: { rule: true } }>;

@Injectable()
export class ReminderTasksService {
  constructor(
    private readonly audit: AuditService,
    private readonly events: EventBusService,
  ) {}

  private can(viewer: AuthenticatedUser, perm: string): boolean {
    return viewer.permissions.includes(perm);
  }

  async list(
    viewer: AuthenticatedUser,
    query: ReminderTaskListQuery,
  ): Promise<ReminderTaskListResponse> {
    // Anyone may see their own tasks; the full queue needs view_tasks.
    const scopeToSelf = query.mine || !this.can(viewer, 'reminders:view_tasks');

    const where: Prisma.ReminderTaskWhereInput = {};
    if (scopeToSelf) where.assigneeUserId = viewer.id;
    if (query.status) where.status = query.status;
    if (query.overdue) {
      where.status = 'open';
      where.dueDate = { lt: new Date() };
    }

    const [rows, total, openCount, overdueCount] = await Promise.all([
      prisma.reminderTask.findMany({
        where,
        include: { rule: true },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: query.offset,
        take: query.limit,
      }),
      prisma.reminderTask.count({ where }),
      prisma.reminderTask.count({
        where: scopeToSelf ? { assigneeUserId: viewer.id, status: 'open' } : { status: 'open' },
      }),
      prisma.reminderTask.count({
        where: {
          ...(scopeToSelf ? { assigneeUserId: viewer.id } : {}),
          status: 'open',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const items = await this.toPublicMany(rows);
    return {
      items,
      total,
      hasMore: query.offset + rows.length < total,
      openCount,
      overdueCount,
    };
  }

  async complete(
    viewer: AuthenticatedUser,
    id: string,
    input: ReminderTaskCompleteInput,
  ): Promise<ReminderTaskPublic> {
    const task = await prisma.reminderTask.findUnique({ where: { id }, include: { rule: true } });
    if (!task) throw new NotFoundException('Reminder task not found');
    // The assignee can always complete their own; otherwise complete_tasks.
    if (task.assigneeUserId !== viewer.id && !this.can(viewer, 'reminders:complete_tasks')) {
      throw new ForbiddenException('reminders:complete_tasks required');
    }
    if (task.status !== 'open') {
      throw new BadRequestException(`Task is already ${task.status}`);
    }

    const updated = await prisma.reminderTask.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedById: viewer.id,
        completionNote: input.note ?? null,
        overdue: false,
      },
      include: { rule: true },
    });

    await this.audit.record({
      module: 'reminders',
      entity: 'ReminderTask',
      entityId: id,
      action: 'reminder.task.completed',
      actorId: viewer.id,
      after: { note: input.note ?? null, followUpCount: task.followUpCount },
    });
    this.events.emit(
      'reminder.task.completed',
      {
        taskId: id,
        ruleId: task.ruleId,
        assigneeUserId: task.assigneeUserId,
        sourceType: task.sourceType,
        sourceId: task.sourceId,
      },
      { actorId: viewer.id },
    );

    return (await this.toPublicMany([updated]))[0]!;
  }

  async cancel(
    viewer: AuthenticatedUser,
    id: string,
    input: ReminderTaskCancelInput,
  ): Promise<ReminderTaskPublic> {
    if (!this.can(viewer, 'reminders:complete_tasks')) {
      throw new ForbiddenException('reminders:complete_tasks required');
    }
    const task = await prisma.reminderTask.findUnique({ where: { id }, include: { rule: true } });
    if (!task) throw new NotFoundException('Reminder task not found');
    if (task.status !== 'open') {
      throw new BadRequestException(`Task is already ${task.status}`);
    }

    const updated = await prisma.reminderTask.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledById: viewer.id,
        cancelReason: input.reason,
        overdue: false,
      },
      include: { rule: true },
    });

    await this.audit.record({
      module: 'reminders',
      entity: 'ReminderTask',
      entityId: id,
      action: 'reminder.task.cancelled',
      actorId: viewer.id,
      after: { reason: input.reason },
    });
    this.events.emit(
      'reminder.task.cancelled',
      { taskId: id, ruleId: task.ruleId },
      { actorId: viewer.id },
    );

    return (await this.toPublicMany([updated]))[0]!;
  }

  /* ---------- Mapping ---------- */

  private async toPublicMany(rows: TaskRow[]): Promise<ReminderTaskPublic[]> {
    const now = Date.now();

    // Resolve assignee + completedBy user names in one hit.
    const userIds = new Set<string>();
    for (const r of rows) {
      userIds.add(r.assigneeUserId);
      if (r.completedById) userIds.add(r.completedById);
    }
    const users = userIds.size
      ? await prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, email: true, employee: { select: { fullName: true } } },
        })
      : [];
    const userName = new Map(users.map((u) => [u.id, u.employee?.fullName ?? u.email]));

    // Resolve employee subject names.
    const employeeIds = rows
      .filter((r) => r.sourceType === 'employee' && r.sourceId)
      .map((r) => r.sourceId as string);
    const employees = employeeIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const empName = new Map(employees.map((e) => [e.id, e.fullName]));

    return rows.map((r) => ({
      id: r.id,
      ruleId: r.ruleId,
      ruleName: r.rule?.name ?? null,
      notificationType: r.notificationType,
      assigneeUserId: r.assigneeUserId,
      assigneeName: userName.get(r.assigneeUserId) ?? null,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      subjectLabel: r.sourceId ? (empName.get(r.sourceId) ?? null) : null,
      title: r.title,
      description: r.description,
      dueDate: r.dueDate.toISOString(),
      followUpEveryDays: r.followUpEveryDays,
      status: r.status as ReminderTaskStatus,
      overdue: r.status === 'open' && r.dueDate.getTime() < now,
      followUpCount: r.followUpCount,
      lastFollowUpAt: r.lastFollowUpAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      completedByName: r.completedById ? (userName.get(r.completedById) ?? null) : null,
      completionNote: r.completionNote,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
