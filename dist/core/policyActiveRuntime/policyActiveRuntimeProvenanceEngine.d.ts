import type { ActiveRuntimeProvenanceRecord, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
export declare const GENESIS_RUNTIME_PROVENANCE_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class PolicyActiveRuntimeProvenanceEngine {
    private readonly isUserStopActiveFn?;
    private readonly tenantChains;
    constructor(options?: PolicyActiveRuntimeOptions);
    private assertUserStopInactive;
    /**
     * Appends an active runtime event to the cryptographic provenance chain.
     */
    appendRecord(params: {
        tenantPartition: string;
        activePolicyStateId: any;
        snapshotId?: any;
        enforcementId?: any;
        eventType: string;
        payload: Record<string, any>;
    }): ActiveRuntimeProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of the tenant's provenance chain.
     */
    verifyChainIntegrity(tenantPartition: string): boolean;
    getHeadHash(tenantPartition: string): string;
    getChain(tenantPartition: string): readonly ActiveRuntimeProvenanceRecord[];
}
