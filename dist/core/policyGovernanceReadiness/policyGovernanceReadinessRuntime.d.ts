import { type ReadinessAssessmentReport, type PolicyGovernanceReadinessOptions } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessRuntime {
    private readonly repositoryInspector;
    private readonly integrationInspector;
    private readonly securityInspector;
    private readonly authorityInspector;
    private readonly tenantInspector;
    private readonly provenanceInspector;
    private readonly auditInspector;
    private readonly evidenceEngine;
    private readonly assessmentEngine;
    private readonly store;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly repositoryRoot?: string;
        readonly isUserStopActive?: () => boolean;
        readonly storeBaseDir?: string;
    });
    private assertUserStopInactive;
    /**
     * Executes the full, evidence-based readiness assessment for a tenant.
     * Strictly read-only, non-mutating, and non-authoritative.
     */
    executeAssessment(options: PolicyGovernanceReadinessOptions): ReadinessAssessmentReport;
    /**
     * Retrieves a previously generated assessment report.
     */
    getReport(tenantId: string, reportId: any): ReadinessAssessmentReport | undefined;
    /**
     * Lists all reports for a given tenant.
     */
    listReports(tenantId: string): readonly ReadinessAssessmentReport[];
}
