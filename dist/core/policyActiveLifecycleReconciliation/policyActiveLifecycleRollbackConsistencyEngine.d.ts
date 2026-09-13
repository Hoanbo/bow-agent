import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { PolicyActiveRollbackStore } from '../policyActiveRollback/policyActiveRollbackStore.js';
import type { LifecycleDriftRecord, LifecycleBoundaryCheckResult, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export interface RollbackConsistencyCheckResult {
    readonly consistent: boolean;
    readonly rollbackStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly sunsetStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly recoveryStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly boundaryChecks: readonly LifecycleBoundaryCheckResult[];
    readonly blockingReasons: readonly string[];
}
export declare class PolicyActiveLifecycleRollbackConsistencyEngine {
    private readonly rollbackStore?;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, rollbackStore?: PolicyActiveRollbackStore);
    private assertUserStopInactive;
    /**
     * Reconciles rollback, sunset, and recovery records against current active policy.
     */
    verifyRollbackConsistency(tenantPartition: string, activeState: ActivePolicyState | null): RollbackConsistencyCheckResult;
}
