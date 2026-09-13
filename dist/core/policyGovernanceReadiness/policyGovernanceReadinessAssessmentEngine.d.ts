import { type AssessmentId, type CriterionEvaluationResult, type ReadinessAssessmentReport, type RepositoryInspectionFinding, type SecurityInspectionFinding, type AuthorityInspectionFinding, type TenantInspectionFinding, type ProvenanceInspectionFinding, type AuditInspectionFinding, type IntegrationPathFinding } from './policyGovernanceReadinessTypes.js';
export interface AssessmentEngineParams {
    readonly assessmentId: AssessmentId;
    readonly tenantId: string;
    readonly repositoryFindings: RepositoryInspectionFinding;
    readonly integrationFindings: readonly IntegrationPathFinding[];
    readonly securityFindings: SecurityInspectionFinding;
    readonly authorityFindings: AuthorityInspectionFinding;
    readonly tenantFindings: TenantInspectionFinding;
    readonly provenanceFindings: ProvenanceInspectionFinding;
    readonly auditFindings: AuditInspectionFinding;
    readonly criteriaResults: readonly CriterionEvaluationResult[];
}
export declare class PolicyGovernanceReadinessAssessmentEngine {
    /**
     * Generates a frozen ReadinessAssessmentReport.
     */
    generateReport(params: AssessmentEngineParams): ReadinessAssessmentReport;
}
