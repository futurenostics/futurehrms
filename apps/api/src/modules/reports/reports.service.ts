/**
 * Reports service (Module 5).
 *
 * Two jobs:
 *   - `catalog(viewer)` — the §7.1 report list, filtered to the ones the
 *     caller has permission to run.
 *   - `generate(viewer, key, filters, format)` — validate + dispatch to
 *     the report's builder, render to the requested format, and return
 *     the buffer + filename + content-type for the controller to stream.
 *
 * Every generation is audit-logged (the export itself is a
 * sensitive read — same pattern as commission CSV export).
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ReportCatalog, ReportFilters, ReportFormat } from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import {
  contentTypeFor,
  extensionFor,
  renderReport,
  type ReportData,
} from '../../core/reports/report-formats';
import {
  findReportDefinition,
  missingRequiredFilters,
  REPORT_DEFINITIONS,
  toCatalogItem,
  type ReportDefinition,
} from './report-definitions';

export interface GeneratedReport {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

@Injectable()
export class ReportsService {
  constructor(private readonly audit: AuditService) {}

  private can(viewer: AuthenticatedUser, permission: string): boolean {
    return viewer.permissions.includes(permission);
  }

  catalog(viewer: AuthenticatedUser): ReportCatalog {
    const items = REPORT_DEFINITIONS.filter((d) => this.can(viewer, d.requiredPermission)).map(
      toCatalogItem,
    );
    return { items };
  }

  /** Build the ReportData without rendering — used by the scheduler. */
  async buildData(
    def: ReportDefinition,
    filters: ReportFilters,
    includeSalary: boolean,
  ): Promise<ReportData> {
    return def.build(filters, { includeSalary, now: new Date() });
  }

  async generate(
    viewer: AuthenticatedUser,
    key: string,
    filters: ReportFilters,
    format: ReportFormat,
  ): Promise<GeneratedReport> {
    const def = findReportDefinition(key);
    if (!def) throw new NotFoundException(`Unknown report '${key}'`);
    if (!this.can(viewer, def.requiredPermission)) {
      throw new ForbiddenException(`${def.requiredPermission} required`);
    }
    if (!def.formats.includes(format)) {
      throw new BadRequestException(
        `Report '${key}' does not support '${format}'. Available: ${def.formats.join(', ')}`,
      );
    }
    const missing = missingRequiredFilters(def, filters);
    if (missing.length) {
      throw new BadRequestException(`Missing required filter(s): ${missing.join(', ')}`);
    }

    const includeSalary = this.can(viewer, 'employees:view_salary');
    const data = await this.buildData(def, filters, includeSalary);
    const buffer = await renderReport(data, format);
    const filename = `${def.filename(filters)}.${extensionFor(format)}`;

    await this.audit.record({
      module: 'reports',
      entity: 'Report',
      entityId: key,
      action: 'report.generated',
      actorId: viewer.id,
      after: { format, filters, rowCount: data.rows.length },
    });

    return { filename, contentType: contentTypeFor(format), buffer };
  }
}
