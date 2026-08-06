/**
 * Management Dashboard (Module 7) — shared schemas.
 *
 * One read endpoint (`GET /dashboard/management`) returns the whole
 * snapshot: KPI cards (§9.1), chart datasets (§9.2), and the recent
 * activity feed (§9.3). Gated to Super Admin / Finance Manager via
 * `dashboard:view_management`.
 */
import { z } from 'zod';

/* ---------- §9.1 KPI cards ---------- */

export const dashboardCategoryCountSchema = z.object({
  slug: z.string(),
  name: z.string(),
  color: z.string(),
  count: z.number().int().nonnegative(),
});
export type DashboardCategoryCount = z.infer<typeof dashboardCategoryCountSchema>;

export const dashboardKpisSchema = z.object({
  activeProjects: z.object({
    total: z.number().int().nonnegative(),
    byCategory: z.array(dashboardCategoryCountSchema),
  }),
  activeEmployees: z.number().int().nonnegative(),
  thisMonthLiabilityUsd: z.number(),
  pendingApprovals: z.number().int().nonnegative(),
  lastMonthDisbursedUsd: z.number(),
  /** Labels for the two month-scoped cards. */
  thisMonthLabel: z.string(),
  lastMonthLabel: z.string(),
});
export type DashboardKpis = z.infer<typeof dashboardKpisSchema>;

/* ---------- §9.2 Charts ---------- */

export const dashboardTrendPointSchema = z.object({
  monthKey: z.string(),
  monthLabel: z.string(),
  totalUsd: z.number(),
});
export type DashboardTrendPoint = z.infer<typeof dashboardTrendPointSchema>;

export const dashboardRevenueSliceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  color: z.string(),
  revenueUsd: z.number(),
});
export type DashboardRevenueSlice = z.infer<typeof dashboardRevenueSliceSchema>;

export const dashboardTopEarnerSchema = z.object({
  employeeId: z.string(),
  fullName: z.string(),
  eid: z.string(),
  totalUsd: z.number(),
});
export type DashboardTopEarner = z.infer<typeof dashboardTopEarnerSchema>;

export const dashboardBdRowSchema = z.object({
  employeeId: z.string(),
  fullName: z.string(),
  projectsWon: z.number().int().nonnegative(),
  commissionPaidUsd: z.number(),
});
export type DashboardBdRow = z.infer<typeof dashboardBdRowSchema>;

/* ---------- §9.3 Recent activity ---------- */

export const dashboardActivityKindSchema = z.enum(['project', 'commission', 'employee']);
export type DashboardActivityKind = z.infer<typeof dashboardActivityKindSchema>;

export const dashboardActivityItemSchema = z.object({
  id: z.string(),
  kind: dashboardActivityKindSchema,
  /** Human label, e.g. "Project created" / "Commission run approved". */
  label: z.string(),
  /** Optional detail line (entity id / actor). */
  detail: z.string().nullable(),
  actor: z.string().nullable(),
  at: z.string(),
});
export type DashboardActivityItem = z.infer<typeof dashboardActivityItemSchema>;

/* ---------- Envelope ---------- */

export const managementDashboardSchema = z.object({
  kpis: dashboardKpisSchema,
  trend: z.array(dashboardTrendPointSchema),
  revenueByCategory: z.array(dashboardRevenueSliceSchema),
  topEarners: z.array(dashboardTopEarnerSchema),
  bdPerformance: z.array(dashboardBdRowSchema),
  activity: z.array(dashboardActivityItemSchema),
});
export type ManagementDashboard = z.infer<typeof managementDashboardSchema>;
