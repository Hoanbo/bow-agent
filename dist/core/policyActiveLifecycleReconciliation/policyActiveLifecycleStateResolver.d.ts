import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';
export interface ResolvedActivePolicyStateResult {
    readonly exists: boolean;
    readonly valid: boolean;
    readonly activePolicyState: ActivePolicyState | null;
    readonly failureReasons: readonly string[];
}
export declare class PolicyActiveLifecycleStateResolver {
    private readonly baseDir;
    private readonly stateStore;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveLifecycleReconciliationOptions, stateStore?: PolicyActivationStateStore);
    private assertUserStopInactive;
    /**
     * Resolves and structurally checks the active policy state for a tenant.
     */
    resolveActiveState(tenantPartition: string): ResolvedActivePolicyStateResult;
}
