// src/core/policyPhaseExitAudit/policyPhaseExitAuditReportStore.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Tenant-Partitioned Audit Report Store (Component 896).
// Crash-safe, atomic file replacement, secret-sanitized durable persistence for IndependentAuditReport.
//
// Core Authority Invariants:
// - TENANT_ISOLATION_ENFORCED
// - SECRET_SANITIZATION_MANDATORY
// - CRASH_SAFE_ATOMIC_REPLACEMENT
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { IndependentAuditReport, AuditReportId } from './policyPhaseExitAuditTypes.js';

export class PolicyPhaseExitAuditReportStore {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly baseDir?: string; readonly isUserStopActive?: () => boolean }) {
    this.baseDir = options?.baseDir ?? path.resolve('data/partitions_phase_exit_audit');
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit report store suspended by USER_STOP supremacy');
    }
  }

  private resolveTenantDir(tenantId: string): string {
    const partition = resolveUserPartition(tenantId, this.baseDir);
    const tenantDir = path.join(partition.baseDir, partition.partitionKey, 'audit_reports');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
  }

  /**
   * Saves an IndependentAuditReport durably with atomic replacement and secret sanitization.
   */
  public saveReport(report: IndependentAuditReport): void {
    this.assertUserStopInactive();

    const tenantDir = this.resolveTenantDir(report.tenantPartition);
    const filePath = path.join(tenantDir, `${report.reportId}.json`);
    const tmpPath = path.join(tenantDir, `${report.reportId}.tmp.${Date.now()}`);

    const sanitized = globalDiagnosisSanitizer.sanitize(report);
    const serialized = JSON.stringify(sanitized, null, 2);

    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Retrieves an IndependentAuditReport by reportId.
   */
  public getReport(tenantId: string, reportId: AuditReportId): IndependentAuditReport | null {
    this.assertUserStopInactive();

    const tenantDir = this.resolveTenantDir(tenantId);
    const filePath = path.join(tenantDir, `${reportId}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as IndependentAuditReport;
    } catch {
      return null;
    }
  }

  /**
   * Lists all reports for a tenant.
   */
  public listReports(tenantId: string): readonly IndependentAuditReport[] {
    this.assertUserStopInactive();

    const tenantDir = this.resolveTenantDir(tenantId);
    const files = fs.readdirSync(tenantDir).filter(f => f.endsWith('.json') && !f.includes('.tmp.'));

    const reports: IndependentAuditReport[] = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(tenantDir, f), 'utf-8');
        reports.push(JSON.parse(content));
      } catch {
        // Skip corrupted files
      }
    }

    return Object.freeze(reports);
  }
}
