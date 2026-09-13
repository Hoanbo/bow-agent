import type { RollbackProvenanceRecord, ActiveRollbackRequestId, SunsetRequestId, RecoveryRequestId, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare const ROLLBACK_PROVENANCE_GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class PolicyActiveRollbackProvenanceEngine {
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyActiveRollbackOptions);
    private assertUserStopInactive;
    private computePayloadHash;
    private computeRecordHash;
    /**
     * Appends a new cryptographic provenance record to the tenant's chain.
     */
    appendRecord(params: {
        readonly tenantPartition: string;
        readonly eventType: string;
        readonly payload: Record<string, any>;
        readonly activePolicyStateId?: string;
        readonly targetPolicyVersion?: string;
        readonly rollbackRequestId?: ActiveRollbackRequestId;
        readonly sunsetRequestId?: SunsetRequestId;
        readonly recoveryRequestId?: RecoveryRequestId;
        readonly authorizationDecisionId?: string;
        readonly commitId?: string;
    }): RollbackProvenanceRecord;
    /**
     * Retrieves the full provenance record chain for a tenant.
     */
    getChain(tenantPartition: string): readonly RollbackProvenanceRecord[];
    /**
     * Returns the current head record hash for a tenant.
     */
    getHeadHash(tenantPartition: string): string;
    /**
     * Verifies the cryptographic integrity of a tenant's provenance chain.
     * Throws PROVENANCE_TAMPER_DETECTED if any link is broken.
     */
    verifyChainIntegrity(tenantPartition: string): boolean;
}
