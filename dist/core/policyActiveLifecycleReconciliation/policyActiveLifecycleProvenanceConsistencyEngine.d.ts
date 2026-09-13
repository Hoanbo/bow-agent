import type { PolicyStagedActivationProvenanceEngine } from '../policyStagedActivation/policyStagedActivationProvenanceEngine.js';
import type { PolicyActiveRuntimeProvenanceEngine } from '../policyActiveRuntime/policyActiveRuntimeProvenanceEngine.js';
import type { PolicyActiveRollbackProvenanceEngine } from '../policyActiveRollback/policyActiveRollbackProvenanceEngine.js';
import type { LifecycleDriftRecord, LifecycleBoundaryCheckResult, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export interface ProvenanceConsistencyCheckResult {
    readonly valid: boolean;
    readonly status: 'VALID' | 'TAMPER_DETECTED' | 'MISSING' | 'INVALID';
    readonly provenanceHeadHash: string;
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
    readonly blockingReasons: readonly string[];
}
export declare class PolicyActiveLifecycleProvenanceConsistencyEngine {
    private readonly stagedProvenance?;
    private readonly runtimeProvenance?;
    private readonly rollbackProvenance?;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, stagedProvenance?: PolicyStagedActivationProvenanceEngine, runtimeProvenance?: PolicyActiveRuntimeProvenanceEngine, rollbackProvenance?: PolicyActiveRollbackProvenanceEngine);
    private assertUserStopInactive;
    /**
     * Independently verifies the integrity of cryptographic provenance chains.
     */
    verifyProvenance(tenantPartition: string, candidateDraftId?: string): ProvenanceConsistencyCheckResult;
}
