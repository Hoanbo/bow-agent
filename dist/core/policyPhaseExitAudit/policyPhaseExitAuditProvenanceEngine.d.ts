import { type AuditProvenanceRecord, type PhaseExitAuditId, type AuditCriterionId, type AuditEvidenceId, type AuditReadinessStatus } from './policyPhaseExitAuditTypes.js';
export declare const AUDIT_PROVENANCE_GENESIS_ANCHOR = "GENESIS_PHASE_1_3_EXIT_AUDIT";
export interface AuditProvenanceVerificationResult {
    readonly valid: boolean;
    readonly recordCount: number;
    readonly error?: string;
}
export declare class PolicyPhaseExitAuditProvenanceEngine {
    private readonly chains;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    private calculateRecordHash;
    /**
     * Appends an audit provenance record to the tenant's chain.
     */
    recordAuditEvent(params: {
        readonly tenantPartition: string;
        readonly auditId: PhaseExitAuditId;
        readonly criterionId?: AuditCriterionId;
        readonly evidenceId?: AuditEvidenceId;
        readonly assessmentStatus: AuditReadinessStatus;
        readonly payload: Record<string, any>;
    }): AuditProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of a tenant's audit provenance chain.
     */
    verifyChain(tenantPartition: string): AuditProvenanceVerificationResult;
}
