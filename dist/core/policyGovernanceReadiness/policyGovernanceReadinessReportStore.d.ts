import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { ReadinessAssessmentReport, ReadinessReportId } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessReportStore {
    private readonly baseDir;
    private readonly sanitizer;
    private readonly reports;
    constructor(baseDir?: string, sanitizer?: DiagnosisSanitizer);
    /**
     * Resolves partitioned directory path for the tenant.
     */
    private getPartitionDir;
    /**
     * Saves a readiness assessment report.
     */
    saveReport(report: ReadinessAssessmentReport): void;
    /**
     * Retrieves a report by ID for a tenant.
     */
    getReport(tenantId: string, reportId: ReadinessReportId): ReadinessAssessmentReport | undefined;
    /**
     * Lists all reports for a tenant.
     */
    listReports(tenantId: string): readonly ReadinessAssessmentReport[];
}
