import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import type { RuntimePolicySnapshot, ActiveRuntimeSyncResult, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimeFreshnessValidator } from './policyActiveRuntimeFreshnessValidator.js';
export declare class PolicyActiveRuntimeSyncEngine {
    private readonly stateStore;
    private readonly freshnessValidator;
    private readonly isUserStopActiveFn?;
    private readonly activeSnapshots;
    constructor(options?: PolicyActiveRuntimeOptions, stateStore?: PolicyActivationStateStore, freshnessValidator?: PolicyActiveRuntimeFreshnessValidator);
    private assertUserStopInactive;
    /**
     * Synchronizes the active policy for a tenant partition from storage.
     * Idempotent: repeated synchronization of unchanged active policy returns the existing snapshot.
     */
    syncTenantActivePolicy(tenantPartition: string): ActiveRuntimeSyncResult;
    /**
     * Retrieves the currently synchronized snapshot for a tenant without re-syncing.
     */
    getCachedSnapshot(tenantPartition: string): RuntimePolicySnapshot | null;
    /**
     * Internal builder for immutable RuntimePolicySnapshot.
     */
    private createRuntimeSnapshot;
}
