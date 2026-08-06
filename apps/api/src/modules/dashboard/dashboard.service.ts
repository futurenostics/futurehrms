/**
 * Management dashboard service (Module 7).
 *
 * Assembles the §9 snapshot in one call: KPI cards, chart datasets, and
 * the recent-activity feed. All read-only aggregation over existing
 * tables — no new columns. Gated by the controller to
 * `dashboard:view_management` (Super Admin / Finance Manager).
 */
import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import type {
  DashboardActivityItem,
  DashboardActivityKind,
  DashboardBdRow,
  DashboardRevenueSlice,
  DashboardTopEarner,
  DashboardTrendPoint,
  ManagementDashboard,
} from '@futurenostics/types';
import { monthLabel } from '../commissions/commission-calc';

const ACTIVE_PROJECT_STATUSES = ['active', 'in_billing', 'on_hold'];
const BD_DEPARTMENT_SLUG = 'business-development';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function recentMonthKeys(monthsBack: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    keys.push(monthKeyOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys; // oldest → newest (chart left→right)
}

@Injectable()
export class DashboardService {
  async management(): Promise<ManagementDashboard> {
    const now = new Date();
    const thisMonthKey = monthKeyOf(now);
    const lastMonthKey = monthKeyOf(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
    );

    const categories = await prisma.projectCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, name: true, color: true },
    });
    const catById = new Map(categories.map((c) => [c.id, c]));

    const [
      activeProjectRows,
      activeEmployees,
      pendingApprovals,
      thisMonthRun,
      lastMonthRun,
      revenueRows,
      trend,
      bdPerformance,
      activity,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null, status: { in: ACTIVE_PROJECT_STATUSES } },
        _count: { _all: true },
      }),
      prisma.employee.count({
        where: { deletedAt: null, status: { slug: { not: 'terminated' } } },
      }),
      prisma.approval.count({ where: { status: 'pending' } }),
      prisma.commissionRun.findUnique({
        where: { monthKey: thisMonthKey },
        include: { lineItems: { select: { finalAmountUsd: true } } },
      }),
      prisma.commissionRun.findUnique({
        where: { monthKey: lastMonthKey },
        include: { lineItems: { select: { finalAmountUsd: true } } },
      }),
      prisma.project.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null },
        _sum: { revenueUsd: true },
      }),
      this.trend(),
      this.bdPerformance(),
      this.activity(),
    ]);

    const byCategory = activeProjectRows.map((r) => {
      const c = catById.get(r.categoryId);
      return {
        slug: c?.slug ?? r.categoryId,
        name: c?.name ?? 'Unknown',
        color: c?.color ?? 'violet',
        count: r._count._all,
      };
    });
    const activeProjectsTotal = byCategory.reduce((s, c) => s + c.count, 0);

    const thisMonthLiabilityUsd = round2(
      (thisMonthRun?.lineItems ?? []).reduce((s, li) => s + num(li.finalAmountUsd), 0),
    );
    const lastMonthDisbursedUsd =
      lastMonthRun && ['approved', 'locked'].includes(lastMonthRun.status)
        ? round2(lastMonthRun.lineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0))
        : 0;

    const revenueByCategory: DashboardRevenueSlice[] = revenueRows
      .map((r) => {
        const c = catById.get(r.categoryId);
        return {
          slug: c?.slug ?? r.categoryId,
          name: c?.name ?? 'Unknown',
          color: c?.color ?? 'violet',
          revenueUsd: round2(num(r._sum.revenueUsd)),
        };
      })
      .filter((s) => s.revenueUsd > 0)
      .sort((a, b) => b.revenueUsd - a.revenueUsd);

    const topEarners = await this.topEarners(thisMonthKey);

    return {
      kpis: {
        activeProjects: { total: activeProjectsTotal, byCategory },
        activeEmployees,
        thisMonthLiabilityUsd,
        pendingApprovals,
        lastMonthDisbursedUsd,
        thisMonthLabel: monthLabel(thisMonthKey),
        lastMonthLabel: monthLabel(lastMonthKey),
      },
      trend,
      revenueByCategory,
      topEarners,
      bdPerformance,
      activity,
    };
  }

  /** §9.2 — 12-month company commission trend. */
  private async trend(): Promise<DashboardTrendPoint[]> {
    const monthKeys = recentMonthKeys(12);
    const runs = await prisma.commissionRun.findMany({
      where: { monthKey: { in: monthKeys } },
      include: { lineItems: { select: { finalAmountUsd: true } } },
    });
    const byMonth = new Map(
      runs.map((r) => [r.monthKey, r.lineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0)]),
    );
    return monthKeys.map((monthKey) => ({
      monthKey,
      monthLabel: monthLabel(monthKey),
      totalUsd: round2(byMonth.get(monthKey) ?? 0),
    }));
  }

  /** §9.2 — top 5 earners for the given month. */
  private async topEarners(monthKey: string): Promise<DashboardTopEarner[]> {
    const run = await prisma.commissionRun.findUnique({
      where: { monthKey },
      select: { id: true },
    });
    if (!run) return [];
    const grouped = await prisma.commissionLineItem.groupBy({
      by: ['employeeId'],
      where: { runId: run.id },
      _sum: { finalAmountUsd: true },
      orderBy: { _sum: { finalAmountUsd: 'desc' } },
      take: 5,
    });
    const employees = grouped.length
      ? await prisma.employee.findMany({
          where: { id: { in: grouped.map((g) => g.employeeId) } },
          select: { id: true, fullName: true, eid: true },
        })
      : [];
    const byId = new Map(employees.map((e) => [e.id, e]));
    return grouped
      .map((g) => {
        const e = byId.get(g.employeeId);
        return {
          employeeId: g.employeeId,
          fullName: e?.fullName ?? 'Unknown',
          eid: e?.eid ?? '',
          totalUsd: round2(num(g._sum.finalAmountUsd)),
        };
      })
      .filter((r) => r.totalUsd > 0);
  }

  /** §9.2 — BD members: projects won vs commission paid. */
  private async bdPerformance(): Promise<DashboardBdRow[]> {
    const members = await prisma.employee.findMany({
      where: { department: { slug: BD_DEPARTMENT_SLUG }, deletedAt: null },
      include: {
        projectAssignments: { where: { removedAt: null }, select: { projectId: true } },
        commissionLineItems: { select: { finalAmountUsd: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    return members
      .map((m) => ({
        employeeId: m.id,
        fullName: m.fullName,
        projectsWon: new Set(m.projectAssignments.map((a) => a.projectId)).size,
        commissionPaidUsd: round2(
          m.commissionLineItems.reduce((s, li) => s + num(li.finalAmountUsd), 0),
        ),
      }))
      .filter((r) => r.projectsWon > 0 || r.commissionPaidUsd > 0);
  }

  /** §9.3 — recent activity across projects, commission runs, employees. */
  private async activity(): Promise<DashboardActivityItem[]> {
    const logs = await prisma.auditLog.findMany({
      where: { entity: { in: ['Project', 'CommissionRun', 'Employee'] } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const actorIds = [
      ...new Set(logs.map((l) => l.actorId).filter((x): x is string => Boolean(x))),
    ];
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          include: { employee: { select: { fullName: true } } },
        })
      : [];
    const actorLabel = new Map(actors.map((u) => [u.id, u.employee?.fullName ?? u.email]));

    const kindOf = (entity: string): DashboardActivityKind =>
      entity === 'Project' ? 'project' : entity === 'CommissionRun' ? 'commission' : 'employee';

    return logs.map((l) => ({
      id: l.id,
      kind: kindOf(l.entity),
      label: labelFor(l.entity, l.action),
      detail: l.entityId,
      actor: (l.actorId && actorLabel.get(l.actorId)) || null,
      at: l.createdAt.toISOString(),
    }));
  }
}

function labelFor(entity: string, action: string): string {
  const verb = action
    .replace(/_/g, ' ')
    .replace(/\brun\b/gi, 'run')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const noun =
    entity === 'CommissionRun' ? 'Commission' : entity === 'Project' ? 'Project' : 'Employee';
  // Named actions already read well (e.g. "Approve Run"); CRUD verbs get a noun.
  if (['Create', 'Update', 'Delete'].includes(verb)) return `${noun} ${verb.toLowerCase()}d`;
  return `${noun}: ${verb}`;
}
