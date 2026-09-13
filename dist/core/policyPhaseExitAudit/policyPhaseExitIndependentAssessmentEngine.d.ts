import { type AuditCriterionDefinition, type AuditEvidenceItem, type IndependentAuditReport } from './policyPhaseExitAuditTypes.js';
export declare const CANONICAL_AUDIT_CRITERIA: readonly AuditCriterionDefinition[];
export declare class PolicyPhaseExitIndependentAssessmentEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Evaluates all 24 canonical criteria and produces an immutable IndependentAuditReport.
     */
    conductAssessment(params: {
        readonly tenantPartition: string;
        readonly evidenceItems: readonly AuditEvidenceItem[];
    }): IndependentAuditReport;
}
