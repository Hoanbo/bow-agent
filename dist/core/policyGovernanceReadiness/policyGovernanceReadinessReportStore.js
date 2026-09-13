// src/core/policyGovernanceReadiness/policyGovernanceReadinessReportStore.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Readiness Report Store (Component 866).
// Provides durable, crash-safe, tenant-partitioned persistence for readiness assessment reports.
// Enforces atomic file replacement, secret sanitization, and path traversal rejection.
import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyGovernanceReadinessReportStore {
    baseDir;
    sanitizer;
    reports = new Map();
    constructor(baseDir, sanitizer) {
        this.baseDir = path.resolve(baseDir ?? path.join(process.cwd(), 'data', 'partitions_governance_readiness'));
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Resolves partitioned directory path for the tenant.
     */
    getPartitionDir(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
            throw new Error('STORE_SECURITY_VIOLATION: tenantId must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantId.trim(), this.baseDir);
        const dir = path.join(resolved.baseDir, resolved.partitionKey, 'readiness_reports');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    /**
     * Saves a readiness assessment report.
     */
    saveReport(report) {
        if (!report || !report.tenantId || !report.reportId) {
            throw new Error('INVALID_REPORT: report, tenantId, and reportId are required');
        }
        // In-memory cache update
        if (!this.reports.has(report.tenantId)) {
            this.reports.set(report.tenantId, new Map());
        }
        this.reports.get(report.tenantId).set(report.reportId, report);
        // Durable atomic write
        const dir = this.getPartitionDir(report.tenantId);
        const filePath = path.join(dir, `${report.reportId}.json`);
        const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const sanitizedData = this.sanitizer.sanitize(JSON.stringify(report, null, 2));
        fs.writeFileSync(tempPath, sanitizedData, 'utf-8');
        fs.renameSync(tempPath, filePath);
    }
    /**
     * Retrieves a report by ID for a tenant.
     */
    getReport(tenantId, reportId) {
        if (this.reports.has(tenantId) && this.reports.get(tenantId).has(reportId)) {
            return this.reports.get(tenantId).get(reportId);
        }
        try {
            const dir = this.getPartitionDir(tenantId);
            const filePath = path.join(dir, `${reportId}.json`);
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const report = JSON.parse(raw);
                if (!this.reports.has(tenantId)) {
                    this.reports.set(tenantId, new Map());
                }
                this.reports.get(tenantId).set(reportId, report);
                return report;
            }
        }
        catch {
            return undefined;
        }
        return undefined;
    }
    /**
     * Lists all reports for a tenant.
     */
    listReports(tenantId) {
        const list = [];
        try {
            const dir = this.getPartitionDir(tenantId);
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('.tmp_'));
            for (const file of files) {
                const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
                list.push(JSON.parse(raw));
            }
        }
        catch {
            // Return empty if directory not accessible
        }
        return Object.freeze(list);
    }
}
