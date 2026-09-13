import { type CriterionEvaluationResult, type CriterionStatus, type RepositoryInspectionFinding, type SecurityInspectionFinding, type AuthorityInspectionFinding, type TenantInspectionFinding, type ProvenanceInspectionFinding, type AuditInspectionFinding, type IntegrationPathFinding } from './policyGovernanceReadinessTypes.js';
export interface EvidenceEngineContext {
    readonly repositoryFindings: RepositoryInspectionFinding;
    readonly integrationFindings: readonly IntegrationPathFinding[];
    readonly securityFindings: SecurityInspectionFinding;
    readonly authorityFindings: AuthorityInspectionFinding;
    readonly tenantFindings: TenantInspectionFinding;
    readonly provenanceFindings: ProvenanceInspectionFinding;
    readonly auditFindings: AuditInspectionFinding;
    readonly overrides?: Readonly<Record<string, CriterionStatus>>;
}
export declare class PolicyGovernanceReadinessEvidenceEngine {
    /**
     * Compiles and evaluates concrete evidence for all 24 canonical criteria.
     */
    evaluateAll(context: EvidenceEngineContext): readonly CriterionEvaluationResult[];
    private evaluateCriterion;
}
