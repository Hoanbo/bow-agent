import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { Phase14ExitCriterionId } from './phase14ExitCertificateTypes.js';
export interface Phase14BoundaryGateOptions {
    readonly authority?: MasterHumanAuthority;
}
export declare class Phase14ExitBoundaryGate {
    private readonly _authority?;
    constructor(options?: Phase14BoundaryGateOptions);
    private isUserStopActive;
    private getUserStopReason;
    private emitAbortedAudit;
    /**
     * Validate general string identifier against prototype pollution, path traversal and null bytes
     */
    validateIdentifier(id: string, paramName: string): void;
    /**
     * Checkpoint 1: Audit Initialization Gate
     */
    assertCheckpoint1_AuditInit(tenantId: string): void;
    /**
     * Checkpoint 2: Evidence Collection Gate
     */
    assertCheckpoint2_EvidenceCollection(tenantId: string): void;
    /**
     * Checkpoint 3: Evidence Reconciliation Gate
     */
    assertCheckpoint3_EvidenceReconciliation(tenantId: string): void;
    /**
     * Checkpoint 4: Exit Criterion Evaluation Gate
     */
    assertCheckpoint4_CriteriaEvaluation(criterionId: Phase14ExitCriterionId, tenantId: string): void;
    /**
     * Checkpoint 5: Certificate Construction Gate
     */
    assertCheckpoint5_CertificateConstruction(auditId: string, tenantId: string): void;
    /**
     * Checkpoint 6: Certificate Sealing Gate
     */
    assertCheckpoint6_CertificateSealing(auditId: string, tenantId: string): void;
    /**
     * Checkpoint 7: Certificate Export Gate
     */
    assertCheckpoint7_CertificateExport(auditId: string, tenantId: string): void;
}
