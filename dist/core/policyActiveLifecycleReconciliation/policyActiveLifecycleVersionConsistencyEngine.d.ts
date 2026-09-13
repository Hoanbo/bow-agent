import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleDriftRecord, PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export interface VersionConsistencyCheckResult {
    readonly consistent: boolean;
    readonly activeVersion: string | null;
    readonly runtimeVersion: string | null;
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly blockingReasons: readonly string[];
}
export declare class PolicyActiveLifecycleVersionConsistencyEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions);
    private assertUserStopInactive;
    /**
     * Compares active policy state version with runtime snapshot version and safety constraints.
     */
    verifyVersionConsistency(activeState: ActivePolicyState | null, runtimeSnapshot: RuntimePolicySnapshot | null, rollbackTargetVersion?: string, recoveryTargetVersion?: string): VersionConsistencyCheckResult;
}
