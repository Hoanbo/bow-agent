import type { IndependentAuditReport, AuditReportId } from './policyPhaseExitAuditTypes.js';
export declare class PolicyPhaseExitAuditReportStore {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly baseDir?: string;
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    private resolveTenantDir;
    /**
     * Saves an IndependentAuditReport durably with atomic replacement and secret sanitization.
     */
    saveReport(report: IndependentAuditReport): void;
    /**
     * Retrieves an IndependentAuditReport by reportId.
     */
    getReport(tenantId: string, reportId: AuditReportId): IndependentAuditReport | null;
    /**
     * Lists all reports for a tenant.
     */
    listReports(tenantId: string): readonly IndependentAuditReport[];
}
